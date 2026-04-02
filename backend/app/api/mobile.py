"""
Mobile App API endpoints for fetching patient data
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.consultation import Consultation
from app.models.patient_advice import PatientAdvice
from app.models.checkin import CheckIn
from typing import List, Dict, Any

router = APIRouter(prefix="/mobile", tags=["Mobile App"])


@router.get("/patient/profile")
def get_patient_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Récupérer le profil complet du patient connecté"""
    
    user_id = current_user.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    return {
        "id": str(patient.id),
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "is_premium": user.is_premium,
            "created_at": user.created_at.isoformat()
        },
        "full_name": patient.full_name,
        "age": patient.age,
        "phone": patient.phone,
        "birth_date": str(patient.birth_date) if patient.birth_date else None,
        "fitzpatrick_type": patient.fitzpatrick_type.value if patient.fitzpatrick_type else None,
        "city": patient.city.value if patient.city else None,
        "medical_history": patient.medical_history,
        "created_at": patient.created_at.isoformat() if patient.created_at else None
    }


@router.get("/patient/consultations")
def get_patient_consultations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Récupérer l'historique des consultations du patient"""
    
    user_id = current_user.get("sub")
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    consultations = db.query(Consultation).filter(Consultation.patient_id == patient.id).all()
    
    result = []
    for consultation in consultations:
        doctor = db.query(User).filter(User.id == consultation.doctor_id).first() if consultation.doctor_id else None
        
        result.append({
            "id": str(consultation.id),
            "consultation_id": consultation.consultation_id,
            "date": consultation.date.isoformat() if consultation.date else None,
            "doctor": {
                "full_name": doctor.full_name if doctor else "Unknown",
                "email": doctor.email if doctor else None
            } if doctor else None,
            "notes": consultation.notes,
            "status": consultation.status.value if consultation.status else None,
            "created_at": consultation.created_at.isoformat() if consultation.created_at else None
        })
    
    return result


@router.get("/patient/advice")
def get_patient_advice(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Récupérer les conseils et traitements recommandés du patient"""
    
    user_id = current_user.get("sub")
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    advice_records = db.query(PatientAdvice).filter(
        PatientAdvice.patient_id == patient.id,
        PatientAdvice.is_active == True
    ).all()
    
    result = []
    for advice in advice_records:
        consultation = db.query(Consultation).filter(Consultation.id == advice.consultation_id).first()
        
        result.append({
            "id": str(advice.id),
            "tips": advice.tips,
            "reminders": advice.reminders,
            "products_to_avoid": advice.products_to_avoid,
            "valid_until": str(advice.valid_until) if advice.valid_until else None,
            "consultation_id": str(consultation.consultation_id) if consultation else None,
            "created_at": advice.created_at.isoformat() if advice.created_at else None
        })
    
    return result


@router.get("/patient/checkins")
def get_patient_checkins(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Récupérer l'historique des check-ins du patient"""
    
    user_id = current_user.get("sub")
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    checkins = db.query(CheckIn).filter(CheckIn.patient_id == patient.id).order_by(CheckIn.date.desc()).all()
    
    result = []
    for checkin in checkins:
        result.append({
            "id": str(checkin.id),
            "skin_score": checkin.skin_score,
            "notes": checkin.notes,
            "photo_url": checkin.photo_url,
            "date": checkin.date.isoformat() if checkin.date else None,
            "created_at": checkin.created_at.isoformat() if checkin.created_at else None
        })
    
    return result
