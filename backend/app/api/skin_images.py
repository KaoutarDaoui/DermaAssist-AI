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


def _get_overlay_fn():
    module3_path = Path(__file__).resolve().parents[2] / "ai" / "modele3_COMP"
    if str(module3_path) not in sys.path:
        sys.path.insert(0, str(module3_path))
    from lesion_segmenter import generate_evolution_overlay
    return generate_evolution_overlay


# ════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════

@router.get("/{patient_id}/skin-images", response_model=List[SkinImageResponse])
def get_patient_skin_images(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db.query(SkinImage).filter(SkinImage.patient_id == patient_id).all()


@router.post("/{patient_id}/skin-images", response_model=SkinImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_skin_image(patient_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    last_image = db.query(SkinImage).filter(
        SkinImage.patient_id == patient_id
    ).order_by(desc(SkinImage.uploaded_at)).first()

    if last_image:
        diff = datetime.utcnow().replace(tzinfo=None) - last_image.uploaded_at.replace(tzinfo=None)
        if diff < timedelta(minutes=1):
            secs = int((timedelta(minutes=1) - diff).total_seconds())
            raise HTTPException(status_code=429, detail=f"Please wait {secs} more seconds before uploading another image")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        content = await file.read()
        skin_image = SkinImage(patient_id=patient_id, image_data=content, source=ImageSource.PATIENT)
        db.add(skin_image)
        db.commit()
        db.refresh(skin_image)
        return skin_image
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


@router.get("/{patient_id}/skin-images/{image_id}")
def get_skin_image(patient_id: str, image_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    image = db.query(SkinImage).filter(
        SkinImage.id == image_id, SkinImage.patient_id == patient_id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if not image.image_data:
        raise HTTPException(status_code=404, detail="Image data not found")
    b64 = base64.b64encode(image.image_data).decode("utf-8")
    return {
        "id": image.id, "patient_id": image.patient_id,
        "image_data": f"data:image/jpeg;base64,{b64}",
        "source": image.source, "uploaded_at": image.uploaded_at,
        "cnn_label": image.cnn_label, "cnn_confidence": image.cnn_confidence,
    }


@router.delete("/{patient_id}/skin-images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skin_image(patient_id: str, image_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    image = db.query(SkinImage).filter(
        SkinImage.id == image_id, SkinImage.patient_id == patient_id
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
    patient_id: str, image_ref_id: str, image_new_id: str,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    img_ref = db.query(SkinImage).filter(
        SkinImage.id == image_ref_id, SkinImage.patient_id == patient_id
    ).first()
    img_new = db.query(SkinImage).filter(
        SkinImage.id == image_new_id, SkinImage.patient_id == patient_id
    ).first()

    if not img_ref or not img_new:
        raise HTTPException(status_code=404, detail="Une ou deux images introuvables")
    if not img_ref.image_data or not img_new.image_data:
        raise HTTPException(status_code=404, detail="Données image manquantes")

    tmp_ref = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp_new = tempfile.NamedTemporaryFile(suffix=".png", delete=False)

    try:
        tmp_ref.write(bytes(img_ref.image_data)); tmp_ref.close()
        tmp_new.write(bytes(img_new.image_data)); tmp_new.close()

        module3_path = Path(__file__).resolve().parents[2] / "ai" / "modele3_COMP"
        if str(module3_path) not in sys.path:
            sys.path.insert(0, str(module3_path))

        from compare import get_embedding, compute_verdict
        from severity import get_severity_score
        import torch
        import torch.nn.functional as F

        fitzpatrick = "III"
        if patient.fitzpatrick_type:
            fitzpatrick = str(patient.fitzpatrick_type).replace("TYPE_", "")

        emb_ref    = get_embedding(tmp_ref.name)
        emb_new    = get_embedding(tmp_new.name)
        score_ref  = get_severity_score(tmp_ref.name, fitzpatrick=fitzpatrick)
        score_new  = get_severity_score(tmp_new.name, fitzpatrick=fitzpatrick)
        similarite = F.cosine_similarity(emb_ref.unsqueeze(0), emb_new.unsqueeze(0)).item()
        result     = compute_verdict(similarite, score_ref, score_new)

        # ── cnn_label depuis l'image de référence (diagnostic établi) ──
        cnn_label = img_ref.cnn_label or img_new.cnn_label or ""
        print(f"[compare] cnn_label='{cnn_label}'")

        # ── Overlay adaptatif ─────────────────────────────────────
        try:
            generate_overlay = _get_overlay_fn()
            overlay_b64 = generate_overlay(
                ref_source = tmp_ref.name,
                new_source = tmp_new.name,
                verdict    = result.get("verdict", ""),
                cnn_label  = cnn_label,
            )
        except Exception as ov_err:
            print(f"⚠️ Overlay failed: {ov_err}")
            import traceback; traceback.print_exc()
            overlay_b64 = None

        return {
            "patient_id":    patient_id,
            "image_ref_id":  image_ref_id,
            "image_new_id":  image_new_id,
            "fitzpatrick":   fitzpatrick,
            "cnn_label":     cnn_label,
            "overlay_image": overlay_b64,
            **result,
        }

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for tmp in (tmp_ref, tmp_new):
            try: os.unlink(tmp.name)
            except: pass