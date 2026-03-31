"""
Migration script to add skin_image_id column to ai_results table
"""
from sqlalchemy import text
from app.db.database import engine

def migrate():
    """Add skin_image_id column to ai_results table."""
    with engine.connect() as connection:
        try:
            # Check if column already exists
            result = connection.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='ai_results' AND column_name='skin_image_id'
                """)
            )
            
            if result.fetchone():
                print("✅ Column 'skin_image_id' already exists in ai_results table")
                return
            
            # Add the skin_image_id column with NULL initially
            print("Adding skin_image_id column to ai_results table...")
            connection.execute(
                text("""
                    ALTER TABLE ai_results 
                    ADD COLUMN skin_image_id UUID REFERENCES skin_images(id)
                """)
            )
            
            # If there are existing records, set skin_image_id from consultation
            print("Updating existing records...")
            connection.execute(
                text("""
                    UPDATE ai_results ar
                    SET skin_image_id = si.id
                    FROM skin_images si
                    WHERE ar.consultation_id = si.consultation_id AND ar.skin_image_id IS NULL
                """)
            )
            
            connection.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            connection.rollback()

if __name__ == "__main__":
    migrate()
