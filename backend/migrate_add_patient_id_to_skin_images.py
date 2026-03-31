"""
Migration script to add patient_id column to skin_images table
"""
import os
from sqlalchemy import text
from app.db.database import engine

def migrate():
    """Add patient_id column to skin_images table."""
    with engine.connect() as connection:
        try:
            # Check if column already exists
            result = connection.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='skin_images' AND column_name='patient_id'
                """)
            )
            
            if result.fetchone():
                print("✅ Column 'patient_id' already exists in skin_images table")
                return
            
            # Add the patient_id column with NOT NULL initially as NULL temporarily
            print("Adding patient_id column to skin_images table...")
            connection.execute(
                text("""
                    ALTER TABLE skin_images 
                    ADD COLUMN patient_id UUID REFERENCES patients(id)
                """)
            )
            
            # If there are existing records, set patient_id from consultation
            print("Updating existing records...")
            connection.execute(
                text("""
                    UPDATE skin_images si
                    SET patient_id = c.patient_id
                    FROM consultations c
                    WHERE si.consultation_id = c.id AND si.patient_id IS NULL
                """)
            )
            
            connection.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            connection.rollback()
            raise

if __name__ == "__main__":
    print("=" * 50)
    print("Running migration: Add patient_id to skin_images")
    print("=" * 50)
    migrate()
    print("=" * 50)
