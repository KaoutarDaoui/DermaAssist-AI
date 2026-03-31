from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
import os


class Settings(BaseSettings):
    """Configuration globale de l'application DermAssist."""

    # API & JWT
    API_TITLE: str = "DermAssist AI API"
    API_VERSION: str = "1.0.0"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/dermassist_db"
    DIRECT_URL: Optional[str] = None  # For migrations (Prisma/Supabase)
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 1800  # 30 minutes
    
    # MinIO
    MINIO_URL: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_IMAGES: str = "dermassist-images"
    MINIO_SECURE: bool = False
    
    # External APIs
    OPENWEATHERMAP_API_KEY: str = ""
    OPENWEATHER_API_URL: str = "https://api.openweathermap.org/data/2.5"
    OPENUV_API_KEY: str = ""
    OPENUV_API_URL: str = "https://api.openuv.io/api/v1"
    OPENAQ_API_URL: str = "https://api.openaq.org/v1"
    
    # LLM
    LLM_PROVIDER: str = "mistral"  # ou "gemini"
    MISTRAL_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"  # Explicitly use UTF-8 encoding
        case_sensitive = True


settings = Settings()
