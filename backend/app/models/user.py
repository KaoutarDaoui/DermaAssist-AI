from sqlalchemy import Column, String, DateTime, Enum, func, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
import uuid
import enum


class UserRole(str, enum.Enum):
    """Énumération des rôles d'utilisateur."""
    DOCTOR = "doctor"
    PATIENT = "patient"


class User(Base):
    """Modèle pour les utilisateurs (authentification)."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.PATIENT)
    full_name = Column(String(255), nullable=False)
    is_premium = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<User {self.email}>"
