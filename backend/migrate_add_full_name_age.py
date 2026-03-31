"""
Migration to add full_name and age columns to patients table
"""
from app.db.database import engine
from sqlalchemy import text

def migrate():
    """Add full_name and age columns to patients table"""
    with engine.connect() as connection:
        try:
            # Add full_name column
            sql1 = text("""
                ALTER TABLE patients 
                ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)
            """)
            connection.execute(sql1)
            
            # Add age column
            sql2 = text("""
                ALTER TABLE patients 
                ADD COLUMN IF NOT EXISTS age INTEGER
            """)
            connection.execute(sql2)
            
            connection.commit()
            print("✅ Successfully added 'full_name' and 'age' columns to patients table")
        except Exception as e:
            print(f"❌ Error adding columns: {e}")
            connection.rollback()

if __name__ == "__main__":
    migrate()
