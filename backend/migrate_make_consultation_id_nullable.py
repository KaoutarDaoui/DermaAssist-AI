#!/usr/bin/env python3
"""
Migration: Make consultation_id nullable in skin_images table.
The model defines it as nullable=True, but the database has it as NOT NULL.
This migration aligns the database schema with the model.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import text
from app.db.database import engine

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
load_dotenv()

def migrate():
    """Make consultation_id nullable in skin_images table."""
    
    try:
        with engine.connect() as conn:
            print("Modifying consultation_id column to be nullable...")
            
            # Alter table to make consultation_id nullable
            alter_sql = text("""
            ALTER TABLE skin_images
            ALTER COLUMN consultation_id DROP NOT NULL;
            """)
            
            conn.execute(alter_sql)
            conn.commit()
            print("✅ consultation_id is now nullable")
            print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
