from sqlalchemy import Column, String, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid
from datetime import datetime


class ChatMessage(Base):
    """Chat messages between patients and AI chatbot"""
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id", ondelete="SET NULL"), nullable=True)
    
    # Message content
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    
    # Metadata
    message_type = Column(String, default="general")  # "faq", "diagnostic", "general"
    context_data = Column(String, nullable=True)  # JSON string of patient context used
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    patient = relationship("Patient", backref="chat_messages")
    consultation = relationship("Consultation", backref="chat_messages")
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, patient_id={self.patient_id}, created_at={self.created_at})>"
