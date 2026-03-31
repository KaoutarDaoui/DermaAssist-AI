"""
Migration script to add patient_id column to ai_results table
"""
from sqlalchemy import text
from app.db.database import engine

def migrate():
    """Add patient_id column to ai_results table."""
    with engine.connect() as connection:
        try:
            # Check if column already exists
            result = connection.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='ai_results' AND column_name='patient_id'
                """)
            )
            
            if result.fetchone():
                print("✅ Column 'patient_id' already exists in ai_results table")
                return
            
            # Add the patient_id column with NULL initially
            print("Adding patient_id column to ai_results table...")
            connection.execute(
                text("""
                    ALTER TABLE ai_results 
                    ADD COLUMN patient_id UUID REFERENCES patients(id)
                """)
            )
            
            # If there are existing records, set patient_id from consultation
            print("Updating existing records...")
            connection.execute(
                text("""
                    UPDATE ai_results ar
                    SET patient_id = c.patient_id
                    FROM consultations c
                    WHERE ar.consultation_id = c.id AND ar.patient_id IS NULL
                """)
            )
            
            connection.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            connection.rollback()

if __name__ == "__main__":
    migrate()
