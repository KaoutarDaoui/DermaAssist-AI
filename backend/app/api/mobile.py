"""
Mobile App API endpoints for fetching patient data
"""
import base64
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.consultation import Consultation
from app.models.patient_advice import PatientAdvice
from app.models.checkin import CheckIn
from app.models.ai_result import AIResult
from app.models.skin_image import SkinImage
from typing import List, Dict, Any

router = APIRouter(prefix="/mobile", tags=["Mobile App"])


def _resolve_current_user_id(current_user: dict) -> str:
    """Resolve authenticated user id from token payload returned by get_current_user."""
    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id


def _normalize_treatment_options(treatment_options: Any) -> List[Any]:
    """Normalize ai_results.treatment_options to a list for robust parsing."""
    if not treatment_options:
        return []

    if isinstance(treatment_options, list):
        return treatment_options

    if isinstance(treatment_options, dict):
        for key in ("treatment_options", "medicaments_recommandes", "medications", "items", "options"):
            nested = treatment_options.get(key)
            if isinstance(nested, list):
                return nested
        return [treatment_options]

    if isinstance(treatment_options, str):
        return [treatment_options]

    return []


def _extract_medication_fields(option: Any) -> Dict[str, Any]:
    """Extract common medication fields from a treatment option object."""
    if isinstance(option, str):
        return {
            "name": option,
            "drug_class": None,
            "indication": None,
            "dosage": None,
            "status": "propose",
        }

    if not isinstance(option, dict):
        return {}

    return {
        "name": option.get("nom") or option.get("name") or option.get("medicament") or option.get("medication"),
        "drug_class": option.get("classe") or option.get("class"),
        "indication": option.get("indication") or option.get("usage") or option.get("description"),
        "dosage": option.get("posologie") or option.get("dosage") or option.get("dose"),
        "status": option.get("status") or "propose",
    }


def _serialize_skin_photo(skin_image: SkinImage) -> Dict[str, Any]:
    """Serialize skin image with either URL or base64 data URI."""
    if not skin_image:
        return {
            "image_url": None,
            "image_data": None,
            "source": None,
            "uploaded_at": None,
        }

    image_data = None
    if skin_image.image_data:
        encoded_image = base64.b64encode(skin_image.image_data).decode("utf-8")
        image_data = f"data:image/jpeg;base64,{encoded_image}"

    source = skin_image.source.value if skin_image.source else None

    return {
        "image_url": skin_image.minio_url,
        "image_data": image_data,
        "source": source,
        "uploaded_at": skin_image.uploaded_at.isoformat() if skin_image.uploaded_at else None,
    }


@router.get("/patient/profile")
def get_patient_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Récupérer le profil complet du patient connecté"""
    
    user_id = _resolve_current_user_id(current_user)
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
    
    user_id = _resolve_current_user_id(current_user)
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
    
    user_id = _resolve_current_user_id(current_user)
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


@router.get("/patient/ai-results-history")
def get_patient_ai_results_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Récupérer l'historique AI du patient (format proche du site web)."""

    user_id = _resolve_current_user_id(current_user)
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    ai_results = (
        db.query(AIResult)
        .filter(AIResult.patient_id == patient.id)
        .order_by(AIResult.generated_at.desc())
        .all()
    )

    return [
        {
            "id": str(result.id),
            "patient_id": str(result.patient_id),
            "consultation_id": result.consultation_id,
            "diagnosis": result.diagnosis,
            "confidence": result.confidence,
            "generated_at": result.generated_at.isoformat() if result.generated_at else None,
        }
        for result in ai_results
    ]


@router.get("/patient/ai-results/{ai_result_id}")
def get_patient_ai_result_details(
    ai_result_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Récupérer les détails d'une consultation AI (diagnostic, traitement, photo)."""

    user_id = _resolve_current_user_id(current_user)
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        ai_result_uuid = uuid.UUID(ai_result_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid ai_result_id") from exc

    ai_result = (
        db.query(AIResult)
        .filter(AIResult.id == ai_result_uuid, AIResult.patient_id == patient.id)
        .first()
    )

    if not ai_result:
        raise HTTPException(status_code=404, detail="AI result not found")

    medications: List[Dict[str, Any]] = []
    options = _normalize_treatment_options(ai_result.treatment_options)
    for option in options:
        parsed = _extract_medication_fields(option)
        name = str(parsed.get("name") or "").strip()
        if not name:
            continue

        medications.append({
            "name": name,
            "drug_class": parsed.get("drug_class"),
            "indication": parsed.get("indication"),
            "dosage": parsed.get("dosage"),
            "status": parsed.get("status") or "propose",
        })

    skin_image = None
    if ai_result.skin_image_id:
        skin_image = db.query(SkinImage).filter(SkinImage.id == ai_result.skin_image_id).first()

    if not skin_image and ai_result.consultation_id:
        consultation = (
            db.query(Consultation)
            .filter(Consultation.consultation_id == ai_result.consultation_id)
            .first()
        )
        if consultation:
            skin_image = (
                db.query(SkinImage)
                .filter(SkinImage.consultation_id == consultation.id)
                .order_by(SkinImage.uploaded_at.desc())
                .first()
            )

    return {
        "id": str(ai_result.id),
        "consultation_id": ai_result.consultation_id,
        "diagnosis": ai_result.diagnosis,
        "confidence": ai_result.confidence,
        "generated_at": ai_result.generated_at.isoformat() if ai_result.generated_at else None,
        "medications": medications,
        "skin_photo": _serialize_skin_photo(skin_image),
    }


@router.get("/patient/ai-medications")
def get_patient_ai_medications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Récupérer les médicaments proposés depuis ai_results.treatment_options."""

    user_id = _resolve_current_user_id(current_user)
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    ai_results = (
        db.query(AIResult)
        .filter(AIResult.patient_id == patient.id)
        .order_by(AIResult.generated_at.desc())
        .all()
    )

    medications: List[Dict[str, Any]] = []
    seen = set()

    for ai_result in ai_results:
        options = _normalize_treatment_options(ai_result.treatment_options)
        for option in options:
            parsed = _extract_medication_fields(option)
            name = str(parsed.get("name") or "").strip()
            if not name:
                continue

            dedupe_key = (name.lower(), str(parsed.get("dosage") or "").strip().lower())
            if dedupe_key in seen:
                continue

            seen.add(dedupe_key)
            medications.append({
                "id": f"{ai_result.id}-{len(medications)}",
                "ai_result_id": str(ai_result.id),
                "consultation_id": ai_result.consultation_id,
                "name": name,
                "drug_class": parsed.get("drug_class"),
                "indication": parsed.get("indication"),
                "dosage": parsed.get("dosage"),
                "status": parsed.get("status") or "propose",
                "recommended_by": "Médecin",
                "recommended_at": ai_result.generated_at.isoformat() if ai_result.generated_at else None,
            })

    return medications


@router.get("/patient/checkins")
def get_patient_checkins(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Récupérer l'historique des check-ins du patient"""
    
    user_id = _resolve_current_user_id(current_user)
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
