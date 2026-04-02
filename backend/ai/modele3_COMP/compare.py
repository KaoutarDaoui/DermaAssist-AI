"""
Module 3 — Comparaison temporelle des lésions cutanées

USAGE :
    # Comparer nouvelle photo avec la référence en base
    python compare.py --new photo_aujourd_hui.png

    # Comparer deux photos locales (sans base)
    python compare.py --new photo_nouvelle.png --ref photo_ancienne.png

    # Forcer un patient différent de celui dans .env
    python compare.py --new photo.png --patient 98d1ed2f-e319-4911-b145-00ffd9380b90
"""

import os
import io
import sys
import argparse
import warnings
import tempfile
from pathlib import Path
from urllib.parse import urlparse, unquote
import cv2
import numpy as np
import base64
from PIL import Image


from dotenv import load_dotenv
load_dotenv()

import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torch.nn.functional as F
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
from PIL import Image

# ── psycopg2 ──────────────────────────────────────────────────────
try:
    import psycopg2
    import psycopg2.extras
    DB_AVAILABLE = True
except ImportError:
    warnings.warn("psycopg2 non installé. `pip install psycopg2-binary`")
    DB_AVAILABLE = False

# ── Variables d'env ───────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")
PATIENT_ID   = os.getenv("PATIENT_ID", "")

SUPABASE_URL = ""
if DATABASE_URL:
    try:
        parsed = urlparse(unquote(DATABASE_URL))
        project_ref = parsed.username.replace("postgres.", "")
        SUPABASE_URL = f"https://{project_ref}.supabase.co"
    except Exception:
        pass


# ════════════════════════════════════════════════════════════════
# 1. MODÈLE
# ════════════════════════════════════════════════════════════════

class MultiScaleEmbedder(nn.Module):
    def __init__(self):
        super().__init__()
        base = efficientnet_b0(weights=None)
        self.features  = base.features
        self.proj_deep = nn.AdaptiveAvgPool2d(1)
        self.proj_mid  = nn.AdaptiveAvgPool2d(1)

    def forward(self, x):
        feat_map = self.features(x)
        deep = self.proj_deep(feat_map).squeeze(-1).squeeze(-1)
        mid_map = self.features[:-2](x)
        mid = self.proj_mid(mid_map).squeeze(-1).squeeze(-1)
        return F.normalize(torch.cat([deep, mid], dim=1), dim=1)


model = MultiScaleEmbedder()
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])


def get_embedding(image_source) -> torch.Tensor:
    if isinstance(image_source, (bytes, bytearray)):
        img = Image.open(io.BytesIO(image_source)).convert("RGB")
    else:
        img = Image.open(image_source).convert("RGB")
    tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        return model(tensor).squeeze(0)


# ════════════════════════════════════════════════════════════════
# 2. CONNEXION DB — parsing manuel (fix Windows + %40 dans mdp)
# ════════════════════════════════════════════════════════════════

def parse_db_url(url: str) -> dict:
    """
    Parse DATABASE_URL en utilisant rfind('@') pour gérer les mots de passe
    contenant plusieurs @ (ex: DermaAssist@@@333 encodé en %40%40%40).

    Stratégie : le DERNIER @ dans l'URL décodée sépare toujours
    le bloc user:password du bloc host:port/dbname.
    """
    decoded = unquote(url)

    # Supprimer le préfixe postgresql:// ou postgresql+psycopg2://
    if "://" not in decoded:
        raise ValueError("DATABASE_URL invalide — préfixe postgresql:// manquant")
    rest = decoded.split("://", 1)[1]

    # Trouver le DERNIER @ → sépare userinfo du hostinfo
    at_idx = rest.rfind("@")
    if at_idx == -1:
        raise ValueError("DATABASE_URL invalide — @ introuvable")

    userinfo = rest[:at_idx]          # "user:password"
    hostinfo = rest[at_idx + 1:]      # "host:port/dbname"

    # Séparer user et password (premier : seulement)
    colon_idx = userinfo.index(":")
    user     = userinfo[:colon_idx]
    password = userinfo[colon_idx + 1:]

    # Séparer host:port et dbname
    if "/" not in hostinfo:
        raise ValueError("DATABASE_URL invalide — /dbname manquant")
    host_port, dbname = hostinfo.split("/", 1)
    dbname = dbname.split("?")[0]     # ignorer les query params éventuels

    if ":" in host_port:
        host, port_str = host_port.rsplit(":", 1)
        port = int(port_str)
    else:
        host = host_port
        port = 5432

    return {
        "user":     user,
        "password": password,
        "host":     host,
        "port":     port,
        "dbname":   dbname,
    }


def get_db_connection():
    if not DB_AVAILABLE:
        raise RuntimeError("psycopg2 non installé. `pip install psycopg2-binary`")
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL non défini dans .env")

    try:
        params = parse_db_url(DATABASE_URL)
        return psycopg2.connect(
            host     = params["host"],
            port     = params["port"],
            dbname   = params["dbname"],
            user     = params["user"],
            password = params["password"],
            sslmode  = "require",          # Supabase exige SSL
            connect_timeout = 10,
        )
    except ValueError as e:
        raise RuntimeError(str(e))


def load_reference_images_from_db(patient_id: str) -> list[dict]:
    """
    Charge toutes les images de référence du patient,
    triées de la plus ancienne à la plus récente.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    id,
                    consultation_id,
                    minio_url,
                    image_data,
                    source,
                    cnn_label,
                    cnn_confidence,
                    uploaded_at
                FROM skin_images
                WHERE patient_id = %s
                ORDER BY uploaded_at ASC
            """, (patient_id,))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return []

    images = []
    for row in rows:
        row = dict(row)
        if row.get("image_data"):
            row["bytes"] = bytes(row["image_data"])
            images.append(row)
            continue
        url = row.get("minio_url", "")
        if url:
            try:
                import requests
                r = requests.get(url, timeout=15)
                r.raise_for_status()
                row["bytes"] = r.content
                images.append(row)
            except Exception as e:
                warnings.warn(f"Impossible de télécharger {url}: {e}")

    return images


def get_patient_fitzpatrick(patient_id: str) -> str:
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT fitzpatrick_type FROM patients WHERE id = %s",
                (patient_id,)
            )
            row = cur.fetchone()
        conn.close()
        if row and row["fitzpatrick_type"]:
            return str(row["fitzpatrick_type"])
    except Exception as e:
        warnings.warn(f"Impossible de charger le phototype: {e}")
    return "III"


def bytes_to_temp(b: bytes, suffix=".png") -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp.write(b)
    tmp.close()
    return tmp.name


# ════════════════════════════════════════════════════════════════
# 3. VERDICT — sévérité en premier, similarité en support
# ════════════════════════════════════════════════════════════════

# Seuils de sévérité (delta entre 0 et 1)
SEV_STRONG   = 0.10   # changement fort    → verdict direct
SEV_MODERATE = 0.04   # changement modéré  → croisé avec similarité

# Seuil de similarité pour détecter un changement de structure
SIM_STRUCTURAL_CHANGE = 0.88


def compute_verdict(
    similarite: float,
    score_ref:  float,
    score_new:  float,
) -> dict:
    """
    La SÉVÉRITÉ est le signal principal.
    La similarité cosine est utilisée uniquement en support.

    Cas de ton screenshot :
      score_ref=0.145, score_new=0.413, delta=+0.268 (>SEV_STRONG)
      → Aggravation nette, confiance haute
      (la similarité de 0.958 est IGNORÉE)
    """
    delta     = score_new - score_ref
    delta_pct = (delta / (score_ref + 1e-6)) * 100
    abs_delta = abs(delta)

    # ── Niveau 1 : delta fort → verdict direct ────────────────────
    if abs_delta >= SEV_STRONG:
        if delta > 0:
            verdict, confiance = "🔴 Aggravation nette", "haute"
            explication = f"Sévérité en hausse de {delta_pct:.1f}% — changement clinique significatif."
        else:
            verdict, confiance = "🟢 Amélioration nette", "haute"
            explication = f"Sévérité en baisse de {abs(delta_pct):.1f}% — amélioration clinique significative."

    # ── Niveau 2 : delta modéré → croiser avec similarité ─────────
    elif abs_delta >= SEV_MODERATE:
        confiance = "haute" if similarite < SIM_STRUCTURAL_CHANGE else "moyenne"
        if delta > 0:
            verdict    = "🟠 Légère aggravation"
            explication = f"Sévérité en hausse de {delta_pct:.1f}%."
        else:
            verdict    = "🟢 Légère amélioration"
            explication = f"Sévérité en baisse de {abs(delta_pct):.1f}%."

    # ── Niveau 3 : delta faible → stable ─────────────────────────
    else:
        if similarite < SIM_STRUCTURAL_CHANGE:
            verdict    = "⚠️  Changement indéterminé"
            confiance  = "faible"
            explication = "Changement visuel notable mais sévérité similaire. Révision manuelle."
        else:
            verdict    = "🟡 Stable"
            confiance  = "haute"
            explication = "Sévérité et structure visuelles quasi identiques."

    return {
        "verdict":           verdict,
        "confiance":         confiance,
        "similarite_cosine": round(similarite, 4),
        "score_reference":   round(score_ref, 4),
        "score_nouveau":     round(score_new, 4),
        "delta_severity":    round(delta, 4),
        "delta_pct":         round(delta_pct, 1),
        "explication":       explication,
    }

# ════════════════════════════════════════════════════════════════
# 4. MAIN
# ════════════════════════════════════════════════════════════════

def parse_args():
    parser = argparse.ArgumentParser(
        description="Compare une nouvelle photo avec la référence en base."
    )
    parser.add_argument(
        "--new", "-n",
        required=True,
        help="Chemin vers la NOUVELLE photo à analyser"
    )
    parser.add_argument(
        "--ref", "-r",
        default=None,
        help="(Optionnel) Photo de référence locale. Si absent : utilise la dernière image en base."
    )
    parser.add_argument(
        "--patient", "-p",
        default=None,
        help="UUID du patient (override PATIENT_ID dans .env)"
    )
    return parser.parse_args()

def generate_evolution_overlay(
    ref_source,
    new_source,
    verdict: str,
    alpha: float = 0.45
) -> str:
    """
    Génère une image base64 avec overlay coloré montrant
    les zones d'amélioration (vert) et d'aggravation (rouge).
    Ne stocke rien — retourne uniquement le base64.
    """

    # ── Charger les images ────────────────────────────────────────
    def load_rgb(src):
        if isinstance(src, (bytes, bytearray)):
            return np.array(Image.open(io.BytesIO(src)).convert("RGB"))
        return np.array(Image.open(src).convert("RGB"))

    img_ref = load_rgb(ref_source)
    img_new = load_rgb(new_source)

    # ── Redimensionner à la même taille ──────────────────────────
    h, w = img_new.shape[:2]
    img_ref_resized = cv2.resize(img_ref, (w, h))

    # ── Extraire les feature maps (layer intermédiaire) ───────────
    def get_feature_map(image_array):
        """Extrait la feature map 7x7 du dernier layer EfficientNet."""
        tensor = transform(Image.fromarray(image_array)).unsqueeze(0)
        with torch.no_grad():
            # features[-1] → (1, 1280, 7, 7)
            feat = model.features(tensor)
        # Moyenne sur les canaux → (7, 7)
        return feat[0].mean(dim=0).cpu().numpy()

    fmap_ref = get_feature_map(img_ref_resized)
    fmap_new = get_feature_map(img_new)

    # ── Delta map ─────────────────────────────────────────────────
    # positif = zone plus activée dans new → aggravation potentielle
    # négatif = zone moins activée dans new → amélioration potentielle
    delta = fmap_new - fmap_ref

    # Normaliser entre -1 et 1
    max_abs = np.abs(delta).max() + 1e-8
    delta_norm = delta / max_abs

    # Redimensionner à la taille de l'image
    delta_up = cv2.resize(delta_norm, (w, h), interpolation=cv2.INTER_CUBIC)

    # ── Créer l'overlay coloré ────────────────────────────────────
    overlay = img_new.copy().astype(np.float32)

    # Masque aggravation (delta positif fort) → rouge
    aggravation_mask = delta_up > 0.3
    overlay[aggravation_mask] = (
        overlay[aggravation_mask] * (1 - alpha) +
        np.array([220, 50, 50], dtype=np.float32) * alpha
    )

    # Masque amélioration (delta négatif fort) → vert
    amelioration_mask = delta_up < -0.3
    overlay[amelioration_mask] = (
        overlay[amelioration_mask] * (1 - alpha) +
        np.array([50, 180, 80], dtype=np.float32) * alpha
    )

    overlay = np.clip(overlay, 0, 255).astype(np.uint8)

    # ── Ajouter les cercles autour des zones détectées ────────────
    # Trouver les contours des zones aggravées
    agg_binary = (aggravation_mask * 255).astype(np.uint8)
    amel_binary = (amelioration_mask * 255).astype(np.uint8)

    for binary, color in [(agg_binary, (220, 50, 50)), (amel_binary, (50, 180, 80))]:
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        for cnt in contours:
            if cv2.contourArea(cnt) > 200:  # ignorer les trop petites zones
                (cx, cy), radius = cv2.minEnclosingCircle(cnt)
                cv2.circle(
                    overlay,
                    (int(cx), int(cy)),
                    int(radius) + 8,
                    color,
                    thickness=3
                )

    # ── Encoder en base64 ─────────────────────────────────────────
    pil_img = Image.fromarray(overlay)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=90)
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return f"data:image/jpeg;base64,{b64}"

if __name__ == "__main__":
    from severity import get_severity_score

    args = parse_args()

    # ── Patient ───────────────────────────────────────────────────
    patient_id = args.patient or PATIENT_ID
    if not patient_id:
        print("❌ Aucun PATIENT_ID. Utilise --patient <uuid> ou définis PATIENT_ID dans .env")
        sys.exit(1)

    # ── Nouvelle photo ────────────────────────────────────────────
    new_photo_path = Path(args.new)
    if not new_photo_path.exists():
        print(f"❌ Fichier introuvable : {new_photo_path}")
        sys.exit(1)

    print(f"🆕 Nouvelle photo    : {new_photo_path.name}")
    print(f"👤 Patient ID        : {patient_id}")

    # ── Référence ─────────────────────────────────────────────────
    ref_bytes    = None
    ref_path_str = None
    ref_label    = ""

    if args.ref:
        ref_path = Path(args.ref)
        if not ref_path.exists():
            print(f"❌ Référence introuvable : {ref_path}")
            sys.exit(1)
        ref_path_str = str(ref_path)
        ref_label    = ref_path.name
        print(f"🗂️  Référence locale  : {ref_label}")

    else:
        if not DB_AVAILABLE or not DATABASE_URL:
            print("❌ Pas de --ref fourni et pas de connexion DB disponible.")
            print("   → Utilise : python compare.py --new photo.png --ref ancienne.png")
            sys.exit(1)

        print(f"🌐 Connexion Supabase : {SUPABASE_URL}")
        try:
            db_images = load_reference_images_from_db(patient_id)
        except Exception as e:
            print(f"❌ Erreur de connexion : {e}")
            print("   → Vérifie DATABASE_URL dans ton .env")
            sys.exit(1)

        if not db_images:
            print("❌ Aucune image trouvée en base pour ce patient.")
            print("   → Fournis --ref <chemin_local> pour comparer localement.")
            sys.exit(1)

        ref_row      = db_images[-1]
        ref_bytes    = ref_row["bytes"]
        ref_path_str = bytes_to_temp(ref_bytes)
        ref_label    = f"DB [{ref_row['uploaded_at']}] source={ref_row['source']}"
        print(f"🗂️  Référence en base : {ref_label}")
        if ref_row.get("cnn_label"):
            print(f"   CNN label        : {ref_row['cnn_label']} ({ref_row['cnn_confidence']:.2f})")
        if len(db_images) > 1:
            print(f"   ({len(db_images)} images en base — utilise la plus récente)")

    # ── Fitzpatrick ───────────────────────────────────────────────
    fitzpatrick = "III"
    if DB_AVAILABLE and DATABASE_URL:
        try:
            fitzpatrick = get_patient_fitzpatrick(patient_id)
        except Exception:
            pass
    print(f"🎨 Fitzpatrick        : Type {fitzpatrick}")

    # ── Embeddings ────────────────────────────────────────────────
    print("\n⚙️  Calcul des embeddings...")
    emb_ref = get_embedding(ref_bytes if ref_bytes else ref_path_str)
    emb_new = get_embedding(new_photo_path)

    # ── Sévérité ──────────────────────────────────────────────────
    score_ref = get_severity_score(ref_path_str,        fitzpatrick=fitzpatrick)
    score_new = get_severity_score(str(new_photo_path), fitzpatrick=fitzpatrick)

    # ── Résultat ──────────────────────────────────────────────────
    similarite = F.cosine_similarity(emb_ref.unsqueeze(0), emb_new.unsqueeze(0)).item()
    result     = compute_verdict(similarite, score_ref, score_new)

    print("\n" + "=" * 54)
    print(f"  Référence          : {ref_label}")
    print(f"  Nouvelle           : {new_photo_path.name}")
    print("-" * 54)
    print(f"  Similarité cosine  : {result['similarite_cosine']}")
    print(f"  Sévérité référence : {result['score_reference']}")
    print(f"  Sévérité nouvelle  : {result['score_nouveau']}")
    print(f"  Delta sévérité     : {result['delta_severity']:+.4f}  ({result['delta_pct']:+.1f}%)")
    print("-" * 54)
    print(f"  Verdict            : {result['verdict']}")
    print(f"  Confiance          : {result['confiance']}")
    print(f"  Explication        : {result['explication']}")
    print("=" * 54)
