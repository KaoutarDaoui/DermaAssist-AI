"""
Setup script - Create all tables in PostgreSQL database
Run this once to initialize the database schema
"""

import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.db.database import Base
# Import ALL models (order matters for foreign keys)
from app.models.user import User
from app.models.doctor import Doctor  
from app.models.patient import Patient
from app.models.consultation import Consultation
from app.models.skin_image import SkinImage
from app.models.ai_result import AIResult
from app.models.patient_advice import PatientAdvice
from app.models.checkin import CheckIn
from app.models.rag_analysis import AIAnalysis, ClinicalQuestion, Treatment, Alert, KnowledgeChunk


def create_tables():
    """Create all tables in PostgreSQL"""
    try:
        print("🔄 Creating tables in PostgreSQL...")
        
        # Use DIRECT_URL (without pgbouncer) for migrations
        db_url = settings.DIRECT_URL or settings.DATABASE_URL
        
        # Remove pgbouncer parameter if present
        if "pgbouncer=true" in db_url:
            db_url = db_url.replace("?pgbouncer=true", "")
        
        print(f"📡 Connecting to: {db_url.split('@')[1] if '@' in db_url else 'database'}...")
        
        engine = create_engine(db_url, echo=False)
        Base.metadata.create_all(bind=engine)
        
        print("✅ All tables created successfully!")
        print("\nTables created:")
        print("  • users")
        print("  • doctors")
        print("  • patients")
        print("  • consultations")
        print("  • skin_images")
        print("  • ai_results")
        print("  • patient_advice")
        print("  • checkins")
        print("  • ai_analyses (RAG)")
        print("  • clinical_questions (RAG)")
        print("  • treatments (RAG)")
        print("  • alerts (RAG)")
        print("  • knowledge_chunks (RAG + pgvector)")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_tables()
    sys.exit(0 if success else 1)
