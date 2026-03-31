"""
severity.py — Score de sévérité cutanée
VERSION INTERMÉDIAIRE : sans CNN, robuste aux phototypes sombres.
Compatible avec l'ancienne signature (image_path only) ET la nouvelle (+ fitzpatrick).
"""

import numpy as np
from PIL import Image

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


FITZPATRICK_BASELINE = {
    "I":   0.00,
    "II":  0.01,
    "III": 0.02,
    "IV":  0.04,
    "V":   0.07,
    "VI":  0.10,
}


def _load_arrays(image_path: str):
    img_pil = Image.open(image_path).convert("RGB")
    rgb = np.array(img_pil, dtype=np.uint8)
    return rgb


def _score_red_pixels(rgb: np.ndarray) -> float:
    """Score original — pixels rouges bruts (fallback si pas cv2)."""
    R = rgb[:, :, 0].astype(float)
    G = rgb[:, :, 1].astype(float)
    B = rgb[:, :, 2].astype(float)
    red_mask = (R > 150) & (G < 100) & (B < 100)
    return float(red_mask.sum()) / red_mask.size


def _score_hsv_erythema(rgb: np.ndarray) -> float:
    """Détecte érythème via teinte HSV — robuste à l'éclairage."""
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(float)
    H, S, V = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
    red_zone = ((H <= 10) | (H >= 160)) & (S > 50) & (V > 40)
    return float(red_zone.sum()) / red_zone.size


def _score_lab_inflammation(rgb: np.ndarray) -> float:
    """Canal a* LAB — inflammation perceptuellement uniforme."""
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(float)
    a_channel = lab[:, :, 1]
    inflamed = a_channel > 135
    if inflamed.sum() == 0:
        return 0.0
    intensity = np.clip((a_channel[inflamed] - 128) / 127, 0, 1)
    return float((inflamed.sum() / a_channel.size) * intensity.mean())


def _score_texture(rgb: np.ndarray) -> float:
    """Variance locale — lésions actives = surface irrégulière."""
    from scipy.ndimage import uniform_filter
    gray = 0.299*rgb[:,:,0] + 0.587*rgb[:,:,1] + 0.114*rgb[:,:,2]
    mean_sq = uniform_filter(gray**2, size=8)
    sq_mean = uniform_filter(gray, size=8)**2
    local_var = np.maximum(mean_sq - sq_mean, 0)
    return float(np.clip(local_var.mean() / 2000.0, 0, 1))


def get_severity_score(image_path: str, fitzpatrick: str = "III") -> float:
    """
    Score de sévérité entre 0.0 (peau saine) et 1.0 (très sévère).

    Paramètres
    ----------
    image_path  : chemin vers l'image
    fitzpatrick : phototype I à VI (défaut III — contexte algérien)
                  Accepte aussi None pour rétrocompatibilité → utilise III
    """
    if fitzpatrick is None:
        fitzpatrick = "III"

    rgb = _load_arrays(image_path)

    if CV2_AVAILABLE:
        try:
            from scipy.ndimage import uniform_filter
            s_hsv     = _score_hsv_erythema(rgb)
            s_lab     = _score_lab_inflammation(rgb)
            s_texture = _score_texture(rgb)
            raw = 0.45 * s_hsv + 0.40 * s_lab + 0.15 * s_texture
        except Exception:
            raw = _score_red_pixels(rgb)
    else:
        # Fallback : version originale pixels rouges
        raw = _score_red_pixels(rgb)

    baseline  = FITZPATRICK_BASELINE.get(str(fitzpatrick).upper(), 0.02)
    corrected = max(0.0, raw - baseline)
    scaled    = float(np.clip(corrected / 0.35, 0.0, 1.0))

    return round(scaled, 4)


# ── Test rapide ───────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python severity.py <image_path> [fitzpatrick]")
        sys.exit(1)
    path = sys.argv[1]
    fitz = sys.argv[2] if len(sys.argv) > 2 else "III"
    score = get_severity_score(path, fitzpatrick=fitz)
    print(f"🔥 Sévérité : {score:.4f}  (phototype {fitz})")