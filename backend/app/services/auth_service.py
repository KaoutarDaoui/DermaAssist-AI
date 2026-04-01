from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.schemas.user import UserRegister, UserLogin
from fastapi import HTTPException, status
from datetime import timedelta


class AuthService:
    """Service pour l'authentification et la gestion des utilisateurs."""

    @staticmethod
    def register_user(db: Session, user_data: UserRegister) -> dict:
        """Enregistrer un nouvel utilisateur (médecin ou patient)."""
        
        # Vérifier si l'email existe déjà
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Vérifier si le username existe si fourni
        if user_data.username:
            existing_username = db.query(User).filter(User.username == user_data.username).first()
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Créer l'utilisateur
        user = User(
            email=user_data.email,
            username=user_data.username,
            password_hash=hash_password(user_data.password),
            full_name=user_data.full_name,
            role=user_data.role,
            is_premium=user_data.is_premium
        )
        db.add(user)
        db.flush()  # Flush pour obtenir l'ID sans committer
        
        # Créer le profil associé (Doctor ou Patient)
        if user_data.role == UserRole.DOCTOR:
            doctor = Doctor(user_id=user.id)
            db.add(doctor)
        else:
            patient = Patient(user_id=user.id)
            db.add(patient)
        
        db.commit()
        db.refresh(user)
        
        return {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_premium": user.is_premium
        }

    @staticmethod
    def login_user(db: Session, login_data: UserLogin) -> dict:
        """Authentifier un utilisateur et retourner les tokens JWT."""
        
        # Support both email and username login
        user = None
        if login_data.email:
            user = db.query(User).filter(User.email == login_data.email).first()
        elif login_data.username:
            user = db.query(User).filter(User.username == login_data.username).first()
        
        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Créer les tokens
        access_token_data = {
            "sub": str(user.id),
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "is_premium": user.is_premium
        }
        access_token = create_access_token(access_token_data)
        refresh_token = create_refresh_token(access_token_data)
        
        user_response = {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_premium": user.is_premium,
            "created_at": user.created_at.isoformat()
        }
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 30 * 60,  # 30 minutes
            "user": user_response
        }

    @staticmethod
    def refresh_access_token(token: str) -> dict:
        """Renouveler un access token à partir d'un refresh token."""
        from app.core.security import decode_token
        
        payload = decode_token(token)
        
        # Vérifier que c'est un refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Créer un nouvel access token
        access_token_data = {
            "sub": payload["sub"],
            "email": payload["email"],
            "role": payload["role"]
        }
        access_token = create_access_token(access_token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 30 * 60
        }
