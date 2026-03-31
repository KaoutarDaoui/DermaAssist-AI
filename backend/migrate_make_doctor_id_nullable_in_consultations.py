"""
Migration script to make doctor_id column nullable in consultations table
"""
from sqlalchemy import text
from app.db.database import engine

def migrate():
    """Make doctor_id nullable in consultations table."""
    with engine.connect() as connection:
        try:
            # Check current constraint
            result = connection.execute(
                text("""
                    SELECT is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name='consultations' AND column_name='doctor_id'
                """)
            )
            
            col_info = result.fetchone()
            if col_info and col_info[0] == 'YES':
                print("✅ Column 'doctor_id' is already nullable in consultations table")
                return
            
            # Alter column to be nullable
            print("Making doctor_id nullable in consultations table...")
            connection.execute(
                text("""
                    ALTER TABLE consultations 
                    ALTER COLUMN doctor_id DROP NOT NULL
                """)
            )
            
            connection.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            connection.rollback()

if __name__ == "__main__":
    migrate()
