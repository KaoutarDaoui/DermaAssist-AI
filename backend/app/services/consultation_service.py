from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.consultation import Consultation, ConsultationStatus
from app.models.patient import Patient
from fastapi import HTTPException, status
from datetime import datetime


class ConsultationService:
    """Service pour la gestion des consultations."""

    @staticmethod
    def create_consultation(db: Session, patient_id: str, doctor_id: str) -> Consultation:
        """Créer une nouvelle consultation."""
        # Vérifier que le patient existe et appartient au médecin
        patient = db.query(Patient).filter(
            and_(
                Patient.id == patient_id,
                Patient.doctor_id == doctor_id
            )
        ).first()
        
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found or access denied"
            )
        
        consultation = Consultation(
            patient_id=patient_id,
            doctor_id=doctor_id,
            status=ConsultationStatus.OPEN
        )
        db.add(consultation)
        db.commit()
        db.refresh(consultation)
        return consultation

    @staticmethod
    def get_consultation(db: Session, consultation_id: str, doctor_id: str = None) -> Consultation:
        """Récupérer une consultation (optionnellement vérifier que le médecin y a accès)."""
        query = db.query(Consultation).filter(Consultation.id == consultation_id)
        
        if doctor_id:
            query = query.filter(Consultation.doctor_id == doctor_id)
        
        consultation = query.first()
        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation not found or access denied"
            )
        return consultation

    @staticmethod
    def get_patient_consultations(db: Session, patient_id: str, doctor_id: str) -> list:
        """Récupérer l'historique des consultations d'un patient."""
        return db.query(Consultation).filter(
            Consultation.patient_id == patient_id
        ).order_by(Consultation.date.desc()).all()

    @staticmethod
    def update_consultation_notes(db: Session, consultation_id: str, notes: str, doctor_id: str) -> Consultation:
        """Ajouter ou modifier les notes cliniques d'une consultation."""
        consultation = ConsultationService.get_consultation(db, consultation_id, doctor_id)
        consultation.notes = notes
        db.commit()
        db.refresh(consultation)
        return consultation

    @staticmethod
    def update_consultation_status(db: Session, consultation_id: str, status: ConsultationStatus) -> Consultation:
        """Mettre à jour l'état d'une consultation."""
        consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation not found"
            )
        consultation.status = status
        db.commit()
        db.refresh(consultation)
        return consultation
