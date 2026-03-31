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
    """Request body for skin image analysis."""
    image_id: str


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

        patient_age = patient.age if patient.age and patient.age > 0 else 30
        patient_city = patient.city.value if patient.city else "Alger"

        # 1) CNN prediction
        cnn_module = importlib.import_module("Modele1_CNN.cnn_service")
        cnn_service = cnn_module.get_cnn_service()
        module1_result = cnn_service.predict(
            image_bytes=skin_image.image_data,
            age=patient_age,
            sexe="femme",
            fitzpatrick=fitzpatrick_num,
            localisation="unknown",
            ville=patient_city,
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
            sexe="femme",
            fitzpatrick=fitzpatrick_value,
            ville=patient_city,
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

        # Build Module 1 inputs from patient profile
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
        fitzpatrick = fitzpatrick_map.get(fitzpatrick_value, 3)

        patient_age = patient.age if patient.age and patient.age > 0 else 30
        patient_city = patient.city.value if patient.city else "Alger"

        cnn_module = importlib.import_module("Modele1_CNN.cnn_service")
        cnn_service = cnn_module.get_cnn_service()
        module1_result = cnn_service.predict(
            image_bytes=skin_image.image_data,
            age=patient_age,
            sexe="homme",
            fitzpatrick=fitzpatrick,
            localisation="unknown",
            ville=patient_city,
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
