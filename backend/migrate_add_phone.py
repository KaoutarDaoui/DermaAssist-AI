"""
Migration script to add phone column to patients table
"""
from app.db.database import engine
from sqlalchemy import text

def migrate():
    """Add phone column to patients table if it doesn't exist"""
    with engine.connect() as connection:
        try:
            # Add phone column if it doesn't exist
            sql = text("""
                ALTER TABLE patients 
                ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
            """)
            connection.execute(sql)
            connection.commit()
            print("✅ Successfully added 'phone' column to patients table")
        except Exception as e:
            print(f"❌ Error adding phone column: {e}")
            connection.rollback()

if __name__ == "__main__":
    migrate()
