from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.patient import Patient
from app.models.skin_image import SkinImage
from app.models.ai_result import AIResult
from app.models.consultation import Consultation, ConsultationStatus
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import json
import sys
from pathlib import Path
import importlib

# Load Module 1 CNN service from backend/ai
sys.path.append(str(Path(__file__).resolve().parents[2] / "ai"))

router = APIRouter(prefix="/patients", tags=["Analysis"])


class AnalysisRequest(BaseModel):
    """Request body for skin image analysis WITH metadata for CNN."""
    image_id: str
    age: Optional[int] = None  # Patient age (0-120)
    sex: Optional[str] = None  # Patient sex: male, female, unknown
    site: Optional[str] = None  # Body location: visage, cou, tronc, dos, bras, jambe, pied, unknown
    wilaya: Optional[str] = None  # Region: nord, sud, est, ouest
    saison: Optional[str] = None  # Season: printemps, ete, automne, hiver


class TestAnalysisRequest(BaseModel):
    """Request body for test analysis with generated CNN data."""
    image_id: str
    condition_name: Optional[str] = None  # e.g., "acne vulgaire"
    confidence: Optional[float] = None    # e.g., 0.88


class SuggestedQuestion(BaseModel):
    """Suggested question with selected option."""
    index: int
    question: str
    selected_option: str


class TreatmentOption(BaseModel):
    """Treatment option selected."""
    nom: str
    classe: str
    indication: str
    posologie: str


class AIResultCreateRequest(BaseModel):
    """Request body for creating an AI result record."""
    consultation_id: Optional[str] = None
    patient_id: str
    skin_image_id: Optional[str] = None
    diagnosis: str
    confidence: Optional[Dict[str, Any]] = None
    suggested_questions: Optional[List[SuggestedQuestion]] = None
    treatment_options: Optional[List[TreatmentOption]] = None
    env_snapshot: Optional[Dict[str, Any]] = None


class QuestionAnswerItem(BaseModel):
    """A clinical question with the patient's selected answer."""
    index: int
    question: str
    selected_option: str


class RefineAnalysisRequest(BaseModel):
    """Request body for refining analysis with patient question answers."""
    image_id: str
    question_answers: List[QuestionAnswerItem]
    age: Optional[int] = None
    sex: Optional[str] = None
    site: Optional[str] = None
    wilaya: Optional[str] = None
    saison: Optional[str] = None


@router.post("/{patient_id}/advanced-analysis")
async def advanced_analysis(
    patient_id: str,
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Run advanced RAG analysis from an already uploaded patient skin image.

    Flow:
    1) Load patient + image from DB
    2) Re-run Module 1 on stored image bytes
    3) Build PatientContext
    4) Run DermAssistRAG and return structured clinical output
    """
    try:
        image_id = request.image_id
        if not image_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image_id is required"
            )

        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )

        skin_image = db.query(SkinImage).filter(
            SkinImage.id == image_id,
            SkinImage.patient_id == patient_id
        ).first()

        if not skin_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )

        if not skin_image.image_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image binary data is missing for this record"
            )

        # Module 1 inputs from patient profile
        fitzpatrick_map = {
            "I": 1,
            "II": 2,
            "III": 3,
            "IV": 4,
            "V": 5,
            "VI": 6,
        }
        fitzpatrick_raw = patient.fitzpatrick_type.value if patient.fitzpatrick_type else "III"
        fitzpatrick_value = str(fitzpatrick_raw).replace("TYPE_", "").upper()
        fitzpatrick_num = fitzpatrick_map.get(fitzpatrick_value, 3)

        patient_age = request.age if request.age is not None else (patient.age if patient.age and patient.age > 0 else 30)
        patient_sex = request.sex if request.sex else "unknown"
        patient_site = request.site if request.site else "unknown"

        if request.wilaya:
            patient_wilaya = request.wilaya.lower()
        else:
            wilaya_raw = patient.city.value if patient.city else "nord"
            patient_wilaya = str(wilaya_raw).lower().replace("wilaya_", "") if wilaya_raw else "nord"

        patient_season = request.saison if request.saison else "ete"
        patient_context_sex = patient_sex.lower()
        if patient_context_sex == "male":
            patient_context_sex = "homme"
        elif patient_context_sex == "female":
            patient_context_sex = "femme"

        # 1) CNN prediction
        cnn_module = importlib.import_module("Modele1_CNN.cnn_service")
        cnn_service = cnn_module.get_cnn_service()
        module1_result = cnn_service.predict(
            image_bytes=skin_image.image_data,
            age=patient_age,
            sex=patient_sex,
            site=patient_site,
            wilaya=patient_wilaya,
            saison=patient_season,
            top_k=3,
        )

        # 2) RAG pipeline
        rag_module = importlib.import_module("modele2_RAG.rag_pipeline")
        alert_module = importlib.import_module("modele2_RAG.alert_engine")

        DermAssistRAG = rag_module.DermAssistRAG
        Module1Output = rag_module.Module1Output
        PatientContext = alert_module.PatientContext

        module1_output = Module1Output(
            condition_id=module1_result.get("condition_id", "unknown"),
            condition_name=module1_result.get("condition_name", "Unknown"),
            confidence=float(module1_result.get("confidence") or 0),
            top_alternatives=module1_result.get("top_alternatives", []),
        )

        patient_context = PatientContext(
            age=patient_age,
            sexe=patient_context_sex,
            fitzpatrick=fitzpatrick_value,
            ville=patient_wilaya,
            antecedents=patient.medical_history.split(",") if patient.medical_history else [],
            medicaments_actuels=[],
        )

        rag = DermAssistRAG()
        rag_response = rag.process(module1_output, patient_context)

        return {
            "status": "success",
            "message": "Advanced analysis completed",
            "patient_id": str(patient.id),
            "image_id": str(skin_image.id),
            "module1": {
                "condition_id": module1_result.get("condition_id"),
                "condition_name": module1_result.get("condition_name"),
                "confidence": module1_result.get("confidence"),
                "confidence_pct": round(float(module1_result.get("confidence") or 0) * 100, 1),
                "top_alternatives": module1_result.get("top_alternatives", []),
            },
            "rag": {
                "confidence_level": rag_response.confidence_level,
                "questions": rag_response.questions,
                "analyse_initiale": rag_response.analyse_initiale,
                "analyse_affinee": rag_response.analyse_affinee,
                "medicaments": rag_response.medicaments,
                "orientation": rag_response.orientation,
                "urgence": rag_response.urgence,
                "alertes_maladie": rag_response.alertes_maladie,
                "alertes_patient": rag_response.alertes_patient,
                "alertes_summary": {
                    "n_danger": sum(1 for a in rag_response.alertes_patient if a.get("severite") == "danger"),
                    "n_warning": sum(1 for a in rag_response.alertes_patient if a.get("severite") == "warning"),
                    "n_questions": sum(1 for a in rag_response.alertes_patient if a.get("type") == "question_requise"),
                },
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error during advanced analysis: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Advanced analysis failed: {str(e)}"
        )


@router.post("/{patient_id}/analyze-skin-image")
async def analyze_skin_image(
    patient_id: str,
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze a skin image using Module 1 CNN only.
    Saves illness name + confidence into skin_images table.
    """
    try:
        image_id = request.image_id
        if not image_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image_id is required"
            )
        
        # Get patient
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Get skin image
        skin_image = db.query(SkinImage).filter(
            SkinImage.id == image_id,
            SkinImage.patient_id == patient_id
        ).first()
        
        if not skin_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )

        if not skin_image.image_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image binary data is missing for this record"
            )

        # Build Module 1 inputs from request metadata OR patient profile fallbacks
        # Priority: request data > patient profile > defaults
        
        # Get age from request or patient profile
        patient_age = request.age if request.age is not None else (patient.age if patient.age and patient.age > 0 else 30)
        
        # Get sex from request or default
        patient_sex = request.sex if request.sex else "unknown"
        
        # Get site (body location) from request or default
        patient_site = request.site if request.site else "unknown"
        
        # Get wilaya from request or map from patient city
        if request.wilaya:
            patient_wilaya = request.wilaya.lower()
        else:
            wilaya_raw = patient.city.value if patient.city else "nord"
            patient_wilaya = str(wilaya_raw).lower().replace("wilaya_", "") if wilaya_raw else "nord"
        
        # Get season from request or default
        patient_season = request.saison if request.saison else "ete"

        cnn_module = importlib.import_module("Modele1_CNN.cnn_service")
        cnn_service = cnn_module.get_cnn_service()
        module1_result = cnn_service.predict(
            image_bytes=skin_image.image_data,
            age=patient_age,
            sex=patient_sex,  # ✅ From request or unknown
            site=patient_site,  # ✅ From request or unknown
            wilaya=patient_wilaya,  # ✅ From request or patient city
            saison=patient_season,  # ✅ From request or default to summer
            top_k=3,
        )

        # Values shown in UI should be exactly what we persist.
        display_condition_name = module1_result.get("condition_name") or module1_result.get("condition_id") or "Unknown"
        raw_confidence = float(module1_result.get("confidence") or 0)
        display_confidence_pct = round(raw_confidence * 100, 1)

        # Persist illness name + confidence in skin_images table
        skin_image.cnn_label = display_condition_name
        skin_image.cnn_confidence = display_confidence_pct
        db.commit()
        db.refresh(skin_image)

        return {
            "status": "success",
            "message": "Module 1 analysis completed and saved",
            "image_id": str(skin_image.id),
            "patient_id": str(patient.id),
            "condition_id": module1_result.get("condition_id"),
            "condition_name": display_condition_name,
            "illness_name": display_condition_name,
            "confidence": raw_confidence,
            "confidence_pct": display_confidence_pct,
            "top_alternatives": module1_result.get("top_alternatives", []),
            "stored": {
                "cnn_label": skin_image.cnn_label,
                "cnn_confidence": skin_image.cnn_confidence,
            },
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error during analysis: {e}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/{patient_id}/test-analyze-skin-image")
async def test_analyze_skin_image(
    patient_id: str,
    request: TestAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    TEST ENDPOINT: Analyze a skin image with automatically generated CNN test data.
    
    This endpoint:
    1. Generates realistic CNN predictions from the knowledge base
    2. Populates the skin_image database record with this test data
    3. Calls the regular analyze-skin-image endpoint
    
    Useful for testing the RAG pipeline before Module 1 (CNN) is ready.
    
    Request:
    {
        "image_id": "uuid of the skin image",
        "condition_name": "acne vulgaire" (optional - if None, random),
        "confidence": 0.88 (optional - if None, random between 0.75-0.95)
    }
    
    Examples:
        - POST /patients/{id}/test-analyze-skin-image
          {"image_id": "xxx", "condition_name": None, "confidence": None}
          -> Random condition with random confidence
        
        - POST /patients/{id}/test-analyze-skin-image
          {"image_id": "xxx", "condition_name": "acne vulgaire"}
          -> Acne vulgaire with random confidence
        
        - POST /patients/{id}/test-analyze-skin-image
          {"image_id": "xxx", "condition_name": "acne vulgaire", "confidence": 0.88}
          -> Acne vulgaire with 88% confidence
    """
    try:
        image_id = request.image_id
        if not image_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image_id is required"
            )
        
        # Get patient
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Get skin image
        skin_image = db.query(SkinImage).filter(
            SkinImage.id == image_id,
            SkinImage.patient_id == patient_id
        ).first()
        
        if not skin_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )
        
        # Generate test CNN data
        from app.utils.test_cnn_data import generate_test_cnn_data
        
        try:
            cnn_data = generate_test_cnn_data(
                condition_name=request.condition_name,
                confidence=request.confidence
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Update skin_image with test CNN data
        skin_image.cnn_predictions = json.dumps(cnn_data)
        skin_image.cnn_label = cnn_data.get("condition_id")
        skin_image.cnn_confidence = cnn_data.get("confidence")
        skin_image.analyzed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(skin_image)
        
        print(f"Generated test CNN data for image {image_id}:")
        print(f"  Condition: {cnn_data.get('condition_name')}")
        print(f"  Confidence: {cnn_data.get('confidence')}")
        print(f"  Alternatives: {len(cnn_data.get('top_alternatives', []))} conditions")
        
        # Build response with test CNN data
        try:
            # Try to import and use RAG pipeline
            rag_module = importlib.import_module("modele2_RAG.rag_pipeline")
            alert_module = importlib.import_module("modele2_RAG.alert_engine")

            DiagnosisAwareRetriever = rag_module.DiagnosisAwareRetriever
            ClinicalGenerator = rag_module.ClinicalGenerator
            Module1Output = rag_module.Module1Output
            PatientContext = alert_module.PatientContext
            
            # Get patient details for context
            patient_age = patient.age
            patient_fitzpatrick = patient.fitzpatrick_skin_type or "Unknown"
            patient_city = patient.city or "Unknown"
            
            # Build Module 1 Output object from test data
            module1 = Module1Output(
                condition_id=cnn_data["condition_id"],
                condition_name=cnn_data["condition_name"],
                confidence=cnn_data["confidence"],
                top_alternatives=cnn_data.get("top_alternatives", []),
            )
            
            # Build Patient Context
            patient_context = PatientContext(
                age=patient_age,
                sexe="unknown",
                fitzpatrick=patient_fitzpatrick,
                ville=patient_city,
                antecedents=patient.medical_history.split(",") if patient.medical_history else [],
                medicaments_actuels=[],
            )
            
            # Initialize RAG pipeline
            retriever = DiagnosisAwareRetriever()
            generator = ClinicalGenerator()
            
            # Get retrieval results
            retrieval_results = retriever.retrieve(module1, patient_context)
            
            # Generate initial analysis
            analyse_resultat_initiale = generator.generate_analyse_initiale(
                module1,
                patient_context,
                retrieval_results["condition_data"],
                retrieval_results["confidence_level"],
                retrieval_results["retrieved_chunks"],
            )
            
            # Generate refined analysis
            analyse_resultat_affinee = generator.generate_analyse_affinee(
                module1,
                patient_context,
                retrieval_results["condition_data"],
                retrieval_results["confidence_level"],
                retrieval_results["retrieved_chunks"],
                [],
            )
            
            # Return full analysis response
            return {
                "status": "success",
                "message": "Test analysis completed with generated CNN data",
                "condition_id": cnn_data["condition_id"],
                "condition_name": cnn_data["condition_name"],
                "confidence": cnn_data["confidence"],
                "confidence_level": retrieval_results["confidence_level"],
                "top_alternatives": cnn_data.get("top_alternatives", []),
                "analyse_initiale": analyse_resultat_initiale.get("analyse_initiale", ""),
                "analyse_affinee": analyse_resultat_affinee.get("analyse_affinee", ""),
                "urgence_display": analyse_resultat_initiale.get("urgence_display", ""),
                "plan_management": analyse_resultat_initiale.get("plan_management", []),
                "medications_avoid": analyse_resultat_initiale.get("medications_avoid", []),
                "medicaments_recommandes": analyse_resultat_affinee.get("medicaments_recommandes", []),
                "clinical_alerts": analyse_resultat_affinee.get("clinical_alerts", []),
            }
        
        except ImportError as e:
            print(f"Warning: RAG modules not available: {e}")
            # Return basic response if RAG modules not available
            return {
                "status": "success",
                "message": "Test analysis completed (RAG pipeline unavailable)",
                "condition_id": cnn_data["condition_id"],
                "condition_name": cnn_data["condition_name"],
                "confidence": cnn_data["confidence"],
                "top_alternatives": cnn_data.get("top_alternatives", []),
                "analyse_initiale": f"Condition detected: {cnn_data['condition_name']} with {int(cnn_data['confidence']*100)}% confidence",
                "urgence_display": "RAG pipeline unavailable",
            }
        except Exception as e:
            import traceback
            print(f"Error during RAG analysis: {e}")
            print(traceback.format_exc())
            # Still return the test data on error
            return {
                "status": "partial_success",
                "message": f"Test data generated but analysis failed: {str(e)}",
                "condition_id": cnn_data["condition_id"],
                "condition_name": cnn_data["condition_name"],
                "confidence": cnn_data["confidence"],
                "top_alternatives": cnn_data.get("top_alternatives", []),
            }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error during test analysis: {e}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test analysis failed: {str(e)}"
        )


@router.post("/{patient_id}/ai-results")
async def create_ai_result(
    patient_id: str,
    request: AIResultCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Save AI analysis results to the ai_results table.
    
    This endpoint stores:
    - diagnosis (disease diagnosis)
    - confidence (confidence score)
    - suggested_questions (only those selected by the doctor)
    - treatment_options (only those selected by the doctor)
    - env_snapshot (patient environment snapshot)
    
    And links to:
    - patient_id
    - consultation_id (created automatically if not provided)
    - skin_image_id (if provided)
    """
    try:
        # Verify patient exists
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Create or use provided consultation_id
        consultation_id = None
        
        if request.consultation_id:
            # Verify provided consultation exists
            try:
                consultation_id = int(request.consultation_id)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="consultation_id must be an integer"
                )
            
            consultation = db.query(Consultation).filter(
                Consultation.consultation_id == consultation_id
            ).first()
            if not consultation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Consultation not found"
                )
        else:
            # Auto-create consultation 
            new_consultation = Consultation(
                patient_id=patient_id,
                doctor_id=None,  # No doctor needed
                status=ConsultationStatus.AI_DONE
            )
            db.add(new_consultation)
            db.flush()  # Get the ID without committing yet
            consultation_id = new_consultation.consultation_id
        
        # Verify skin image if provided
        if request.skin_image_id:
            skin_image = db.query(SkinImage).filter(
                SkinImage.id == request.skin_image_id
            ).first()
            if not skin_image:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Skin image not found"
                )
        
        # Create AI result record
        ai_result = AIResult(
            consultation_id=consultation_id,
            patient_id=patient_id,
            skin_image_id=request.skin_image_id,
            diagnosis=request.diagnosis,
            confidence=request.confidence,
            suggested_questions=[
                {
                    "index": q.index,
                    "question": q.question,
                    "selected_option": q.selected_option
                }
                for q in (request.suggested_questions or [])
            ],
            treatment_options=[
                {
                    "nom": t.nom,
                    "classe": t.classe,
                    "indication": t.indication,
                    "posologie": t.posologie
                }
                for t in (request.treatment_options or [])
            ],
            env_snapshot=request.env_snapshot,
        )
        
        db.add(ai_result)
        db.commit()
        db.refresh(ai_result)
        
        return {
            "status": "success",
            "message": "AI results saved successfully",
            "ai_result_id": str(ai_result.id),
            "consultation_id": ai_result.consultation_id,
            "data": {
                "id": str(ai_result.id),
                "patient_id": str(ai_result.patient_id),
                "consultation_id": ai_result.consultation_id,
                "diagnosis": ai_result.diagnosis,
                "confidence": ai_result.confidence,
                "suggested_questions_count": len(request.suggested_questions or []),
                "treatment_options_count": len(request.treatment_options or []),
                "created_at": ai_result.generated_at.isoformat() if ai_result.generated_at else None,
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"Error during AI result creation: {e}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create AI result: {str(e)}"
        )


@router.get("/{patient_id}/consultations/{consultation_id}/ai-results")
def get_ai_results_by_consultation(
    patient_id: str,
    consultation_id: int,
    db: Session = Depends(get_db)
):
    """Récupérer les résultats AI d'une consultation donnée."""
    try:
        # Get AI result for this consultation
        ai_result = db.query(AIResult).filter(
            AIResult.consultation_id == consultation_id,
            AIResult.patient_id == patient_id
        ).first()
        
        if not ai_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI results not found for this consultation"
            )
        
        return {
            "id": str(ai_result.id),
            "patient_id": str(ai_result.patient_id),
            "consultation_id": ai_result.consultation_id,
            "skin_image_id": str(ai_result.skin_image_id) if ai_result.skin_image_id else None,
            "diagnosis": ai_result.diagnosis,
            "confidence": ai_result.confidence,
            "suggested_questions": ai_result.suggested_questions or [],
            "treatment_options": ai_result.treatment_options or [],
            "env_snapshot": ai_result.env_snapshot or {},
            "generated_at": ai_result.generated_at.isoformat() if ai_result.generated_at else None,
            "updated_at": ai_result.updated_at.isoformat() if ai_result.updated_at else None,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error retrieving AI results: {e}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve AI results: {str(e)}"
        )


@router.get("/{patient_id}/ai-results-history")
def get_patient_ai_results(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer l'historique des résultats AI d'un patient."""
    try:
        ai_results = db.query(AIResult).filter(
            AIResult.patient_id == patient_id
        ).order_by(AIResult.generated_at.asc()).all()
        
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
    
    except Exception as e:
        import traceback
        print(f"Error retrieving patient AI results history: {e}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve AI results history: {str(e)}"
        )


@router.get("/{patient_id}/consultations/{consultation_id}/skin-image")
def get_consultation_skin_image(
    patient_id: str,
    consultation_id: int,
    db: Session = Depends(get_db)
):
    """Récupérer la photo du skin pour une consultation."""
    try:
        # Get AI result for this consultation to find skin_image_id
        ai_result = db.query(AIResult).filter(
            AIResult.consultation_id == consultation_id,
            AIResult.patient_id == patient_id
        ).first()
        
        if not ai_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI results not found for this consultation"
            )
        
        if not ai_result.skin_image_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No skin image found for this consultation"
            )
        
        # Get the skin image
        skin_image = db.query(SkinImage).filter(
            SkinImage.id == ai_result.skin_image_id
        ).first()
        
        if not skin_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Skin image not found"
            )
        
        # Return image data or URL
        if skin_image.image_data:
            # If image is stored as binary data
            import base64
            encoded_image = base64.b64encode(skin_image.image_data).decode('utf-8')
            return {
                "image_data": f"data:image/jpeg;base64,{encoded_image}",
                "source": skin_image.source,
                "uploaded_at": skin_image.uploaded_at.isoformat() if skin_image.uploaded_at else None
            }
        elif skin_image.minio_url:
            # If image is stored via MinIO (URL)
            return {
                "image_url": skin_image.minio_url,
                "source": skin_image.source,
                "uploaded_at": skin_image.uploaded_at.isoformat() if skin_image.uploaded_at else None
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No image data or URL found"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error retrieving skin image: {e}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve skin image: {str(e)}"
        )


@router.post("/{patient_id}/refine-analysis")
async def refine_analysis(
    patient_id: str,
    request: RefineAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Refine the AI analysis based on patient's answers to clinical questions.
    
    This endpoint:
    1. Retrieves the patient and skin image
    2. Re-runs Module 1 CNN prediction
    3. Calls RAG pipeline with question_answers parameter
    4. Returns refined analysis (analyse_affinee)
    
    Request:
    {
        "image_id": "uuid",
        "question_answers": [
            {"index": 0, "question": "Avez-vous des antécédents?", "selected_option": "Oui"},
            {"index": 1, "question": "Question 2", "selected_option": "Non"},
            ...
        ]
    }
    
    Response:
    {
        "status": "success",
        "analyse_affinee": "Analyse personnalisée basée sur les réponses",
        "plan_prise_en_charge": ["étape 1", "étape 2"],
        "medicaments_a_eviter": ["med1 (raison)"],
        "delai_urgence": "Consultation dans 2 semaines"
    }
    """
    try:
        image_id = request.image_id
        if not image_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image_id is required"
            )
        
        if not request.question_answers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="question_answers is required"
            )
        
        # Get patient
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Get skin image
        skin_image = db.query(SkinImage).filter(
            SkinImage.id == image_id,
            SkinImage.patient_id == patient_id
        ).first()
        
        if not skin_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )
        
        if not skin_image.image_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image binary data is missing"
            )
        
        # Module 1 inputs from patient profile
        fitzpatrick_map = {
            "I": 1,
            "II": 2,
            "III": 3,
            "IV": 4,
            "V": 5,
            "VI": 6,
        }
        fitzpatrick_raw = patient.fitzpatrick_type.value if patient.fitzpatrick_type else "III"
        fitzpatrick_value = str(fitzpatrick_raw).replace("TYPE_", "").upper()
        fitzpatrick_num = fitzpatrick_map.get(fitzpatrick_value, 3)

        patient_age = request.age if request.age is not None else (patient.age if patient.age and patient.age > 0 else 30)
        patient_sex = request.sex if request.sex else "unknown"
        patient_site = request.site if request.site else "unknown"

        if request.wilaya:
            patient_wilaya = request.wilaya.lower()
        else:
            wilaya_raw = patient.city.value if patient.city else "nord"
            patient_wilaya = str(wilaya_raw).lower().replace("wilaya_", "") if wilaya_raw else "nord"

        patient_season = request.saison if request.saison else "ete"
        patient_context_sex = patient_sex.lower()
        if patient_context_sex == "male":
            patient_context_sex = "homme"
        elif patient_context_sex == "female":
            patient_context_sex = "femme"

        # 1) CNN prediction
        cnn_module = importlib.import_module("Modele1_CNN.cnn_service")
        cnn_service = cnn_module.get_cnn_service()
        module1_result = cnn_service.predict(
            image_bytes=skin_image.image_data,
            age=patient_age,
            sex=patient_sex,
            site=patient_site,
            wilaya=patient_wilaya,
            saison=patient_season,
            top_k=3,
        )

        # 2) RAG pipeline with question answers
        rag_module = importlib.import_module("modele2_RAG.rag_pipeline")
        alert_module = importlib.import_module("modele2_RAG.alert_engine")

        DermAssistRAG = rag_module.DermAssistRAG
        Module1Output = rag_module.Module1Output
        PatientContext = alert_module.PatientContext

        module1_output = Module1Output(
            condition_id=module1_result.get("condition_id", "unknown"),
            condition_name=module1_result.get("condition_name", "Unknown"),
            confidence=float(module1_result.get("confidence") or 0),
            top_alternatives=module1_result.get("top_alternatives", []),
        )

        patient_context = PatientContext(
            age=patient_age,
            sexe=patient_context_sex,
            fitzpatrick=fitzpatrick_value,
            ville=patient_wilaya,
            antecedents=patient.medical_history.split(",") if patient.medical_history else [],
            medicaments_actuels=[],
        )

        # Format question_answers to match RAG pipeline expectations.
        # rag_pipeline.generate_analyse_affinee reads qa.get("question") and qa.get("answer").
        question_answers_list = [
            {
                "index": qa.index,
                "question": qa.question,
                "answer": qa.selected_option,
                "selected_option": qa.selected_option,
            }
            for qa in request.question_answers
        ]

        # Call RAG with question_answers to generate refined analysis
        rag = DermAssistRAG()
        rag_response = rag.process(
            module1_output,
            patient_context,
            question_answers=question_answers_list
        )

        affinee_data = (
            rag_response.analyse_affinee_data
            if isinstance(rag_response.analyse_affinee_data, dict)
            else {}
        )
        llm_error = affinee_data.get("error") if isinstance(affinee_data, dict) else None
        llm_provider = affinee_data.get("_llm_provider") if isinstance(affinee_data, dict) else None
        llm_model = affinee_data.get("_llm_model") if isinstance(affinee_data, dict) else None
        llm_source = llm_provider if affinee_data and not llm_error and llm_provider else "fallback"

        base_confidence_pct = round(float(module1_result.get("confidence") or 0) * 100, 1)
        raw_revised_confidence = affinee_data.get("confiance_revisee_pct")
        try:
            revised_confidence_pct = float(raw_revised_confidence)
        except (TypeError, ValueError):
            revised_confidence_pct = base_confidence_pct
        revised_confidence_pct = max(0.0, min(100.0, round(revised_confidence_pct, 1)))
        confidence_delta_pct = round(revised_confidence_pct - base_confidence_pct, 1)

        decision_diagnostique = affinee_data.get("decision_diagnostique")
        if decision_diagnostique not in {
            "diagnostic_renforce",
            "diagnostic_incertain",
            "revoir_alternatives",
        }:
            if confidence_delta_pct >= 5:
                decision_diagnostique = "diagnostic_renforce"
            elif confidence_delta_pct <= -5:
                decision_diagnostique = "revoir_alternatives"
            else:
                decision_diagnostique = "diagnostic_incertain"

        paragraphe_confiance = (
            affinee_data.get("paragraphe_confiance")
            or rag_response.analyse_affinee
            or "Les réponses cliniques ne permettent pas de trancher clairement."
        )

        analyse_affinee_text = (
            rag_response.analyse_affinee
            or affinee_data.get("analyse_affinee")
            or paragraphe_confiance
        )

        alternatives_prioritaires = []
        raw_alternatives = affinee_data.get("alternatives_prioritaires")
        if isinstance(raw_alternatives, list):
            for idx, alt in enumerate(raw_alternatives[:3], start=1):
                if isinstance(alt, dict):
                    nom = (
                        alt.get("nom")
                        or alt.get("name")
                        or alt.get("condition")
                        or alt.get("maladie")
                    )
                    if not nom:
                        continue
                    try:
                        priorite = int(alt.get("priorite", idx))
                    except (TypeError, ValueError):
                        priorite = idx
                    alternatives_prioritaires.append(
                        {
                            "nom": str(nom),
                            "priorite": priorite,
                            "raison": str(alt.get("raison", "")),
                        }
                    )
                elif isinstance(alt, (str, int, float, bool)):
                    alternatives_prioritaires.append(
                        {
                            "nom": str(alt),
                            "priorite": idx,
                            "raison": "À vérifier avec l'examen clinique.",
                        }
                    )

        if not alternatives_prioritaires:
            top_alts = module1_result.get("top_alternatives", [])
            if isinstance(top_alts, list):
                for idx, alt in enumerate(top_alts[:3], start=1):
                    if not isinstance(alt, dict):
                        continue
                    alt_name = (
                        alt.get("name")
                        or alt.get("condition_name")
                        or alt.get("condition_id")
                    )
                    if not alt_name:
                        continue
                    alternatives_prioritaires.append(
                        {
                            "nom": str(alt_name),
                            "priorite": idx,
                            "raison": "Alternative CNN à re-prioriser selon les réponses cliniques.",
                            "confidence_pct": round(float(alt.get("confidence") or 0) * 100, 1),
                        }
                    )

        patient_alerts = (
            rag_response.alertes_patient
            if isinstance(rag_response.alertes_patient, list)
            else []
        )
        medicaments_a_eviter = []

        raw_avoid_from_gemini = affinee_data.get("medicaments_a_eviter")
        if isinstance(raw_avoid_from_gemini, list):
            for item in raw_avoid_from_gemini:
                if isinstance(item, dict):
                    medicament_name = item.get("medicament") or item.get("nom")
                    if not medicament_name:
                        continue
                    medicaments_a_eviter.append(
                        {
                            "medicament": str(medicament_name),
                            "raison": str(item.get("raison", "")),
                        }
                    )
                elif isinstance(item, (str, int, float, bool)):
                    medicaments_a_eviter.append(
                        {
                            "medicament": str(item),
                            "raison": "Signalé par l'analyse affinée Gemini.",
                        }
                    )

        for alert in patient_alerts:
            if not isinstance(alert, dict):
                continue
            if alert.get("type") != "medicament_a_eviter":
                continue
            alert_medicament = str(alert.get("medicament", "Unknown"))
            already_present = any(
                m.get("medicament", "").lower() == alert_medicament.lower()
                for m in medicaments_a_eviter
                if isinstance(m, dict)
            )
            if not already_present:
                medicaments_a_eviter.append(
                    {
                        "medicament": alert_medicament,
                        "raison": str(alert.get("raison", "")),
                    }
                )

        plan_prise_en_charge = affinee_data.get("plan_prise_en_charge")
        if not isinstance(plan_prise_en_charge, list):
            plan_prise_en_charge = (
                rag_response.medicaments if isinstance(rag_response.medicaments, list) else []
            )

        delai_urgence = affinee_data.get("delai_urgence")
        if not isinstance(delai_urgence, str) or not delai_urgence.strip():
            delai_urgence = rag_response.urgence if rag_response.urgence else "À déterminer"

        return {
            "status": "success",
            "message": "Analysis refined based on question answers",
            "patient_id": str(patient.id),
            "image_id": str(skin_image.id),
            "condition": {
                "id": module1_result.get("condition_id"),
                "name": module1_result.get("condition_name"),
                "confidence": float(module1_result.get("confidence") or 0),
            },
            "refined_analysis": {
                "analyse_affinee": analyse_affinee_text,
                "paragraphe_confiance": paragraphe_confiance,
                "confiance_initiale_pct": base_confidence_pct,
                "confiance_revisee_pct": revised_confidence_pct,
                "variation_confiance_pct": confidence_delta_pct,
                "decision_diagnostique": decision_diagnostique,
                "alternatives_prioritaires": alternatives_prioritaires,
                "plan_prise_en_charge": plan_prise_en_charge,
                "medicaments_a_eviter": medicaments_a_eviter,
                "delai_urgence": delai_urgence,
                "llm_source": llm_source,
                "llm_model": llm_model,
                "llm_error": llm_error,
            },
            "questions_processed": len(request.question_answers),
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error during refined analysis: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refined analysis failed: {str(e)}"
        )
