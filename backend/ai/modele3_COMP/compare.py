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

from dotenv import load_dotenv
load_dotenv()

import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torch.nn.functional as F
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
from PIL import Image
import numpy as np

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
# 3. VERDICT
# ════════════════════════════════════════════════════════════════

SIMILARITY_STABLE  = 0.95
SIMILARITY_CHANGED = 0.85


def compute_verdict(similarite: float, score_ref: float, score_new: float) -> dict:
    delta     = score_new - score_ref
    delta_pct = (delta / (score_ref + 1e-6)) * 100

    if similarite > SIMILARITY_STABLE:
        verdict, confiance = "🟡 Stable", "haute"
        explication = "Lésions quasi identiques (similarité cosine élevée)."
    elif similarite > SIMILARITY_CHANGED:
        if delta < -0.05:
            verdict, confiance = "🟢 Légère amélioration", "moyenne"
            explication = f"Similarité modérée + sévérité en baisse de {abs(delta_pct):.1f}%."
        elif delta > 0.05:
            verdict, confiance = "🟠 Légère aggravation", "moyenne"
            explication = f"Similarité modérée + sévérité en hausse de {delta_pct:.1f}%."
        else:
            verdict, confiance = "🟡 Stable (légère variation)", "moyenne"
            explication = "Changement visuel modéré mais sévérité quasi identique."
    else:
        if delta < -0.1:
            verdict, confiance = "🟢 Amélioration nette", "haute"
            explication = f"Changement fort + sévérité en baisse de {abs(delta_pct):.1f}%."
        elif delta > 0.1:
            verdict, confiance = "🔴 Aggravation nette", "haute"
            explication = f"Changement fort + sévérité en hausse de {delta_pct:.1f}%."
        else:
            verdict, confiance = "⚠️  Changement indéterminé", "faible"
            explication = "Changement visuel important mais sévérité contradictoire. Révision manuelle."

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