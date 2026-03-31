"""
RAG Analysis Service - Store analysis results in PostgreSQL
"""

from sqlalchemy.orm import Session
from uuid import UUID
from app.models.rag_analysis import (
    AIAnalysis, 
    ClinicalQuestion, 
    Treatment, 
    Alert
)
from typing import Dict, List, Optional


class RAGAnalysisService:
    """Service to save RAG pipeline results to database"""
    
    @staticmethod
    def save_analysis(
        db: Session,
        patient_id: UUID,
        diagnosis: str,
        disease_label: str,
        confidence: float,
        clinical_questions: List[str],
        treatments: List[Dict],
        alerts: List[Dict]
    ) -> AIAnalysis:
        """
        Save complete RAG analysis to database
        
        Args:
            db: Database session
            patient_id: UUID of patient
            diagnosis: Disease ID (e.g., "acne_vulgaire")
            disease_label: Display name (e.g., "Acné vulgaire")
            confidence: Confidence score (0.0-1.0)
            clinical_questions: List of clinical questions
            treatments: List of treatment recommendations
            alerts: List of alerts/contraindications
            
        Returns:
            AIAnalysis object with all relationships saved
        """
        
        # 1. Create main analysis record
        ai_analysis = AIAnalysis(
            patient_id=patient_id,
            disease=diagnosis,
            disease_label=disease_label,
            confidence=confidence
        )
        
        # 2. Add clinical questions
        for idx, question in enumerate(clinical_questions):
            cq = ClinicalQuestion(
                question=question,
                question_order=idx,
                analysis=ai_analysis
            )
            ai_analysis.clinical_questions.append(cq)
        
        # 3. Add treatment recommendations
        for treatment in treatments:
            t = Treatment(
                name=treatment.get("name", ""),
                description=treatment.get("description", ""),
                dosage=treatment.get("dosage"),
                duration=treatment.get("duration"),
                contraindications=treatment.get("contraindications"),
                analysis=ai_analysis
            )
            ai_analysis.treatments.append(t)
        
        # 4. Add alerts/warnings
        for alert in alerts:
            a = Alert(
                alert_type=alert.get("type", "WARNING"),
                message=alert.get("message", ""),
                severity=alert.get("severity", "MEDIUM"),
                analysis=ai_analysis
            )
            ai_analysis.alerts.append(a)
        
        # 5. Save everything to database
        db.add(ai_analysis)
        db.commit()
        db.refresh(ai_analysis)
        
        return ai_analysis
    
    @staticmethod
    def get_analysis_by_id(db: Session, analysis_id: int) -> Optional[AIAnalysis]:
        """Get analysis with all relationships"""
        return db.query(AIAnalysis).filter(
            AIAnalysis.id == analysis_id
        ).first()
    
    @staticmethod
    def get_latest_analysis_for_patient(
        db: Session, 
        patient_id: UUID
    ) -> Optional[AIAnalysis]:
        """Get most recent analysis for a patient"""
        return db.query(AIAnalysis).filter(
            AIAnalysis.patient_id == patient_id
        ).order_by(
            AIAnalysis.created_at.desc()
        ).first()
    
    @staticmethod
    def get_patient_analysis_history(
        db: Session, 
        patient_id: UUID,
        limit: int = 10
    ) -> List[AIAnalysis]:
        """Get patient's analysis history"""
        return db.query(AIAnalysis).filter(
            AIAnalysis.patient_id == patient_id
        ).order_by(
            AIAnalysis.created_at.desc()
        ).limit(limit).all()
