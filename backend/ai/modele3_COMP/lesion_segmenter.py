"""
lesion_segmenter.py — backend/ai/modele3_COMP/lesion_segmenter.py

Critère adaptatif selon la pathologie (cnn_label du Module 1) :
  - Eczéma / Érythème / Urticaire  → rougeur (canal a* LAB)
  - Psoriasis / Lichen              → texture (variance locale)
  - Mélanome / Naevus / Kératose   → variation de couleur globale (ΔE LAB)
  - Leishmaniose / Furoncle        → taille de la lésion (surface masque)
  - Acné / Rosacée                 → rougeur + texture combinés
  - Défaut (toute autre maladie)   → ΔE LAB global (changement perceptuel)
"""

import cv2
import numpy as np
import io
import base64
import unicodedata
from PIL import Image


# ── Mapping maladie → critère ─────────────────────────────────────
DISEASE_CRITERIA = {
    # Rougeur — canal a* LAB
    "eczema_atopique":          "redness",
    "dermite_contact":          "redness",
    "urticaire":                "redness",
    "rosacee":                  "redness",
    "acne_vulgaire":            "redness",
    "furoncle_cellulite":       "redness",
    "impetigo":                 "redness",
    "herpes_zoster":            "redness",

    # Texture — variance locale (squames, plaques)
    "psoriasis":                "texture",
    "lichen_plan":              "texture",
    "pityriasis_versicolor":    "texture",
    "teigne":                   "texture",
    "dermatomycose":            "texture",
    "gale":                     "texture",
    "keratose_actinique":       "texture",

    # Couleur globale ΔE LAB — lésions pigmentées
    "melanome":                 "color",
    "naevus_melanocytaire":     "color",
    "carcinome_basocellulaire": "color",
    "carcinome_spinocellulaire":"color",
    "dermatofibrome":           "color",
    "vitiligo":                 "color",

    # Taille — surface du masque de lésion
    "leishmaniose_cutanee":     "size",
    "verrues":                  "size",
    "pemphigoide_bulleuse":     "size",
}


def _normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


def _load_bgr(src) -> np.ndarray:
    if isinstance(src, (bytes, bytearray)):
        arr = np.array(Image.open(io.BytesIO(src)).convert("RGB"))
    else:
        arr = np.array(Image.open(str(src)).convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def _encode(bgr: np.ndarray) -> str:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    buf = io.BytesIO()
    Image.fromarray(rgb).save(buf, format="JPEG", quality=92)
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"


# ── Critères de changement ────────────────────────────────────────

def _score_redness(bgr: np.ndarray) -> np.ndarray:
    """Canal a* LAB — élevé = zone rouge/enflammée."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    return lab[:, :, 1]   # a* : rouge-vert


def _score_texture(bgr: np.ndarray) -> np.ndarray:
    """Variance locale de luminance — élevée = surface irrégulière/squameuse."""
    from scipy.ndimage import uniform_filter
    gray     = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    mean_sq  = uniform_filter(gray ** 2, size=8)
    sq_mean  = uniform_filter(gray,      size=8) ** 2
    return np.maximum(mean_sq - sq_mean, 0)


def _score_color(bgr: np.ndarray) -> np.ndarray:
    """Luminance LAB — changement global de couleur."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    # Combiner L* + a* + b* pour ΔE complet
    return (lab[:, :, 0] * 0.4 +
            lab[:, :, 1] * 0.4 +
            lab[:, :, 2] * 0.2)


def _get_lesion_size_mask(bgr: np.ndarray) -> np.ndarray:
    """Masque binaire de la lésion via seuillage Otsu sur a*."""
    h, w = bgr.shape[:2]
    lab  = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    a_ch = lab[:, :, 1]
    _, mask = cv2.threshold(a_ch, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    k    = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  k)
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        m = np.zeros((h, w), dtype=np.uint8)
        cv2.ellipse(m, (w//2, h//2), (w//3, h//3), 0, 0, 360, 255, -1)
        return m
    largest = max(cnts, key=cv2.contourArea)
    m = np.zeros((h, w), dtype=np.uint8)
    cv2.drawContours(m, [largest], -1, 255, -1)
    return m


def _compute_delta_map(
    bgr_ref: np.ndarray,
    bgr_new: np.ndarray,
    criteria: str,
) -> np.ndarray:
    """
    Retourne une carte de delta normalisée [-1, 1].
    Positif = aggravation, négatif = amélioration.
    """
    if criteria == "redness":
        s_ref = _score_redness(bgr_ref)
        s_new = _score_redness(bgr_new)
        delta = s_new - s_ref   # a* plus élevé dans new = plus rouge = aggravation

    elif criteria == "texture":
        s_ref = _score_texture(bgr_ref)
        s_new = _score_texture(bgr_new)
        delta = s_new - s_ref   # variance plus élevée dans new = plus squameux

    elif criteria == "color":
        s_ref = _score_color(bgr_ref)
        s_new = _score_color(bgr_new)
        delta = np.abs(s_new - s_ref)   # tout changement de couleur = suspect
        # Pour les lésions pigmentées, tout changement est mauvais
        # On retourne positif partout où ça a changé
        delta = delta - delta.mean()

    elif criteria == "size":
        # Pour la taille : on compare les masques directement
        mask_ref = _get_lesion_size_mask(bgr_ref).astype(np.float32) / 255
        mask_new = _get_lesion_size_mask(bgr_new).astype(np.float32) / 255
        delta = mask_new - mask_ref   # positif = lésion plus grande

    else:
        # Défaut : ΔE LAB global
        s_ref = _score_color(bgr_ref)
        s_new = _score_color(bgr_new)
        delta = s_new - s_ref

    # Lisser + normaliser
    ksize = max(int(min(bgr_new.shape[:2]) * 0.06) | 1, 15)
    delta = cv2.GaussianBlur(delta, (ksize, ksize), 0)
    max_abs = np.abs(delta).max() + 1e-8
    return delta / max_abs


def generate_evolution_overlay(
    ref_source,
    new_source,
    verdict:   str = "",
    cnn_label: str = "",
    alpha:     float = 0.5,
) -> str:
    """
    Paramètres
    ----------
    ref_source : str/bytes — photo référence
    new_source : str/bytes — nouvelle photo
    verdict    : str       — ex: "🔴 Aggravation nette"
    cnn_label  : str       — ex: "psoriasis" (depuis skin_images.cnn_label)
    alpha      : float     — opacité overlay
    """
    # ── Mode couleur selon verdict ────────────────────────────────
    v = _normalize(verdict)
    print(f"[overlay] verdict='{verdict}' | cnn_label='{cnn_label}'")

    if any(k in v for k in ["aggrav", "empire"]):
        mode         = "aggravation"
        COLOR_BGR    = np.array([40, 50, 220], np.float32)
        CIRCLE_COLOR = (40, 50, 220)
    elif any(k in v for k in ["amelior"]):
        mode         = "amelioration"
        COLOR_BGR    = np.array([40, 200, 60], np.float32)
        CIRCLE_COLOR = (40, 200, 60)
    else:
        print("[overlay] stable — image originale")
        return _encode(_load_bgr(new_source))

    # ── Critère adaptatif selon la maladie ────────────────────────
    label    = _normalize(cnn_label)
    criteria = DISEASE_CRITERIA.get(label, "color")   # défaut : color ΔE
    print(f"[overlay] mode={mode} | criteria={criteria} (label='{label}')")

    # ── Charger et aligner ────────────────────────────────────────
    bgr_ref = _load_bgr(ref_source)
    bgr_new = _load_bgr(new_source)
    h, w    = bgr_new.shape[:2]
    bgr_ref = cv2.resize(bgr_ref, (w, h))

    # ── Carte de delta selon le critère ──────────────────────────
    delta = _compute_delta_map(bgr_ref, bgr_new, criteria)

    # ── Zone à highlighter ────────────────────────────────────────
    if mode == "aggravation":
        # Zones où le critère a le plus augmenté
        thr       = np.percentile(delta, 75)
        zone_mask = delta > thr
    else:
        # Zones où le critère a le plus diminué
        thr       = np.percentile(delta, 25)
        zone_mask = delta < thr

    print(f"[overlay] zone = {zone_mask.sum()} px | seuil = {thr:.3f}")

    # ── Colorier ──────────────────────────────────────────────────
    overlay = bgr_new.copy().astype(np.float32)
    overlay[zone_mask] = overlay[zone_mask] * (1 - alpha) + COLOR_BGR * alpha
    overlay = np.clip(overlay, 0, 255).astype(np.uint8)

    # ── Cercles sur les zones regroupées ─────────────────────────
    k        = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20))
    zone_bin = zone_mask.astype(np.uint8) * 255
    zone_bin = cv2.morphologyEx(zone_bin, cv2.MORPH_CLOSE, k)
    zone_bin = cv2.morphologyEx(zone_bin, cv2.MORPH_OPEN,  k)

    contours, _ = cv2.findContours(zone_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area    = h * w * 0.003
    valid       = sorted(
        [c for c in contours if cv2.contourArea(c) > min_area],
        key=cv2.contourArea, reverse=True
    )[:4]

    print(f"[overlay] {len(valid)} cercles sur {len(contours)} contours")

    for cnt in valid:
        (cx, cy), radius = cv2.minEnclosingCircle(cnt)
        radius = min(int(radius) + 10, min(h, w) // 3)
        cv2.circle(overlay, (int(cx), int(cy)), radius, CIRCLE_COLOR, 3)
        cv2.circle(overlay, (int(cx), int(cy)), 6,      CIRCLE_COLOR, -1)

    return _encode(overlay)