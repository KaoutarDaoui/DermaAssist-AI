
"""
services/cnn_service.py — Module 1 CNN Inference Service
Loaded once at startup, called by the /ai/analyze endpoint.
"""
import json
import numpy as np
import torch
import torch.nn as nn
import timm
import albumentations as A
from albumentations.pytorch import ToTensorV2
from pathlib import Path
from PIL import Image
from typing import Optional

# ── Model directory — relative to this file ──
MODEL_DIR = Path(__file__).parent
DEVICE    = torch.device("cuda" if torch.cuda.is_available() else "cpu")

LEISHMANIOSE_ENDEMIC_CITIES = [
    "biskra", "m sila", "msila", "batna", "khenchela",
    "tebessa", "el oued", "ouargla", "ghardaia", "laghouat",
]

CONDITION_NAMES = {
    "melanome":"Mélanome malin","carcinome_basocellulaire":"Carcinome basocellulaire",
    "carcinome_spinocellulaire":"Carcinome spinocellulaire","naevus_melanocytaire":"Nævus mélanocytaire",
    "keratose_actinique":"Kératose actinique","acne_vulgaire":"Acné vulgaire",
    "rosacee":"Rosacée","eczema_atopique":"Eczéma atopique","psoriasis":"Psoriasis",
    "lichen_plan":"Lichen plan","teigne":"Teigne","dermatomycose":"Dermatomycose",
    "impetigo":"Impétigo","furoncle_cellulite":"Furoncle / Cellulite",
    "herpes_zoster":"Herpès zoster","verrues":"Verrues","urticaire":"Urticaire",
    "pemphigoide_bulleuse":"Pemphigoïde bulleuse","vitiligo":"Vitiligo",
    "dermatofibrome":"Dermatofibrome","gale":"Gale","pityriasis_versicolor":"Pityriasis versicolor",
    "dermite_contact":"Dermite de contact","leishmaniose_cutanee":"Leishmaniose cutanée",
}


class DermAssistModel(nn.Module):
    def __init__(self, num_classes, meta_dim=4, dropout=0.4):
        super().__init__()
        self.cnn = timm.create_model("efficientnet_b0", pretrained=False, num_classes=0, global_pool="avg")
        cnn_out = self.cnn.num_features
        self.meta_mlp = nn.Sequential(
            nn.Linear(meta_dim, 32), nn.BatchNorm1d(32), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(32, 64), nn.ReLU(),
        )
        self.classifier = nn.Sequential(
            nn.Dropout(dropout), nn.Linear(cnn_out + 64, 512),
            nn.BatchNorm1d(512), nn.ReLU(),
            nn.Dropout(dropout / 2), nn.Linear(512, num_classes),
        )
    def forward(self, img, meta):
        return self.classifier(torch.cat([self.cnn(img), self.meta_mlp(meta)], dim=1))
    def get_embeddings(self, img, meta):
        return torch.cat([self.cnn(img), self.meta_mlp(meta)], dim=1)


class CNNService:
    """Singleton — loaded once at FastAPI startup."""
    def __init__(self):
        config = json.load(open(MODEL_DIR / "model_config.json"))
        self.idx_to_class = {int(k): v for k, v in config["idx_to_class"].items()}
        self.class_to_idx = config["class_to_idx"]
        self.model = DermAssistModel(num_classes=config["num_classes"]).to(DEVICE)
        self.model.load_state_dict(torch.load(MODEL_DIR / "best_model.pth", map_location=DEVICE))
        self.model.eval()
        self.transform = A.Compose([
            A.Resize(224, 224),
            A.Normalize(mean=config["norm_mean"], std=config["norm_std"]),
            ToTensorV2(),
        ])
        print(f"CNNService loaded — {config['num_classes']} classes — val_acc={config['best_val_acc']:.3f}")

    @torch.no_grad()
    def predict(self, image_bytes: bytes, age: int, sexe: str,
                fitzpatrick: int, localisation: str = "unknown",
                ville: str = "", top_k: int = 3) -> dict:
        from io import BytesIO
        img = np.array(Image.open(BytesIO(image_bytes)).convert("RGB"))
        img_t = self.transform(image=img)["image"].unsqueeze(0).to(DEVICE)
        loc_map = {"back":0,"lower extremity":1,"trunk":2,"upper extremity":3,
                   "abdomen":4,"face":5,"chest":6,"unknown":14}
        meta_t = torch.tensor([[
            min(max(age,0),100)/100.0,
            1.0 if sexe=="homme" else 0.0,
            fitzpatrick/6.0,
            loc_map.get(localisation.lower(),14)/15.0,
        ]], dtype=torch.float32).to(DEVICE)
        probs = torch.softmax(self.model(img_t, meta_t), dim=1)[0]
        # Geographic boost for leishmaniose
        leish_idx = self.class_to_idx.get("leishmaniose_cutanee", -1)
        if leish_idx >= 0 and any(c in ville.lower() for c in LEISHMANIOSE_ENDEMIC_CITIES):
            if probs[leish_idx] > 0.05:
                probs[leish_idx] = min(probs[leish_idx] * 3.0, 0.95)
                probs = probs / probs.sum()
        top_p, top_i = probs.topk(top_k + 1)
        top_p, top_i = top_p.cpu().numpy(), top_i.cpu().numpy()
        primary_id = self.idx_to_class[int(top_i[0])]
        return {
            "condition_id":   primary_id,
            "condition_name": CONDITION_NAMES.get(primary_id, primary_id),
            "confidence":     float(top_p[0]),
            "top_alternatives": [
                {"id": self.idx_to_class[int(top_i[i])],
                 "name": CONDITION_NAMES.get(self.idx_to_class[int(top_i[i])], ""),
                 "confidence": float(top_p[i])}
                for i in range(1, len(top_i))
            ],
        }

    def get_embedding(self, image_bytes: bytes, age: int, sexe: str,
                      fitzpatrick: int, localisation: str = "unknown") -> np.ndarray:
        """Returns the 1344-dim embedding for Module 3 (Siamese/GradCAM)."""
        from io import BytesIO
        img = np.array(Image.open(BytesIO(image_bytes)).convert("RGB"))
        img_t = self.transform(image=img)["image"].unsqueeze(0).to(DEVICE)
        loc_map = {"face":5, "unknown":14}
        meta_t = torch.tensor([[
            min(max(age,0),100)/100.0, 1.0 if sexe=="homme" else 0.0,
            fitzpatrick/6.0, loc_map.get(localisation.lower(),14)/15.0,
        ]], dtype=torch.float32).to(DEVICE)
        with torch.no_grad():
            return self.model.get_embeddings(img_t, meta_t)[0].cpu().numpy()


# Singleton instance
_cnn_service: Optional[CNNService] = None

def get_cnn_service() -> CNNService:
    global _cnn_service
    if _cnn_service is None:
        _cnn_service = CNNService()
    return _cnn_service
