# ================================================================
# MODULE 1 — SIMULÉ (remplacer par le vrai module quand il est prêt)
# ================================================================
# Pour remplacer : supprimer ce fichier et importer le vrai module
# dans compare.py à la ligne marquée "MODULE 1 IMPORT"
# ================================================================

import numpy as np
from PIL import Image

def get_severity_score(image_path: str) -> float:
    """
    Retourne un score de sévérité entre 0 et 1.
    0 = peau saine
    1 = très enflammée

    VERSION SIMULÉE — basée sur les pixels rouges.
    Remplacer par le CNN EfficientNet du Module 1.
    """
    img = Image.open(image_path).convert("RGB")
    img_array = np.array(img)

    R = img_array[:, :, 0].astype(float)
    G = img_array[:, :, 1].astype(float)
    B = img_array[:, :, 2].astype(float)

    # pixel rouge = R élevé, G et B faibles
    red_mask = (R > 150) & (G < 100) & (B < 100)
    score = red_mask.sum() / red_mask.size

    return round(float(score), 4)