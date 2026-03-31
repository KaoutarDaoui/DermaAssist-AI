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

router = APIRouter(prefix="/patients", tags=["Skin Images"])


@router.get("/{patient_id}/skin-images", response_model=List[SkinImageResponse])
def get_patient_skin_images(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer toutes les images de peau d'un patient."""
    # Vérifier que le patient existe
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Récupérer les images
    images = db.query(SkinImage).filter(SkinImage.patient_id == patient_id).all()
    return images


@router.post("/{patient_id}/skin-images", response_model=SkinImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_skin_image(
    patient_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uploader une nouvelle image de peau pour un patient."""
    # Vérifier que le patient existe
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Vérifier la limite de temps entre les uploads (1 minute)
    last_image = db.query(SkinImage).filter(
        SkinImage.patient_id == patient_id
    ).order_by(desc(SkinImage.uploaded_at)).first()
    
    if last_image:
        time_since_last_upload = datetime.utcnow().replace(tzinfo=None) - last_image.uploaded_at.replace(tzinfo=None)
        if time_since_last_upload < timedelta(minutes=1):
            seconds_remaining = int((timedelta(minutes=1) - time_since_last_upload).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {seconds_remaining} more seconds before uploading another image"
            )
    
    # Vérifier que c'est une image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Lire le fichier en bytes
        file_content = await file.read()
        
        # Créer l'enregistrement dans la base de données
        skin_image = SkinImage(
            patient_id=patient_id,
            image_data=file_content,  # Stocker les bytes directement dans la BD
            source=ImageSource.PATIENT
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
    # Vérifier que le patient existe
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Récupérer l'image
    image = db.query(SkinImage).filter(
        SkinImage.id == image_id,
        SkinImage.patient_id == patient_id
    ).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if not image.image_data:
        raise HTTPException(status_code=404, detail="Image data not found")
    
    # Convertir les données binaires en base64
    image_base64 = base64.b64encode(image.image_data).decode("utf-8")
    
    return {
        "id": image.id,
        "patient_id": image.patient_id,
        "image_data": f"data:image/jpeg;base64,{image_base64}",
        "source": image.source,
        "uploaded_at": image.uploaded_at,
        "cnn_label": image.cnn_label,
        "cnn_confidence": image.cnn_confidence
    }


@router.delete("/{patient_id}/skin-images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skin_image(
    patient_id: str,
    image_id: str,
    db: Session = Depends(get_db)
):
    """Supprimer une image de peau."""
    # Vérifier que le patient existe
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Récupérer l'image
    image = db.query(SkinImage).filter(
        SkinImage.id == image_id,
        SkinImage.patient_id == patient_id
    ).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Supprimer l'enregistrement de la base de données
        db.delete(image)
        db.commit()
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting image: {str(e)}")


@router.get("/{patient_id}/skin-images/{image_id}", response_model=SkinImageResponse)
def get_skin_image(
    patient_id: str,
    image_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer les détails d'une image de peau."""
    # Vérifier que le patient existe
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Récupérer l'image
    image = db.query(SkinImage).filter(
        SkinImage.id == image_id,
        SkinImage.patient_id == patient_id
    ).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return image
