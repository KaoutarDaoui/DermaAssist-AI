#!/usr/bin/env python3
"""
Migration: Add health condition columns to patients table.
- sexe (Sex enum: masculine/feminine)
- hypertension (YesNoUndefined enum: yes/no/undefined)
- diabete (YesNoUndefined enum: yes/no/undefined)
- insuf_renale (YesNoUndefined enum: yes/no/undefined)
- insuf_cardiaque (YesNoUndefined enum: yes/no/undefined)
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
    """Add health condition columns to patients table."""
    
    try:
        with engine.connect() as conn:
            print("Creating custom types for health conditions...")
            
            # Create custom enum types
            create_sex_enum = text("""
            DO $$ BEGIN
                CREATE TYPE sex AS ENUM ('masculine', 'feminine');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
            """)
            
            create_yes_no_undefined_enum = text("""
            DO $$ BEGIN
                CREATE TYPE yes_no_undefined AS ENUM ('yes', 'no', 'undefined');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
            """)
            
            conn.execute(create_sex_enum)
            conn.execute(create_yes_no_undefined_enum)
            print("✅ Custom enum types created")
            
            # Check if columns already exist
            check_columns = text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'sexe'
            )
            """)
            
            result = conn.execute(check_columns)
            column_exists = result.scalar()
            
            if not column_exists:
                print("Adding health condition columns to patients table...")
                
                alter_table = text("""
                ALTER TABLE patients
                ADD COLUMN sexe sex,
                ADD COLUMN hypertension yes_no_undefined DEFAULT 'undefined',
                ADD COLUMN diabete yes_no_undefined DEFAULT 'undefined',
                ADD COLUMN insuf_renale yes_no_undefined DEFAULT 'undefined',
                ADD COLUMN insuf_cardiaque yes_no_undefined DEFAULT 'undefined';
                """)
                
                conn.execute(alter_table)
                print("✅ Health condition columns added successfully")
            else:
                print("⚠️  Health condition columns already exist, skipping...")
            
            # Commit transaction
            conn.commit()
            print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
