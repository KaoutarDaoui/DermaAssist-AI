import sys
sys.path.insert(0, '.')

# Import all models to register them
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.consultation import Consultation
from app.models.skin_image import SkinImage
from app.models.ai_result import AIResult
from app.models.patient_advice import PatientAdvice
from app.models.checkin import CheckIn
from app.models.rag_analysis import AIAnalysis, ClinicalQuestion, Treatment, Alert, KnowledgeChunk

from app.db.database import SessionLocal

db = SessionLocal()
try:
    patients = db.query(Patient).all()
    print(f"Found {len(patients)} patients")
    if len(patients) > 0:
        patient = patients[0]
        print(f"\nFirst Patient: {patient.full_name}")
        print(f"  sexe type: {type(patient.sexe)}, value: {repr(patient.sexe)}")
        print(f"  hypertension type: {type(patient.hypertension)}, value: {repr(patient.hypertension)}")
        # Try the string conversion
        try:
            sexe_str = str(patient.sexe).split(".")[-1] if patient.sexe else None
            print(f"  sexe converted: {sexe_str}")
            print(f"  str(sexe) = {str(patient.sexe)}")
        except Exception as e:
            print(f"  Error converting sexe: {e}")
    else:
        print("No patients in database")
finally:
    db.close()
