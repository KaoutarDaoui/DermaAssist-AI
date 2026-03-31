from sqlalchemy import Column, DateTime, ForeignKey, Text, func, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid


class AIResult(Base):
    """Modèle pour les résultats de l'analyse AI."""
    __tablename__ = "ai_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(Integer, ForeignKey("consultations.consultation_id"), nullable=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    skin_image_id = Column(UUID(as_uuid=True), ForeignKey("skin_images.id"), nullable=True)
    diagnosis = Column(Text, nullable=True)  # Diagnostic principal proposé
    confidence = Column(JSON, nullable=True)  # Score de confiance global et par classe
    suggested_questions = Column(JSON, nullable=True)  # Liste de questions cliniques suggérées
    treatment_options = Column(JSON, nullable=True)  # Options thérapeutiques proposées
    env_snapshot = Column(JSON, nullable=True)  # Données environnementales au moment de la consultation
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    consultation = relationship("Consultation", back_populates="ai_result")
    patient = relationship("Patient", back_populates="ai_results")
    skin_image = relationship("SkinImage", back_populates="ai_results")

    def __repr__(self):
        return f"<AIResult {self.id}>"
