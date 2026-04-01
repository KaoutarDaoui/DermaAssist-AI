from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    DOCTOR = "doctor"
    PATIENT = "patient"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    username: Optional[str] = None
    is_premium: bool = False


class UserRegister(UserBase):
    password: str


class UserLogin(BaseModel):
    """Support both email and username for login"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: str


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Secondes
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str
