import torch
import torch.nn as nn
import timm
import numpy as np
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
import argparse
import os
import sys
from PIL import Image
from torchvision import transforms

CLASSES = ['acne', 'eczema', 'gale', 'keratose', 'leishmaniose',
           'melanome', 'mycose', 'psoriasis', 'rosacee', 'urticaire']

SEX_MAP    = {'male': 0.0, 'female': 1.0, 'unknown': 0.5}
SITE_MAP   = {'visage':0,'cou':1,'tronc':2,'dos':3,'bras':4,'jambe':5,'pied':6,'unknown':7}
WILAYA_MAP = {'nord':0,'sud':1,'est':2,'ouest':3}
SAISON_MAP = {'printemps':0,'ete':1,'automne':2,'hiver':3}
META_DIM   = 18

def encode_metadata(age, sex, site, wilaya, saison):
    age_n  = float(age) / 100.0
    sex_v  = SEX_MAP.get(str(sex).lower(), 0.5)
    site_v = [0.0] * 8
    site_v[SITE_MAP.get(str(site).lower(), 7)] = 1.0
    wil_v  = [0.0] * 4
    wil_v[WILAYA_MAP.get(str(wilaya).lower(), 0)] = 1.0
    sai_v  = [0.0] * 4
    sai_v[SAISON_MAP.get(str(saison).lower(), 1)] = 1.0
    meta   = [age_n, sex_v] + site_v + wil_v + sai_v
    return torch.tensor(meta, dtype=torch.float32)

class DermAssistFinal(nn.Module):
    def __init__(self, n_classes=10, meta_dim=18):
        super().__init__()
        self.cnn = timm.create_model('efficientnet_b0', pretrained=False, num_classes=0)
        self.mlp = nn.Sequential(
            nn.Linear(meta_dim, 64),
            nn.BatchNorm1d(64), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(64, 64),
            nn.BatchNorm1d(64), nn.ReLU(), nn.Dropout(0.2),
        )
        self.fusion = nn.Sequential(
            nn.Linear(1280 + 64, 512),
            nn.BatchNorm1d(512), nn.ReLU(), nn.Dropout(0.4),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, n_classes),
        )

    def forward(self, image, metadata):
        return self.fusion(
            torch.cat([self.cnn(image), self.mlp(metadata)], dim=1))

class GradCAMWrapper(nn.Module):
    def __init__(self, model, fixed_metadata):
        super().__init__()
        self.model    = model
        self.metadata = fixed_metadata

    def forward(self, image):
        meta = self.metadata.expand(image.size(0), -1)
        return self.model(image, meta)

transform_val = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                          std=[0.229, 0.224, 0.225]),
])

def load_model(model_path, device):
    if not os.path.exists(model_path):
        print("ERROR: model not found at " + model_path)
        sys.exit(1)
    print("Loading model: " + model_path)
    model = DermAssistFinal(n_classes=len(CLASSES), meta_dim=META_DIM).to(device)
    state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()
    print("Model loaded OK")
    return model

def predict(image_path, model, device, age, sex, site, wilaya, saison):
    if not os.path.exists(image_path):
        print("ERROR: image not found at " + image_path)
        sys.exit(1)

    img_pil = Image.open(image_path).convert('RGB')
    img_np  = np.array(img_pil.resize((224, 224))) / 255.0
    img_t   = transform_val(img_pil).unsqueeze(0).to(device)
    meta_t  = encode_metadata(age, sex, site, wilaya, saison).unsqueeze(0).to(device)

    model.eval()
    with torch.no_grad():
        outputs = model(img_t, meta_t)
        probs   = torch.softmax(outputs, dim=1)[0]

    results = sorted(
        [(CLASSES[i], float(probs[i]) * 100) for i in range(len(CLASSES))],
        key=lambda x: x[1], reverse=True
    )

    heatmap = None
    try:
        from pytorch_grad_cam import GradCAM
        from pytorch_grad_cam.utils.image import show_cam_on_image
        wrapper      = GradCAMWrapper(model, meta_t).to(device)
        target_layer = [wrapper.model.cnn.blocks[-1]]
        cam          = GradCAM(model=wrapper, target_layers=target_layer)
        grayscale    = cam(input_tensor=img_t)[0]
        heatmap      = show_cam_on_image(img_np.astype(np.float32), grayscale, use_rgb=True)
        print("GradCAM OK")
    except Exception as e:
        print("GradCAM failed: " + str(e))

    n_plots = 3 if heatmap is not None else 2
    fig, axes = plt.subplots(1, n_plots, figsize=(6 * n_plots, 5))
    title = "DermAssist AI\n" + str(age) + " ans | " + sex + " | " + site + " | " + wilaya + " | " + saison
    fig.suptitle(title, fontsize=13, fontweight='bold')

    axes[0].imshow(img_pil.resize((224, 224)))
    axes[0].set_title('Original photo')
    axes[0].axis('off')

    if heatmap is not None:
        axes[1].imshow(heatmap)
        axes[1].set_title('Grad-CAM')
        axes[1].axis('off')
        ax_bar = axes[2]
    else:
        ax_bar = axes[1]

    diseases = [r[0] for r in results[:6]]
    proba    = [r[1] for r in results[:6]]
    colors   = ['#D85A30' if i == 0 else '#7F77DD' if i == 1
                else '#1D9E75' for i in range(len(diseases))]
    bars = ax_bar.barh(diseases[::-1], proba[::-1], color=colors[::-1])
    ax_bar.set_xlabel('Probability (%)')
    ax_bar.set_title('Top diagnoses')
    ax_bar.set_xlim(0, 105)
    for bar, prob in zip(bars, proba[::-1]):
        ax_bar.text(bar.get_width() + 0.5,
                    bar.get_y() + bar.get_height() / 2,
                    str(round(prob, 1)) + '%', va='center', fontsize=9)

    plt.tight_layout()
    plt.savefig('result.png', dpi=150, bbox_inches='tight')
    print("Saved: result.png")
    plt.show()

    print("")
    print("==================================================")
    print("DIAGNOSIS RESULTS")
    print("==================================================")
    print("Patient: " + str(age) + " | " + sex + " | " + site)
    print("Region: " + wilaya + " | Season: " + saison)
    print("")
    print("TOP DIAGNOSIS: " + results[0][0].upper() + " (" + str(round(results[0][1], 1)) + "%)")

    if results[0][1] > 80:
        print("High confidence")
    elif results[0][1] > 60:
        print("Moderate confidence")
    else:
        print("Low confidence - more info needed")

    print("")
    print("Top 5:")
    for i, (disease, prob) in enumerate(results[:5]):
        bar    = '#' * int(prob / 5) + '.' * (20 - int(prob / 5))
        marker = " <-- MAIN" if i == 0 else ""
        print(str(i+1) + ". " + disease.ljust(15) + str(round(prob, 1)).rjust(6) + "% " + bar + marker)
    print("==================================================")

    return results

def main():
    parser = argparse.ArgumentParser(description='DermAssist - Skin disease diagnosis')
    parser.add_argument('--image',  '-i', required=True)
    parser.add_argument('--model',  '-m', default='best_model_FINAL.pth')
    parser.add_argument('--age',    '-a', type=int, default=30)
    parser.add_argument('--sex',    '-s', default='unknown',
                        choices=['male','female','unknown'])
    parser.add_argument('--site',   default='unknown',
                        choices=['visage','cou','tronc','dos','bras','jambe','pied','unknown'])
    parser.add_argument('--wilaya', default='nord',
                        choices=['nord','sud','est','ouest'])
    parser.add_argument('--saison', default='ete',
                        choices=['printemps','ete','automne','hiver'])
    args = parser.parse_args()

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("Device: " + str(device))

    model = load_model(args.model, device)
    predict(args.image, model, device,
            args.age, args.sex, args.site, args.wilaya, args.saison)

if __name__ == "__main__":
    main()