"""
Migration script to add consultation_number auto-incrementing column to consultations table
"""
from sqlalchemy import text
from app.db.database import engine

def migrate():
    """Add consultation_number column to consultations table."""
    with engine.connect() as connection:
        try:
            # Check if column already exists
            result = connection.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='consultations' AND column_name='consultation_number'
                """)
            )
            
            if result.fetchone():
                print("✅ Column 'consultation_number' already exists in consultations table")
                return
            
            # Create sequence for consultation_number
            print("Creating sequence for consultation_number...")
            connection.execute(
                text("""
                    CREATE SEQUENCE IF NOT EXISTS consultations_consultation_number_seq
                    INCREMENT 1
                    START 1
                    MINVALUE 1
                """)
            )
            
            # Add the consultation_number column
            print("Adding consultation_number column to consultations table...")
            connection.execute(
                text("""
                    ALTER TABLE consultations 
                    ADD COLUMN consultation_number INTEGER NOT NULL UNIQUE DEFAULT nextval('consultations_consultation_number_seq')
                """)
            )
            
            # Update the sequence to continue from current max value
            print("Updating sequence...")
            connection.execute(
                text("""
                    SELECT setval('consultations_consultation_number_seq', 
                    COALESCE((SELECT MAX(consultation_number) FROM consultations), 1) + 1)
                """)
            )
            
            # Set default for future inserts
            connection.execute(
                text("""
                    ALTER TABLE consultations 
                    ALTER COLUMN consultation_number SET DEFAULT nextval('consultations_consultation_number_seq')
                """)
            )
            
            connection.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            connection.rollback()

if __name__ == "__main__":
    migrate()
