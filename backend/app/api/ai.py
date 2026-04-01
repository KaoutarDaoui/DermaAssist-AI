from fastapi import APIRouter, Depends, status, File, UploadFile, Form, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_doctor_role, get_current_user
from app.schemas.ai_result import AIResultResponse
from typing import Dict, Any, Optional
import sys
from pathlib import Path

# ── Module 1 (CNN) ────────────────────────────────────
sys.path.append(str(Path(__file__).parent.parent.parent / "ai"))
from Modele1_CNN.cnn_service import get_cnn_service

# ── Module 2 (RAG) ────────────────────────────────────
from modele2_RAG.rag_pipeline import DermAssistRAG, Module1Output
from modele2_RAG.alert_engine import PatientContext

router = APIRouter(prefix="/ai", tags=["AI Pipeline"])

# Initialize RAG singleton (lazy loading - only loads when first called)
_rag_instance: Optional[DermAssistRAG] = None

def get_rag() -> DermAssistRAG:
    """Get or initialize the RAG pipeline singleton (lazy load on first access)."""
    global _rag_instance
    if _rag_instance is None:
        try:
            _rag_instance = DermAssistRAG()
            print("✓ RAG pipeline initialized successfully")
        except Exception as e:
            print(f"⚠ RAG initialization warning: {e}")
            # Return None to allow CNN-only analysis
            return None
    return _rag_instance


@router.post("/analyze", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def analyze_image(
    # ── Image & mandatory fields ──
    image: UploadFile = File(..., description="Photo de la lésion cutanée"),
    age: int = Form(..., ge=0, le=120, description="Âge du patient (0-120)"),
    sex: str = Form(..., regex="^(male|female|homme|femme)$", description="Sexe: male/homme, female/femme"),
    
    # ── Clinical metadata (NEW IMPROVED MODEL) ──
    site: str = Form("unknown", description="Localisation: visage, cou, tronc, dos, bras, jambe, pied, unknown"),
    wilaya: str = Form("nord", description="Région: nord, sud, est, ouest"),
    saison: str = Form("ete", description="Saison: printemps, ete, automne, hiver"),
    
    # ── Comorbidités (None = unknown) ──
    grossesse: Optional[str] = Form(None),
    insuffisance_cardiaque: Optional[str] = Form(None),
    insuffisance_renale: Optional[str] = Form(None),
    insuffisance_hepatique: Optional[str] = Form(None),
    diabete: Optional[str] = Form(None),
    hypertension: Optional[str] = Form(None),
    deficit_g6pd: Optional[str] = Form(None),
    coronaropathie: Optional[str] = Form(None),
    immunodepression: Optional[str] = Form(None),
    allergie_penicilline: Optional[str] = Form(None),
    
    current_user: dict = Depends(get_current_user),
):
    """
    ──────────────────────────────────────────────────────────────────────────
    UNIFIED PIPELINE: Module 1 (Improved CNN with Metadata) + Module 2 (RAG)
    ──────────────────────────────────────────────────────────────────────────
    
    1️⃣  Module 1 — Improved CNN Inference (with metadata)
        - EfficientNet-B0 + metadata fusion
        - Metadata: age, sex, site, wilaya, saison
        - Output: disease + confidence + alternatives
    
    2️⃣  Module 2 — RAG Clinical Analysis
        - Retriever: KB recherche basée diagnostic + patient
        - Generator: Gemini Flash pour analyse clinique
        - Alert Engine: Moteur alertes comorbidités
        - Output: questions, médicaments, alertes, orientation
    
    Returns: Unified Module1 + RAG response to frontend doctor
    ──────────────────────────────────────────────────────────────────────────
    """
    
    try:
        # ── Helper: Parse boolean form fields ──
        def parse_bool(v: Optional[str]) -> Optional[bool]:
            if v is None:
                return None
            return v.lower() == "true"

        # ──────────────────────────────────────────────────────────────────
        # 1️⃣  MODULE 1 — IMPROVED CNN INFERENCE (with metadata)
        # ──────────────────────────────────────────────────────────────────
        
        cnn_service = get_cnn_service()
        image_bytes = await image.read()
        
        module1_result = cnn_service.predict(
            image_bytes=image_bytes,
            age=age,
            sex=sex,
            site=site,
            wilaya=wilaya,
            saison=saison,
            top_k=5,
        )
        
        # ──────────────────────────────────────────────────────────────────
        # 2️⃣  BUILD PATIENT CONTEXT
        # ──────────────────────────────────────────────────────────────────
        
        # Normalize sex value (convert homme/femme to male/female if needed)
        sex_normalized = sex.lower()
        if sex_normalized == "homme":
            sex_normalized = "male"
        elif sex_normalized == "femme":
            sex_normalized = "female"
        
        patient_context = PatientContext(
            age=age,
            sexe=sex_normalized,
            site=site,
            wilaya=wilaya,
            saison=saison,
            grossesse=parse_bool(grossesse),
            insuffisance_cardiaque=parse_bool(insuffisance_cardiaque),
            insuffisance_renale=parse_bool(insuffisance_renale),
            insuffisance_hepatique=parse_bool(insuffisance_hepatique),
            diabete=parse_bool(diabete),
            hypertension=parse_bool(hypertension),
            deficit_g6pd=parse_bool(deficit_g6pd),
            coronaropathie=parse_bool(coronaropathie),
            immunodepression=parse_bool(immunodepression),
            allergie_penicilline=parse_bool(allergie_penicilline),
        )
        
        # ──────────────────────────────────────────────────────────────────
        # 3️⃣  MODULE 2 — RAG ANALYSIS
        # ──────────────────────────────────────────────────────────────────
        
        rag = get_rag()
        rag_response = None
        rag_available = rag is not None
        
        if rag_available:
            # Convert Module 1 output to RAG input format
            m1_output = Module1Output(
                condition_id=module1_result["condition_id"],
                condition_name=module1_result["condition_name"],
                confidence=module1_result["confidence"],
                top_alternatives=module1_result.get("top_alternatives", []),
            )
            
            # Execute RAG pipeline
            try:
                rag_response = rag.process(m1_output, patient_context)
            except Exception as rag_error:
                print(f"⚠ RAG processing error: {rag_error}")
                rag_available = False
        
        # ──────────────────────────────────────────────────────────────────
        # 4️⃣  UNIFIED RESPONSE
        # ──────────────────────────────────────────────────────────────────
        
        response = {
            "status": "success" if rag_available else "partial",
            "request_metadata": {
                "age": age,
                "sex": sex_normalized,
                "site": site,
                "wilaya": wilaya,
                "saison": saison,
            },
            "module1": {
                "condition_id": module1_result["condition_id"],
                "condition_name": module1_result["condition_name"],
                "confidence": module1_result["confidence"],
                "confidence_pct": module1_result.get("confidence_pct", round(module1_result["confidence"] * 100, 1)),
                "top_alternatives": module1_result.get("top_alternatives", []),
            },
        }
        
        # Add RAG response only if available
        if rag_available and rag_response:
            response["rag"] = {
                # Clinical analysis
                "confidence_level": rag_response.confidence_level,
                "urgence": rag_response.urgence,
                "analyse_initiale": rag_response.analyse_initiale,
                "analyse_affinee": rag_response.analyse_affinee,
                
                # Treatment & questions
                "medicaments": rag_response.medicaments,
                "questions": rag_response.questions,
                "orientation": rag_response.orientation,
                
                # Alerts
                "alertes_maladie": rag_response.alertes_maladie,
                "alertes_medicaments": rag_response.alertes_medicaments,
                "alertes_patient": rag_response.alertes_patient,
                
                # Summary for frontend
                "alertes_summary": {
                    "n_danger": sum(1 for a in rag_response.alertes_patient 
                                    if a.get("severite") == "danger"),
                    "n_warning": sum(1 for a in rag_response.alertes_patient 
                                     if a.get("severite") == "warning"),
                    "n_questions": sum(1 for a in rag_response.alertes_patient 
                                      if a.get("type") == "question_requise"),
                },
            }
        else:
            response["rag"] = {
                "status": "unavailable",
                "message": "Clinical analysis module not initialized. Running CNN-only analysis.",
            }
        
        response["patient_context"] = {
            "age": age,
            "sexe": sexe,
            "fitzpatrick": fitzpatrick,
            "ville": ville,
            "localisation": localisation,
        }
        
        return response
    
    except ValueError as e:
        # Condition not found or other validation error
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unexpected error
        print(f"[ERROR] /ai/analyze: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline error: {str(e)}"
        )


@router.post("/analyze-cnn", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def analyze_image_cnn_only(
    image: UploadFile = File(..., description="Photo de la lésion cutanée"),
    age: int = Form(25),
    sex: str = Form("unknown"),
    site: str = Form("unknown"),
    wilaya: str = Form("nord"),
    saison: str = Form("ete"),
):
    """
    FAST TEST: Module 1 (CNN) Only
    Returns illness name + confidence without Module 2 (RAG)
    
    Perfect for quick testing of the skin lesion classifier.
    """
    try:
        cnn_service = get_cnn_service()
        image_bytes = await image.read()
        
        module1_result = cnn_service.predict(
            image_bytes=image_bytes,
            age=age,
            sex=sex,
            site=site,
            wilaya=wilaya,
            saison=saison,
            top_k=3,
        )
        
        return {
            "status": "success",
            "illness_name": module1_result["condition_name"],
            "confidence": module1_result["confidence"],
            "confidence_pct": round(module1_result["confidence"] * 100, 1),
            "condition_id": module1_result["condition_id"],
            "top_alternatives": module1_result.get("top_alternatives", []),
        }
    
    except Exception as e:
        print(f"[ERROR] /ai/analyze-cnn: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"CNN error: {str(e)}"
        )



@router.get("/result/{consultation_id}", response_model=AIResultResponse)
def get_ai_result(
    consultation_id: str,
    current_user: dict = Depends(get_doctor_role),
    db: Session = Depends(get_db)
):
    """Récupérer le résultat AI complet d'une consultation (médecin uniquement)."""
    from app.models.ai_result import AIResult
    
    result = db.query(AIResult).filter(AIResult.consultation_id == consultation_id).first()
    if not result:
        # Placeholder response
        return {
            "id": "result-id",
            "consultation_id": consultation_id,
            "diagnosis": "No diagnosis available yet",
            "confidence": None,
            "suggested_questions": [],
            "treatment_options": [],
            "env_snapshot": None,
            "generated_at": "2024-01-01T00:00:00"
        }
    return result


@router.get("/env-snapshot", response_model=Dict[str, Any])
async def get_environment_snapshot(city: str, current_user: dict = Depends(get_current_user)):
    """
    Récupérer les données environnementales temps réel pour une ville.
    
    Données:
    - UV index (OpenUV)
    - Air Quality Index - AQI (OpenAQ)
    - Température, humidité (OpenWeatherMap)
    
    Les données sont mises en cache Redis (TTL: 30 minutes).
    """
    # TODO: Implémenter l'appel aux APIs externes et le cache Redis
    # Pour l'instant, c'est un placeholder
    return {
        "city": city,
        "timestamp": "2024-01-01T00:00:00",
        "uv_index": 5,
        "aqi": 45,
        "temperature": 28,
        "humidity": 65,
        "weather": "Sunny"
    }
