from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, func, Integer, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid
import enum


class ConsultationStatus(str, enum.Enum):
    """États possibles d'une consultation."""
    OPEN = "open"
    AI_DONE = "ai_done"
    ADVICE_SENT = "advice_sent"


# Create sequence for consultation_id
consultation_id_seq = Sequence('consultations_consultation_id_seq')


class Consultation(Base):
    """Modèle pour les consultations médicales."""
    __tablename__ = "consultations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(Integer, consultation_id_seq, server_default=consultation_id_seq.next_value(), nullable=False, unique=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=True)
    date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes = Column(Text, nullable=True)  # Notes cliniques du médecin
    status = Column(Enum(ConsultationStatus), default=ConsultationStatus.OPEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("Doctor", back_populates="consultations")
    skin_images = relationship("SkinImage", back_populates="consultation")
    ai_result = relationship("AIResult", uselist=False, back_populates="consultation")
    patient_advice = relationship("PatientAdvice", back_populates="consultation")

    def __repr__(self):
        return f"<Consultation {self.id}>"
