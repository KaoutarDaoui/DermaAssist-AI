
"""
services/cnn_service.py — Module 1 CNN Inference Service (IMPROVED MODEL WITH METADATA)
Loaded once at startup, called by the /ai/analyze endpoint.

Uses the improved DermAssistFinal model with comprehensive metadata:
- age, sex, site (body location), wilaya (region), saison (season)
"""
import json
import numpy as np
import torch
import torch.nn as nn
import timm
from pathlib import Path
from PIL import Image
from torchvision import transforms
from typing import Optional
from io import BytesIO

# ── Model directory — relative to this file ──
MODEL_DIR = Path(__file__).parent
DEVICE    = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Class mapping and French translations ──
CLASSES = ['acne', 'eczema', 'gale', 'keratose', 'leishmaniose',
           'melanome', 'mycose', 'psoriasis', 'rosacee', 'urticaire']

CONDITION_NAMES_FR = {
    'acne': 'Acné',
    'eczema': 'Eczéma',
    'gale': 'Gale',
    'keratose': 'Kératose',
    'leishmaniose': 'Leishmaniose',
    'melanome': 'Mélanome',
    'mycose': 'Mycose',
    'psoriasis': 'Psoriasis',
    'rosacee': 'Rosacée',
    'urticaire': 'Urticaire'
}

# ── Mapping CNN classes to Knowledge Base IDs ──
CNN_TO_KB_MAP = {
    'acne': 'acne_vulgaire',
    'eczema': 'eczema_atopique',
    'gale': 'teigne',  # Fungal infection (gale relates to scabies but using teigne for fungal)
    'keratose': 'keratose_actinique',
    'leishmaniose': 'leishmaniose_cutanee',
    'melanome': 'melanome',
    'mycose': 'dermatomycose',
    'psoriasis': 'psoriasis',
    'rosacee': 'rosacee',
    'urticaire': 'urticaire'
}

# ── Metadata encoding maps ──
SEX_MAP = {'male': 0.0, 'homme': 0.0, 'female': 1.0, 'femme': 1.0, 'unknown': 0.5}
SITE_MAP = {
    'visage': 0, 'face': 0,
    'cou': 1, 'neck': 1,
    'tronc': 2, 'trunk': 2,
    'dos': 3, 'back': 3,
    'bras': 4, 'arm': 4,
    'jambe': 5, 'leg': 5,
    'pied': 6, 'foot': 6,
    'unknown': 7
}
WILAYA_MAP = {
    'nord': 0, 'north': 0,
    'sud': 1, 'south': 1,
    'est': 2, 'east': 2,
    'ouest': 3, 'west': 3
}
SAISON_MAP = {
    'printemps': 0, 'spring': 0,
    'ete': 1, 'summer': 1,
    'automne': 2, 'fall': 2, 'autumn': 2,
    'hiver': 3, 'winter': 3
}

META_DIM = 18


def encode_metadata(age, sex, site, wilaya, saison):
    """Encode metadata into 18-dimensional vector matching predict.py format."""
    age_n = float(age) / 100.0
    sex_v = SEX_MAP.get(str(sex).lower(), 0.5)
    
    site_v = [0.0] * 8
    site_v[SITE_MAP.get(str(site).lower(), 7)] = 1.0
    
    wil_v = [0.0] * 4
    wil_v[WILAYA_MAP.get(str(wilaya).lower(), 0)] = 1.0
    
    sai_v = [0.0] * 4
    sai_v[SAISON_MAP.get(str(saison).lower(), 1)] = 1.0
    
    meta = [age_n, sex_v] + site_v + wil_v + sai_v
    return torch.tensor(meta, dtype=torch.float32)


class DermAssistFinal(nn.Module):
    """Improved model with metadata integration."""
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
        return self.fusion(torch.cat([self.cnn(image), self.mlp(metadata)], dim=1))


class CNNService:
    """Singleton — loads improved model with metadata at FastAPI startup."""
    def __init__(self):
        print("🔄 Loading improved CNN model with metadata...")
        
        # Load model weights
        model_path = MODEL_DIR / 'best_model_FINAL.pth'
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        self.model = DermAssistFinal(n_classes=len(CLASSES), meta_dim=META_DIM).to(DEVICE)
        self.model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        self.model.eval()
        
        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                std=[0.229, 0.224, 0.225]),
        ])
        
        print(f"✅ CNNService loaded — {len(CLASSES)} disease classes — Device: {DEVICE}")

    @torch.no_grad()
    def predict(self, image_bytes: bytes, age: int, sex: str,
                site: str = "unknown", wilaya: str = "nord", 
                saison: str = "ete", top_k: int = 5) -> dict:
        """
        Predict skin disease using improved model with metadata.
        
        Args:
            image_bytes: Raw image bytes
            age: Patient age (0-120)
            sex: 'male'/'homme', 'female'/'femme', or 'unknown'
            site: Body location (visage, cou, tronc, dos, bras, jambe, pied, unknown)
            wilaya: Region (nord, sud, est, ouest)
            saison: Season (printemps, ete, automne, hiver)
            top_k: Number of top diagnoses to return
        
        Returns:
            dict with diagnosis, confidence, and alternatives
        """
        # Load and preprocess image
        img_pil = Image.open(BytesIO(image_bytes)).convert('RGB')
        img_t = self.transform(img_pil).unsqueeze(0).to(DEVICE)
        
        # Encode metadata
        meta_t = encode_metadata(age, sex, site, wilaya, saison).unsqueeze(0).to(DEVICE)
        
        # Forward pass
        outputs = self.model(img_t, meta_t)
        probs = torch.softmax(outputs, dim=1)[0]
        
        # Geographic boost for leishmaniose in endemic regions
        if wilaya.lower() in ['sud', 'est']:
            leish_idx = CLASSES.index('leishmaniose')
            if probs[leish_idx] > 0.05:
                probs[leish_idx] = min(probs[leish_idx] * 1.5, 0.95)
                probs = probs / probs.sum()
        
        # Get top diagnoses
        top_p, top_i = probs.topk(min(top_k, len(CLASSES)))
        top_p, top_i = top_p.cpu().numpy(), top_i.cpu().numpy()
        
        primary_disease = CLASSES[int(top_i[0])]
        
        return {
            "condition_id": CNN_TO_KB_MAP.get(primary_disease, primary_disease),  # KB ID for RAG
            "cnn_condition_id": primary_disease,  # Original CNN class
            "condition_name": CONDITION_NAMES_FR.get(primary_disease, primary_disease),
            "confidence": float(top_p[0]),
            "confidence_pct": float(top_p[0] * 100),
            "top_alternatives": [
                {
                    "id": CNN_TO_KB_MAP.get(CLASSES[int(top_i[i])], CLASSES[int(top_i[i])]),  # KB ID
                    "cnn_id": CLASSES[int(top_i[i])],  # Original CNN class
                    "name": CONDITION_NAMES_FR.get(CLASSES[int(top_i[i])], ""),
                    "confidence": float(top_p[i]),
                    "confidence_pct": float(top_p[i] * 100)
                }
                for i in range(1, len(top_i))
            ],
        }


# Singleton instance
_cnn_service: Optional[CNNService] = None

def get_cnn_service() -> CNNService:
    global _cnn_service
    if _cnn_service is None:
        _cnn_service = CNNService()
    return _cnn_service
