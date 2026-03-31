"""
Schemas for RAG Analysis API responses
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ClinicalQuestionResponse(BaseModel):
    """Single clinical question"""
    id: int
    question: str
    question_order: int
    
    class Config:
        from_attributes = True


class TreatmentResponse(BaseModel):
    """Treatment recommendation"""
    id: int
    name: str
    description: str
    dosage: Optional[str] = None
    duration: Optional[str] = None
    contraindications: Optional[dict] = None
    
    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    """Safety alert"""
    id: int
    alert_type: str
    message: str
    severity: str
    
    class Config:
        from_attributes = True


class AIAnalysisResponse(BaseModel):
    """Complete RAG analysis result"""
    id: int
    disease: str
    disease_label: str
    confidence: float
    clinical_questions: List[ClinicalQuestionResponse]
    treatments: List[TreatmentResponse]
    alerts: List[AlertResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AIAnalysisSimple(BaseModel):
    """Simplified analysis (for quick responses)"""
    disease: str
    disease_label: str
    confidence: float
    clinical_questions: List[str]
    treatments: List[dict]
    alerts: List[dict]
