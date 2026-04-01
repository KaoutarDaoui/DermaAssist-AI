from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.skin_image import SkinImage, ImageSource
from app.models.patient import Patient
from app.schemas.skin_image import SkinImageCreate, SkinImageResponse
from typing import List
import base64
from datetime import datetime, timedelta
from sqlalchemy import desc
import sys
import tempfile
import os
from pathlib import Path

router = APIRouter(prefix="/patients", tags=["Skin Images"])


# ════════════════════════════════════════════════════════════════
# HELPER — Génération overlay coloré (Grad-CAM like)
# Jamais stocké — retourne uniquement du base64
# ════════════════════════════════════════════════════════════════

def generate_evolution_overlay(
    ref_source,
    new_source,
    alpha: float = 0.45,
    threshold: float = 0.3,
    min_zone_area: int = 200,
) -> str:
    """
    Génère une image base64 avec overlay coloré montrant :
      - Cercles ROUGES  → zones d'aggravation (activation EfficientNet augmentée)
      - Cercles VERTS   → zones d'amélioration (activation EfficientNet diminuée)

    Paramètres
    ----------
    ref_source   : chemin str ou bytes de l'image de référence
    new_source   : chemin str ou bytes de la nouvelle image
    alpha        : opacité de l'overlay coloré (0.0 → 1.0)
    threshold    : seuil delta normalisé pour considérer une zone comme changée
    min_zone_area: surface minimale en pixels pour dessiner un cercle

    Retourne
    --------
    str : data URI base64 "data:image/jpeg;base64,..."
    """
    import cv2
    import numpy as np
    import io
    from PIL import Image
    import torch

    # ── Import du modèle Module 3 ─────────────────────────────────
    module3_path = Path(__file__).resolve().parents[2] / "ai" / "modele3_COMP"
    if str(module3_path) not in sys.path:
        sys.path.insert(0, str(module3_path))

    from compare import model, transform  # réutilise le modèle déjà chargé

    # ── Charger les images en numpy RGB ──────────────────────────
    def load_rgb(src) -> np.ndarray:
        if isinstance(src, (bytes, bytearray)):
            return np.array(Image.open(io.BytesIO(src)).convert("RGB"))
        return np.array(Image.open(src).convert("RGB"))

    img_ref = load_rgb(ref_source)
    img_new = load_rgb(new_source)

    # ── Aligner les tailles ───────────────────────────────────────
    h, w = img_new.shape[:2]
    img_ref_r = cv2.resize(img_ref, (w, h))

    # ── Extraire feature maps 7×7 ─────────────────────────────────
    def get_feature_map(img_array: np.ndarray) -> np.ndarray:
        """Extrait la carte d'activation moyenne du dernier bloc EfficientNet."""
        pil = Image.fromarray(img_array)
        tensor = transform(pil).unsqueeze(0)
        with torch.no_grad():
            feat = model.features(tensor)   # (1, 1280, 7, 7)
        return feat[0].mean(dim=0).cpu().numpy()   # (7, 7)

    fmap_ref = get_feature_map(img_ref_r)
    fmap_new = get_feature_map(img_new)

    # ── Delta map normalisé ───────────────────────────────────────
    delta = fmap_new - fmap_ref
    max_abs = np.abs(delta).max() + 1e-8
    delta_norm = delta / max_abs

    # Upscale à la taille de l'image
    delta_up = cv2.resize(delta_norm, (w, h), interpolation=cv2.INTER_CUBIC)

    # ── Overlay coloré ────────────────────────────────────────────
    overlay = img_new.astype(np.float32)

    agg_mask  = delta_up >  threshold   # aggravation → rouge
    amel_mask = delta_up < -threshold   # amélioration → vert

    RED   = np.array([220, 50,  50],  dtype=np.float32)
    GREEN = np.array([50,  180, 80],  dtype=np.float32)

    overlay[agg_mask]  = overlay[agg_mask]  * (1 - alpha) + RED   * alpha
    overlay[amel_mask] = overlay[amel_mask] * (1 - alpha) + GREEN * alpha

    overlay = np.clip(overlay, 0, 255).astype(np.uint8)

    # ── Cercles autour des zones détectées ────────────────────────
    for binary_mask, circle_color in [
        ((agg_mask  * 255).astype(np.uint8), (220, 50,  50)),
        ((amel_mask * 255).astype(np.uint8), (50,  180, 80)),
    ]:
        contours, _ = cv2.findContours(
            binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        for cnt in contours:
            if cv2.contourArea(cnt) > min_zone_area:
                (cx, cy), radius = cv2.minEnclosingCircle(cnt)
                cv2.circle(
                    overlay,
                    (int(cx), int(cy)),
                    int(radius) + 8,
                    circle_color,
                    thickness=3,
                )

    # ── Encoder en base64 — jamais stocké ────────────────────────
    pil_out = Image.fromarray(overlay)
    buf = io.BytesIO()
    pil_out.save(buf, format="JPEG", quality=90)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return f"data:image/jpeg;base64,{b64}"


# ════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════

@router.get("/{patient_id}/skin-images", response_model=List[SkinImageResponse])
def get_patient_skin_images(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer toutes les images de peau d'un patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    images = db.query(SkinImage).filter(SkinImage.patient_id == patient_id).all()
    return images


@router.post("/{patient_id}/skin-images", response_model=SkinImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_skin_image(
    patient_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uploader une nouvelle image de peau pour un patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    last_image = db.query(SkinImage).filter(
        SkinImage.patient_id == patient_id
    ).order_by(desc(SkinImage.uploaded_at)).first()

    if last_image:
        time_since_last_upload = (
            datetime.utcnow().replace(tzinfo=None)
            - last_image.uploaded_at.replace(tzinfo=None)
        )
        if time_since_last_upload < timedelta(minutes=1):
            seconds_remaining = int(
                (timedelta(minutes=1) - time_since_last_upload).total_seconds()
            )
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {seconds_remaining} more seconds before uploading another image",
            )

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        file_content = await file.read()
        skin_image = SkinImage(
            patient_id=patient_id,
            image_data=file_content,
            source=ImageSource.PATIENT,
        )
        db.add(skin_image)
        db.commit()
        db.refresh(skin_image)
        return skin_image

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


@router.get("/{patient_id}/skin-images/{image_id}")
def get_skin_image(
    patient_id: str,
    image_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer une image de peau en tant que base64."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    image = db.query(SkinImage).filter(
        SkinImage.id == image_id,
        SkinImage.patient_id == patient_id,
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if not image.image_data:
        raise HTTPException(status_code=404, detail="Image data not found")

    image_base64 = base64.b64encode(image.image_data).decode("utf-8")

    return {
        "id":             image.id,
        "patient_id":     image.patient_id,
        "image_data":     f"data:image/jpeg;base64,{image_base64}",
        "source":         image.source,
        "uploaded_at":    image.uploaded_at,
        "cnn_label":      image.cnn_label,
        "cnn_confidence": image.cnn_confidence,
    }


@router.delete("/{patient_id}/skin-images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skin_image(
    patient_id: str,
    image_id: str,
    db: Session = Depends(get_db)
):
    """Supprimer une image de peau."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    image = db.query(SkinImage).filter(
        SkinImage.id == image_id,
        SkinImage.patient_id == patient_id,
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        db.delete(image)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting image: {str(e)}")


@router.post("/{patient_id}/skin-images/compare")
async def compare_skin_images(
    patient_id: str,
    image_ref_id: str,
    image_new_id: str,
    db: Session = Depends(get_db)
):
    """
    Compare deux images de peau et retourne :
      - Le verdict (stable / amélioration / aggravation)
      - Les métriques (similarité cosine, delta sévérité)
      - overlay_image : base64 avec cercles rouges/verts sur la nouvelle photo
                        (jamais stocké en base)
    """
    # ── Patient ───────────────────────────────────────────────────
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # ── Images ───────────────────────────────────────────────────
    img_ref = db.query(SkinImage).filter(
        SkinImage.id == image_ref_id,
        SkinImage.patient_id == patient_id,
    ).first()
    img_new = db.query(SkinImage).filter(
        SkinImage.id == image_new_id,
        SkinImage.patient_id == patient_id,
    ).first()

    if not img_ref or not img_new:
        raise HTTPException(status_code=404, detail="Une ou deux images introuvables")
    if not img_ref.image_data or not img_new.image_data:
        raise HTTPException(status_code=404, detail="Données image manquantes")

    # ── Fichiers temporaires ──────────────────────────────────────
    tmp_ref = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp_new = tempfile.NamedTemporaryFile(suffix=".png", delete=False)

    try:
        tmp_ref.write(bytes(img_ref.image_data))
        tmp_ref.close()
        tmp_new.write(bytes(img_new.image_data))
        tmp_new.close()

        # ── Module 3 ──────────────────────────────────────────────
        module3_path = Path(__file__).resolve().parents[2] / "ai" / "modele3_COMP"
        if str(module3_path) not in sys.path:
            sys.path.insert(0, str(module3_path))

        from compare import get_embedding, compute_verdict
        from severity import get_severity_score
        import torch
        import torch.nn.functional as F

        # ── Fitzpatrick ───────────────────────────────────────────
        fitzpatrick = "III"
        if patient.fitzpatrick_type:
            fitzpatrick = str(patient.fitzpatrick_type).replace("TYPE_", "")

        # ── Embeddings + sévérité ─────────────────────────────────
        emb_ref = get_embedding(tmp_ref.name)
        emb_new = get_embedding(tmp_new.name)

        score_ref = get_severity_score(tmp_ref.name, fitzpatrick=fitzpatrick)
        score_new = get_severity_score(tmp_new.name, fitzpatrick=fitzpatrick)

        similarite = F.cosine_similarity(
            emb_ref.unsqueeze(0),
            emb_new.unsqueeze(0),
        ).item()

        result = compute_verdict(similarite, score_ref, score_new)

        # ── Overlay coloré (jamais stocké) ────────────────────────
        try:
            overlay_b64 = generate_evolution_overlay(
                ref_source=tmp_ref.name,
                new_source=tmp_new.name,
            )
        except Exception as overlay_err:
            print(f"⚠️  Overlay generation failed: {overlay_err}")
            overlay_b64 = None   # non bloquant — le verdict reste retourné

        return {
            "patient_id":    patient_id,
            "image_ref_id":  image_ref_id,
            "image_new_id":  image_new_id,
            "fitzpatrick":   fitzpatrick,
            "overlay_image": overlay_b64,
            **result,
        }

    except Exception as e:
        import traceback
        print("❌ ERREUR COMPARE:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for tmp in (tmp_ref, tmp_new):
            try:
                os.unlink(tmp.name)
            except Exception:
                pass