from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.patient import Patient
from app.models.user import User
from fastapi import HTTPException, status
from uuid import UUID


class PatientService:
    """Service pour la gestion des dossiers patients."""

    @staticmethod
    def get_patient_by_user_id(db: Session, user_id: str) -> Patient:
        """Récupérer le profil patient d'un utilisateur."""
        patient = db.query(Patient).filter(Patient.user_id == user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found"
            )
        return patient

    @staticmethod
    def get_doctor_patients(db: Session, doctor_id: str) -> list:
        """Récupérer tous les patients d'un médecin."""
        return db.query(Patient).filter(Patient.doctor_id == doctor_id).all()

    @staticmethod
    def get_all_patients(db: Session) -> list:
        """Récupérer tous les patients (pour le dashboard)."""
        return db.query(Patient).all()

    @staticmethod
    def get_patient_details(db: Session, patient_id: str, doctor_id: str = None) -> Patient:
        """Récupérer les détails complets d'un patient."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        return patient

    @staticmethod
    def create_patient(db: Session, doctor_id: str, patient_data: dict) -> Patient:
        """Créer un nouveau dossier patient (par un médecin)."""
        # Vérifier que le médecin existe
        from app.models.doctor import Doctor
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        patient = Patient(
            doctor_id=doctor_id,
            **patient_data
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient

    @staticmethod
    def create_patient_with_user(db: Session, patient_data: dict, doctor_id: str = None) -> Patient:
        """Créer un patient avec un utilisateur associé."""
        from app.core.security import hash_password
        from datetime import date
        
        # Créer l'utilisateur d'abord
        user_data = {
            "email": patient_data.get("email"),
            "full_name": patient_data.get("name"),
            "password_hash": hash_password(patient_data.get("password", "DermaAssist@2026")),
            "role": "patient"
        }
        
        # Vérifier que l'email n'existe pas déjà
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        
        user = User(**user_data)
        db.add(user)
        db.flush()  # Pour obtenir l'ID du user
        
        # Calculate age from birth_date if provided
        birth_date_str = patient_data.get("birth_date")
        age = None
        birth_date_obj = None
        if birth_date_str:
            try:
                birth_date_obj = date.fromisoformat(birth_date_str) if isinstance(birth_date_str, str) else birth_date_str
                today = date.today()
                age = today.year - birth_date_obj.year
                if today.month < birth_date_obj.month or (today.month == birth_date_obj.month and today.day < birth_date_obj.day):
                    age -= 1
            except:
                birth_date_obj = None
                age = None
        
        # Créer le patient
        patient = Patient(
            user_id=user.id,
            doctor_id=doctor_id,
            full_name=patient_data.get("name"),
            birth_date=birth_date_obj,  # Use date object, not string
            age=age,
            phone=patient_data.get("phone"),
            fitzpatrick_type=patient_data.get("fitzpatrick_type", "TYPE_IV"),
            city=patient_data.get("city"),  
            medical_history=patient_data.get("medical_history")
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient

    @staticmethod
    def update_patient(db: Session, patient_id: str, patient_data: dict) -> Patient:
        """Mettre à jour les informations d'un patient."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        for key, value in patient_data.items():
            if value is not None:
                setattr(patient, key, value)
        
        db.commit()
        db.refresh(patient)
        return patient
