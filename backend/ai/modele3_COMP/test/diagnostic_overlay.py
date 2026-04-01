"""
diagnostic_overlay.py
Lance ce script dans ton dossier modele3_COMP pour comprendre pourquoi
les cercles n'apparaissent pas.

Usage:
    python diagnostic_overlay.py image_ref.png image_new.png
"""

import sys
import cv2
import numpy as np
from PIL import Image
from pathlib import Path

def diagnose(ref_path, new_path):
    print("=" * 60)
    print("DIAGNOSTIC OVERLAY")
    print("=" * 60)

    # ── Charger ───────────────────────────────────────────────────
    bgr_ref = cv2.imread(ref_path)
    bgr_new = cv2.imread(new_path)

    if bgr_ref is None or bgr_new is None:
        print("❌ Impossible de charger les images")
        return

    h, w = bgr_new.shape[:2]
    bgr_ref = cv2.resize(bgr_ref, (w, h))

    print(f"✅ Images chargées : {w}x{h}px")
    print(f"   Surface totale : {w*h} pixels")
    print(f"   Seuil 0.5%    : {int(w*h*0.005)} pixels")

    # ── Delta LAB ─────────────────────────────────────────────────
    lab_ref = cv2.cvtColor(bgr_ref, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab_new = cv2.cvtColor(bgr_new, cv2.COLOR_BGR2LAB).astype(np.float32)

    dL = lab_new[:,:,0] - lab_ref[:,:,0]
    da = lab_new[:,:,1] - lab_ref[:,:,1]
    combined = 0.4 * dL + 0.6 * da
    max_abs = np.abs(combined).max() + 1e-8
    delta_norm = combined / max_abs

    print(f"\n── Delta LAB ─────────────────────────────────────────")
    print(f"   dL  min/max : {dL.min():.2f} / {dL.max():.2f}")
    print(f"   da  min/max : {da.min():.2f} / {da.max():.2f}")
    print(f"   delta_norm  : {delta_norm.min():.3f} / {delta_norm.max():.3f}")

    p80 = np.percentile(delta_norm, 80)
    p20 = np.percentile(delta_norm, 20)
    print(f"   p80 (seuil aggravation)  : {p80:.3f}")
    print(f"   p20 (seuil amélioration) : {p20:.3f}")

    agg_raw  = delta_norm > p80
    amel_raw = delta_norm < p20
    print(f"   pixels aggravation  : {agg_raw.sum()} ({agg_raw.mean()*100:.1f}%)")
    print(f"   pixels amélioration : {amel_raw.sum()} ({amel_raw.mean()*100:.1f}%)")

    # ── Sans masque EfficientNet ───────────────────────────────────
    print(f"\n── Contours SANS masque attention ────────────────────")
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    min_area = w * h * 0.005

    for name, mask in [("Aggravation", agg_raw), ("Amélioration", amel_raw)]:
        binary = (mask * 255).astype(np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid = [c for c in contours if cv2.contourArea(c) > min_area]
        print(f"   {name}: {len(contours)} contours totaux, {len(valid)} valides (area > {int(min_area)}px)")
        for i, c in enumerate(valid[:3]):
            (cx, cy), r = cv2.minEnclosingCircle(c)
            print(f"      Cercle {i+1}: centre=({int(cx)},{int(cy)}) rayon={int(r)}px area={int(cv2.contourArea(c))}px")

    # ── Sauvegarder l'image delta pour inspection visuelle ────────
    delta_vis = ((delta_norm + 1) / 2 * 255).astype(np.uint8)
    delta_color = cv2.applyColorMap(delta_vis, cv2.COLORMAP_RdYlGn)
    cv2.imwrite("debug_delta.jpg", delta_color)
    print(f"\n✅ Image delta sauvegardée → debug_delta.jpg")
    print("   (zones claires = aggravation, zones sombres = amélioration)")

    # ── Test overlay direct sans masque attention ─────────────────
    overlay = bgr_new.copy().astype(np.float32)
    overlay[agg_raw]  = overlay[agg_raw]  * 0.5 + np.array([40, 50, 220]) * 0.5
    overlay[amel_raw] = overlay[amel_raw] * 0.5 + np.array([60, 180, 50]) * 0.5
    overlay = np.clip(overlay, 0, 255).astype(np.uint8)

    # Dessiner les cercles sans masque attention
    for mask, color in [(agg_raw, (40, 50, 220)), (amel_raw, (60, 180, 50))]:
        binary = (mask * 255).astype(np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            if cv2.contourArea(cnt) > min_area:
                (cx, cy), r = cv2.minEnclosingCircle(cnt)
                cv2.circle(overlay, (int(cx), int(cy)), int(r)+12, color, 4)
                cv2.circle(overlay, (int(cx), int(cy)), 6, color, -1)

    cv2.imwrite("debug_overlay.jpg", overlay)
    print("✅ Overlay test sauvegardé → debug_overlay.jpg")
    print("\nOuvre debug_overlay.jpg — si tu vois des cercles, le problème")
    print("était le masque EfficientNet. Sinon, les images sont trop similaires.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python diagnostic_overlay.py ref.png new.png")
        sys.exit(1)
    diagnose(sys.argv[1], sys.argv[2])