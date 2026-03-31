from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.consultation import Consultation
from app.core.security import get_current_user, get_doctor_role
from app.schemas.consultation import ConsultationResponse, ConsultationCreate, ConsultationUpdate, ConsultationDetail
from app.services.consultation_service import ConsultationService
from typing import List

router = APIRouter(prefix="/consultations", tags=["Consultations"])


@router.post("", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
def create_consultation(
    consultation_data: ConsultationCreate,
    current_user: dict = Depends(get_doctor_role),
    db: Session = Depends(get_db)
):
    """Créer une nouvelle consultation."""
    doctor_id = current_user["user_id"]
    return ConsultationService.create_consultation(db, consultation_data.patient_id, doctor_id)


@router.get("/{consultation_id}", response_model=ConsultationDetail)
def get_consultation(
    consultation_id: str,
    current_user: dict = Depends(get_doctor_role),
    db: Session = Depends(get_db)
):
    """Récupérer les détails complets d'une consultation."""
    doctor_id = current_user["user_id"]
    return ConsultationService.get_consultation(db, consultation_id, doctor_id)


@router.get("", response_model=List[ConsultationResponse], tags=["Consultations"])
def get_all_consultations(
    current_user: dict = Depends(get_doctor_role),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les consultations du docteur."""
    doctor_id = current_user["user_id"]
    return db.query(Consultation).filter(
        Consultation.doctor_id == doctor_id
    ).order_by(Consultation.date.desc()).all()


@router.get("/by-patient/{patient_id}", response_model=List[ConsultationResponse])
def get_patient_consultations(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer l'historique des consultations d'un patient."""
    return ConsultationService.get_patient_consultations(db, patient_id, current_user["user_id"])


@router.patch("/{consultation_id}/notes")
def update_consultation_notes(
    consultation_id: str,
    data: dict,
    current_user: dict = Depends(get_doctor_role),
    db: Session = Depends(get_db)
):
    """Ajouter ou modifier les notes cliniques d'une consultation."""
    doctor_id = current_user["user_id"]
    notes = data.get("notes", "")
    return ConsultationService.update_consultation_notes(db, consultation_id, notes, doctor_id)
