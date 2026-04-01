from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, func, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid
import enum
from sqlalchemy import Float

class ImageSource(str, enum.Enum):
    """Source de l'image (fiabilité)."""
    DOCTOR = "doctor"  # Haute fiabilité
    PATIENT = "patient"  # Fiabilité moindre (suivi)


class SkinImage(Base):
    """Modèle pour les photos cutanées."""
    __tablename__ = "skin_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=True)
    minio_url = Column(String(500), nullable=True)  # URL ou chemin (optional si image_data utilisée)
    image_data = Column(LargeBinary, nullable=True)  # Image stockée en BYTEA
    source = Column(Enum(ImageSource), default=ImageSource.DOCTOR, nullable=False)
    cnn_label = Column(String(100), nullable=True)  # Classe prédite par le CNN
    cnn_confidence = Column(Float, nullable=True)  # Score de confiance (0-1)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    severity_score = Column(Float, nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="skin_images")
    consultation = relationship("Consultation", back_populates="skin_images")
    ai_results = relationship("AIResult", back_populates="skin_image")

    def __repr__(self):
        return f"<SkinImage {self.id}>"
