"""
Migration script to make consultation_id column nullable in ai_results table
"""
from sqlalchemy import text
from app.db.database import engine

def migrate():
    """Make consultation_id nullable in ai_results table."""
    with engine.connect() as connection:
        try:
            # Check current constraint
            result = connection.execute(
                text("""
                    SELECT is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name='ai_results' AND column_name='consultation_id'
                """)
            )
            
            col_info = result.fetchone()
            if col_info and col_info[0] == 'YES':
                print("✅ Column 'consultation_id' is already nullable in ai_results table")
                return
            
            # Alter column to be nullable
            print("Making consultation_id nullable in ai_results table...")
            connection.execute(
                text("""
                    ALTER TABLE ai_results 
                    ALTER COLUMN consultation_id DROP NOT NULL
                """)
            )
            
            connection.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            connection.rollback()

if __name__ == "__main__":
    migrate()
