"""
Example: How to integrate RAG analysis saving into FastAPI endpoints

This shows the complete flow from RAG pipeline to database storage
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.database import get_db
from app.services.rag_service import RAGAnalysisService
from app.schemas.rag_analysis import AIAnalysisResponse, AIAnalysisSimple
from app.core.security import get_current_user

# Example router
router = APIRouter(prefix="/rag", tags=["RAG Pipeline"])


# ─────────────────────────────────────────────
# EXAMPLE 1: Save RAG analysis (what you'll use)
# ─────────────────────────────────────────────

@router.post("/save-analysis/{patient_id}", response_model=AIAnalysisResponse)
async def save_rag_analysis(
    patient_id: UUID,
    analysis_data: AIAnalysisSimple,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save RAG analysis results to database
    
    This is what you'll call after running the RAG pipeline
    """
    
    try:
        # Call the service to save
        saved_analysis = RAGAnalysisService.save_analysis(
            db=db,
            patient_id=patient_id,
            diagnosis=analysis_data.disease,
            disease_label=analysis_data.disease_label,
            confidence=analysis_data.confidence,
            clinical_questions=analysis_data.clinical_questions,
            treatments=analysis_data.treatments,
            alerts=analysis_data.alerts
        )
        
        return saved_analysis
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to save analysis: {str(e)}"
        )


# ─────────────────────────────────────────────
# EXAMPLE 2: Get latest analysis
# ─────────────────────────────────────────────

@router.get("/latest/{patient_id}", response_model=AIAnalysisResponse)
async def get_latest_analysis(
    patient_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get most recent analysis for a patient"""
    
    analysis = RAGAnalysisService.get_latest_analysis_for_patient(db, patient_id)
    
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="No analysis found for this patient"
        )
    
    return analysis


# ─────────────────────────────────────────────
# EXAMPLE 3: Get analysis history
# ─────────────────────────────────────────────

@router.get("/history/{patient_id}", response_model=list[AIAnalysisResponse])
async def get_analysis_history(
    patient_id: UUID,
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get patient's analysis history"""
    
    analyses = RAGAnalysisService.get_patient_analysis_history(
        db=db,
        patient_id=patient_id,
        limit=limit
    )
    
    return analyses


# ─────────────────────────────────────────────
# EXAMPLE 4: Complete flow (CNN → RAG → Save)
# ─────────────────────────────────────────────

@router.post("/analyze-complete/{patient_id}")
async def complete_analysis_pipeline(
    patient_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Complete pipeline: CNN classifier → RAG pipeline → Save to DB
    
    This is the END-TO-END flow you need to implement
    """
    
    # STEP 1: Load image and run CNN classifier
    # cnn_output = cnn_model.predict(image)
    # diagnosis = cnn_output.disease  # "acne_vulgaire"
    # confidence = cnn_output.confidence  # 0.91
    
    # STEP 2: Get patient data
    # patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    # STEP 3: Run RAG pipeline
    # rag = RAGPipeline()
    # rag_result = rag.generate_clinical_response(
    #     diagnosis=diagnosis,
    #     confidence=confidence,
    #     patient=patient
    # )
    
    # STEP 4: Save to database
    # saved = RAGAnalysisService.save_analysis(
    #     db=db,
    #     patient_id=patient_id,
    #     diagnosis=diagnosis,
    #     disease_label=rag_result["disease_label"],
    #     confidence=confidence,
    #     clinical_questions=rag_result["clinical_questions"],
    #     treatments=rag_result["treatments"],
    #     alerts=rag_result["alerts"]
    # )
    
    # STEP 5: Return result
    # return {
    #     "status": "success",
    #     "analysis_id": saved.id,
    #     "disease": saved.disease_label,
    #     "confidence": saved.confidence
    # }
    
    return {"status": "pipeline_not_implemented_yet"}
