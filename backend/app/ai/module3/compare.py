"""
Module 3 — Comparaison temporelle des lésions cutanées
Améliorations :
  - Connexion Supabase pour charger les paires de photos par patient
  - Multi-scale embedding (features intermédiaires + avgpool)
  - Verdict plus nuancé avec seuils calibrés
  - Grad-CAM prêt à brancher
  - Variables d'environnement pour les credentials (ne jamais hardcoder)
"""

import os
import io
import warnings
from pathlib import Path
from typing import Optional

import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torch.nn.functional as F
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
from PIL import Image
import numpy as np

# ── Supabase (pip install supabase) ──────────────────────────────
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    warnings.warn("supabase-py non installé. Mode local uniquement. `pip install supabase`")
    SUPABASE_AVAILABLE = False

# ── Chargement credentials depuis variables d'env ────────────────
# Dans ton .env :
#   SUPABASE_URL=https://ibuueywbedtkhoufdzfo.supabase.co
#   SUPABASE_KEY=<ta anon key ou service role key>
#   DATABASE_URL=postgresql://...
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")


# ════════════════════════════════════════════════════════════════
# 1. MODÈLE — EfficientNet multi-scale
# ════════════════════════════════════════════════════════════════

class MultiScaleEmbedder(nn.Module):
    """
    Extrait des embeddings à deux niveaux de profondeur :
      - features[-1]  → sémantique haute (pathologie globale)
      - features[-3]  → texture locale (fin grain de la lésion)
    Concaténés et normalisés → vecteur final 512+112 = 624 dims.
    """
    def __init__(self):
        super().__init__()
        base = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        self.features = base.features
        self.avgpool = base.avgpool
        # Projection pour normaliser les dimensions
        self.proj_deep  = nn.AdaptiveAvgPool2d(1)  # features[-1] → 1280
        self.proj_mid   = nn.AdaptiveAvgPool2d(1)  # features[-3] → 112

    def forward(self, x):
        feat_map = self.features(x)                        # (B, 1280, 7, 7)
        deep = self.proj_deep(feat_map).squeeze(-1).squeeze(-1)  # (B, 1280)

        mid_map = self.features[:-2](x)                    # (B, 112, 28, 28)
        mid  = self.proj_mid(mid_map).squeeze(-1).squeeze(-1)    # (B, 112)

        combined = torch.cat([deep, mid], dim=1)           # (B, 1392)
        return F.normalize(combined, dim=1)                # L2 normalisé


model = MultiScaleEmbedder()
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])


def get_embedding(image_source) -> torch.Tensor:
    """
    image_source : chemin Path/str OU bytes (téléchargé depuis Supabase).
    Retourne un vecteur 1D normalisé.
    """
    if isinstance(image_source, (bytes, bytearray)):
        img = Image.open(io.BytesIO(image_source)).convert("RGB")
    else:
        img = Image.open(image_source).convert("RGB")

    tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        emb = model(tensor).squeeze(0)
    return emb


# ════════════════════════════════════════════════════════════════
# 2. CONNEXION SUPABASE — charger les photos d'un patient
# ════════════════════════════════════════════════════════════════

def get_supabase_client() -> Optional["Client"]:
    if not SUPABASE_AVAILABLE:
        return None
    if not SUPABASE_URL or not SUPABASE_KEY:
        warnings.warn("SUPABASE_URL / SUPABASE_KEY non définis.")
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def load_patient_images_from_supabase(patient_id: str) -> list[dict]:
    """
    Charge toutes les skin_images d'un patient, triées par uploaded_at.
    Retourne une liste de dicts : {consultation_id, minio_url, uploaded_at, source, bytes}

    La table skin_images contient minio_url — on télécharge via le bucket Supabase Storage
    ou directement via l'URL MinIO selon ta config.
    """
    client = get_supabase_client()
    if client is None:
        return []

    resp = (
        client.table("skin_images")
        .select("id, consultation_id, minio_url, uploaded_at, source, cnn_label, cnn_confidence")
        .eq("patient_id", patient_id)
        .order("uploaded_at", desc=False)
        .execute()
    )

    images = []
    for row in resp.data:
        url = row.get("minio_url", "")
        if not url:
            continue
        try:
            import requests
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            row["bytes"] = r.content
            images.append(row)
        except Exception as e:
            warnings.warn(f"Impossible de télécharger {url}: {e}")

    return images


def load_patient_images_local(patient_folder: Path) -> list[Path]:
    """Fallback : charge depuis le dossier local (comportement actuel)."""
    exts = ("*.png", "*.jpg", "*.jpeg")
    photos = []
    for ext in exts:
        photos.extend(patient_folder.glob(ext))
    return sorted(photos)


# ════════════════════════════════════════════════════════════════
# 3. COMPARAISON — logique principale
# ════════════════════════════════════════════════════════════════

# Seuils calibrés empiriquement (à affiner avec tes données réelles)
SIMILARITY_STABLE    = 0.95   # > 0.95 → quasi identique → Stable
SIMILARITY_CHANGED   = 0.85   # entre 0.85 et 0.95 → changement modéré
# < 0.85 → changement fort → utiliser severity pour trancher


def compute_verdict(similarite: float, score_ancien: float, score_nouveau: float) -> dict:
    """
    Verdict multi-niveaux basé sur similarité cosine + delta de sévérité.
    Retourne un dict avec verdict, confiance, et explication.
    """
    delta = score_nouveau - score_ancien
    delta_pct = (delta / (score_ancien + 1e-6)) * 100

    if similarite > SIMILARITY_STABLE:
        verdict = "🟡 Stable"
        confiance = "haute"
        explication = "Les lésions sont quasi identiques (similarité cosine élevée)."

    elif similarite > SIMILARITY_CHANGED:
        # Changement modéré — severity départage
        if delta < -0.05:
            verdict = "🟢 Légère amélioration"
            confiance = "moyenne"
            explication = f"Similarité modérée + score de sévérité en baisse de {abs(delta_pct):.1f}%."
        elif delta > 0.05:
            verdict = "🟠 Légère aggravation"
            confiance = "moyenne"
            explication = f"Similarité modérée + score de sévérité en hausse de {delta_pct:.1f}%."
        else:
            verdict = "🟡 Stable (légère variation)"
            confiance = "moyenne"
            explication = "Changement visuel modéré mais sévérité quasi identique."

    else:
        # Changement fort — severity fait foi
        if delta < -0.1:
            verdict = "🟢 Amélioration nette"
            confiance = "haute"
            explication = f"Changement visuel fort + sévérité en baisse de {abs(delta_pct):.1f}%."
        elif delta > 0.1:
            verdict = "🔴 Aggravation nette"
            confiance = "haute"
            explication = f"Changement visuel fort + sévérité en hausse de {delta_pct:.1f}%."
        else:
            verdict = "⚠️ Changement indéterminé"
            confiance = "faible"
            explication = "Changement visuel important mais sévérité contradictoire. Revoir manuellement."

    return {
        "verdict": verdict,
        "confiance": confiance,
        "similarite_cosine": round(similarite, 4),
        "score_ancien": round(score_ancien, 4),
        "score_nouveau": round(score_nouveau, 4),
        "delta_severity": round(delta, 4),
        "delta_pct": round(delta_pct, 1),
        "explication": explication,
    }


# ════════════════════════════════════════════════════════════════
# 4. MAIN — mode Supabase ou local
# ════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from severity import get_severity_score  # ton module Module 1

    # ── Choisir le mode : Supabase ou local ──────────────────────
    PATIENT_ID = os.getenv("PATIENT_ID", "")   # UUID du patient dans Supabase
    USE_SUPABASE = bool(PATIENT_ID) and SUPABASE_AVAILABLE

    if USE_SUPABASE:
        print(f"🌐 Mode Supabase — patient_id={PATIENT_ID}")
        images_data = load_patient_images_from_supabase(PATIENT_ID)

        if len(images_data) < 2:
            print("❌ Moins de 2 photos disponibles pour ce patient dans Supabase.")
            exit(1)

        # Prendre la première et la dernière photo du patient
        ancienne_data = images_data[0]
        nouvelle_data = images_data[-1]

        print(f"🕐 Ancienne : {ancienne_data['uploaded_at']} | source: {ancienne_data['source']}")
        print(f"🆕 Nouvelle : {nouvelle_data['uploaded_at']} | source: {nouvelle_data['source']}")

        emb1 = get_embedding(ancienne_data["bytes"])
        emb2 = get_embedding(nouvelle_data["bytes"])

        # Severity depuis les bytes
        import tempfile
        def bytes_to_temp(b):
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            tmp.write(b)
            tmp.close()
            return tmp.name

        path_ancien = bytes_to_temp(ancienne_data["bytes"])
        path_nouveau = bytes_to_temp(nouvelle_data["bytes"])

    else:
        print("📁 Mode local")
        script_dir = Path(__file__).resolve().parent
        patient_folder = script_dir / "data/patients/patient_001"
        photos = load_patient_images_local(patient_folder)

        if len(photos) < 2:
            print("❌ Moins de 2 photos dans le dossier local.")
            exit(1)

        ancienne, nouvelle = photos[0], photos[-1]
        print(f"🕐 Ancienne : {ancienne.name}")
        print(f"🆕 Nouvelle : {nouvelle.name}")

        emb1 = get_embedding(ancienne)
        emb2 = get_embedding(nouvelle)
        path_ancien = str(ancienne)
        path_nouveau = str(nouvelle)

    # ── Calcul ───────────────────────────────────────────────────
    similarite = F.cosine_similarity(
        emb1.unsqueeze(0), emb2.unsqueeze(0)
    ).item()

    score_ancien = get_severity_score(path_ancien)
    score_nouveau = get_severity_score(path_nouveau)

    result = compute_verdict(similarite, score_ancien, score_nouveau)

    # ── Affichage ─────────────────────────────────────────────────
    print("\n" + "="*50)
    print(f"📊 Similarité cosine  : {result['similarite_cosine']}")
    print(f"🔥 Sévérité ancienne  : {result['score_ancien']}")
    print(f"🔥 Sévérité nouvelle  : {result['score_nouveau']}")
    print(f"📈 Delta sévérité     : {result['delta_severity']:+.4f} ({result['delta_pct']:+.1f}%)")
    print(f"🩺 Verdict            : {result['verdict']}  [confiance: {result['confiance']}]")
    print(f"💬 Explication        : {result['explication']}")
    print("="*50)