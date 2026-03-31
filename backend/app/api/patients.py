from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user, get_doctor_role, get_patient_role
from app.schemas.patient import PatientResponse, PatientCreate, PatientUpdate, PatientSelf
from app.services.patient_service import PatientService
from app.models.user import User
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/patients", tags=["Patients"])


class PatientCreateSimplified(BaseModel):
    """Schéma simplifié pour créer un patient avec user automatique."""
    name: str
    email: str
    password: str = "DermaAssist@2026"
    phone: str = None
    birth_date: str = None
    fitzpatrick_type: str = "IV"
    city: str = None
    medical_history: str = None


@router.get("")
def list_patients(
    db: Session = Depends(get_db)
):
    """Récupérer tous les patients avec infos utilisateur."""
    from app.models.patient import Patient
    patients = db.query(Patient).all()
    
    result = []
    for patient in patients:
        user = db.query(User).filter(User.id == patient.user_id).first()
        patient_dict = {
            "id": str(patient.id),
            "user_id": str(patient.user_id),
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
            } if user else None,
            "full_name": patient.full_name,
            "age": patient.age,
            "phone": patient.phone,
            "birth_date": str(patient.birth_date) if patient.birth_date else None,
            "fitzpatrick_type": patient.fitzpatrick_type.value if patient.fitzpatrick_type else None,
            "city": patient.city.value if patient.city else None,
            "medical_history": patient.medical_history,
            "doctor_id": str(patient.doctor_id) if patient.doctor_id else None,
            "created_at": patient.created_at.isoformat() if patient.created_at else None
        }
        result.append(patient_dict)
    
    return result


@router.post("/create-simple")
def create_patient_simple(
    patient_data: PatientCreateSimplified,
    db: Session = Depends(get_db)
):
    """Créer un nouveau patient avec un utilisateur automatiquement."""
    try:
        print(f"Received patient data: {patient_data.dict()}")
        
        # Convert fitzpatrick_type if needed (add TYPE_ prefix if not present)
        data_dict = patient_data.dict()
        if data_dict.get("fitzpatrick_type") and not data_dict["fitzpatrick_type"].startswith("TYPE_"):
            data_dict["fitzpatrick_type"] = f"TYPE_{data_dict['fitzpatrick_type']}"
        
        patient = PatientService.create_patient_with_user(db, data_dict)
        
        # Return patient with user info
        user = db.query(User).filter(User.id == patient.user_id).first()
        return {
            "id": str(patient.id),
            "user_id": str(patient.user_id),
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
            } if user else None,
            "full_name": patient.full_name,
            "age": patient.age,
            "phone": patient.phone,
            "birth_date": str(patient.birth_date) if patient.birth_date else None,
            "fitzpatrick_type": patient.fitzpatrick_type.value if patient.fitzpatrick_type else None,
            "city": patient.city.value if patient.city else None,
            "medical_history": patient.medical_history,
            "doctor_id": str(patient.doctor_id) if patient.doctor_id else None,
            "created_at": patient.created_at.isoformat() if patient.created_at else None
        }
    except Exception as e:
        import traceback
        error_msg = str(e)
        tb = traceback.format_exc()
        print(f"\n=== ERROR CREATING PATIENT ===")
        print(f"Error message: {error_msg}")
        print(f"Full traceback:\n{tb}")
        print(f"=== END ERROR ===\n")
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg if error_msg else "Unknown error occurred"
        )


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_data: PatientCreate,
    current_user: dict = Depends(get_doctor_role),
    db: Session = Depends(get_db)
):
    """Créer un nouveau dossier patient."""
    doctor_id = current_user["user_id"]
    return PatientService.create_patient(db, doctor_id, patient_data.dict())


@router.get("/me", response_model=PatientSelf)
def get_current_patient(
    current_user: dict = Depends(get_patient_role),
    db: Session = Depends(get_db)
):
    """Récupérer son propre profil patient."""
    user_id = current_user["user_id"]
    return PatientService.get_patient_by_user_id(db, user_id)


@router.get("/{patient_id}")
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer le dossier complet d'un patient."""
    patient = PatientService.get_patient_details(db, patient_id, None)
    
    user = db.query(User).filter(User.id == patient.user_id).first()
    patient_dict = {
        "id": str(patient.id),
        "user_id": str(patient.user_id),
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name
        } if user else None,
        "full_name": patient.full_name,
        "age": patient.age,
        "phone": patient.phone,
        "birth_date": str(patient.birth_date) if patient.birth_date else None,
        "fitzpatrick_type": patient.fitzpatrick_type.value if patient.fitzpatrick_type else None,
        "city": patient.city.value if patient.city else None,
        "medical_history": patient.medical_history,
        "doctor_id": str(patient.doctor_id) if patient.doctor_id else None,
        "created_at": patient.created_at.isoformat() if patient.created_at else None
    }
    return patient_dict


@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: str,
    patient_data: PatientUpdate,
    current_user: dict = Depends(get_doctor_role),
    db: Session = Depends(get_db)
):
    """Mettre à jour les informations d'un patient."""
    # Vérifier l'accès
    PatientService.get_patient_details(db, patient_id, current_user["user_id"])
    return PatientService.update_patient(db, patient_id, patient_data.dict(exclude_unset=True))


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Supprimer un patient et son utilisateur associé."""
    try:
        from app.models.patient import Patient
        from uuid import UUID
        
        print(f"Attempting to delete patient: {patient_id}")
        
        # Convert string to UUID
        patient_uuid = UUID(patient_id)
        
        # Get the patient with explicit session loading
        patient = db.query(Patient).filter(Patient.id == patient_uuid).first()
        if not patient:
            print(f"Patient not found: {patient_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        user_id = patient.user_id
        print(f"Found patient: {patient.id}, user_id: {user_id}")
        
        # Delete the patient FIRST
        print("Deleting patient...")
        db.delete(patient)
        db.flush()  # Flush to ensure patient is deleted before user
        print("Patient deleted and flushed")
        
        # THEN delete the associated user
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            print(f"Found user: {user.id}, deleting...")
            db.delete(user)
            db.flush()
            print("User deleted and flushed")
        
        # Finally commit
        db.commit()
        print(f"Changes committed successfully")
        return {"message": "Patient deleted successfully", "id": patient_id}
        
    except Exception as e:
        db.rollback()
        import traceback
        tb = traceback.format_exc()
        print(f"\n=== ERROR DELETING PATIENT ===")
        print(f"Patient ID: {patient_id}")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"Traceback:\n{tb}")
        print(f"=== END ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e) if str(e) else "Failed to delete patient"
        )


@router.patch("/{patient_id}/update-simple")
def update_patient_simple(
    patient_id: str,
    patient_data: PatientCreateSimplified,
    db: Session = Depends(get_db)
):
    """Mettre à jour les informations d'un patient (version simplifiée)."""
    try:
        from app.models.patient import Patient
        from uuid import UUID
        from datetime import date
        
        print(f"Attempting to update patient: {patient_id}")
        print(f"Data received: {patient_data.dict()}")
        
        # Convert string to UUID
        patient_uuid = UUID(patient_id)
        
        # Get the patient
        patient = db.query(Patient).filter(Patient.id == patient_uuid).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Prepare update data
        data_dict = patient_data.dict()
        
        # Handle birth_date conversion
        if data_dict.get("birth_date"):
            try:
                birth_date_obj = date.fromisoformat(data_dict["birth_date"])
                data_dict["birth_date"] = birth_date_obj
                # Calculate age from birth_date
                today = date.today()
                age = today.year - birth_date_obj.year
                if today.month < birth_date_obj.month or (
                    today.month == birth_date_obj.month and today.day < birth_date_obj.day
                ):
                    age -= 1
                data_dict["age"] = age if age >= 0 else None
            except Exception as e:
                print(f"Date conversion error: {e}")
                data_dict["birth_date"] = None
        
        # Handle fitzpatrick_type conversion
        if data_dict.get("fitzpatrick_type") and not data_dict["fitzpatrick_type"].startswith("TYPE_"):
            data_dict["fitzpatrick_type"] = f"TYPE_{data_dict['fitzpatrick_type']}"
        
        # Update patient fields
        for key, value in data_dict.items():
            if value is not None and key != "password":  # Don't update password via this endpoint
                setattr(patient, key, value)
        
        # Update user full_name if provided
        if data_dict.get("name"):
            user = db.query(User).filter(User.id == patient.user_id).first()
            if user:
                user.full_name = data_dict["name"]
        
        db.commit()
        db.refresh(patient)
        
        # Return patient with user info
        user = db.query(User).filter(User.id == patient.user_id).first()
        return {
            "id": str(patient.id),
            "user_id": str(patient.user_id),
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
            } if user else None,
            "full_name": patient.full_name,
            "age": patient.age,
            "phone": patient.phone,
            "birth_date": str(patient.birth_date) if patient.birth_date else None,
            "fitzpatrick_type": str(patient.fitzpatrick_type),
            "city": str(patient.city),
            "medical_history": patient.medical_history,
            "doctor_id": str(patient.doctor_id) if patient.doctor_id else None,
            "created_at": patient.created_at.isoformat() if patient.created_at else None
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = str(e)
        tb = traceback.format_exc()
        print(f"\n=== ERROR UPDATING PATIENT ===")
        print(f"Error message: {error_msg}")
        print(f"Full traceback:\n{tb}")
        print(f"=== END ERROR ===\n")
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg if error_msg else "Unknown error occurred"
        )
