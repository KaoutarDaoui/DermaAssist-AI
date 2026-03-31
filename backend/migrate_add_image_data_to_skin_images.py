"""
Migration script to add image_data BYTEA column to skin_images table
"""
from sqlalchemy import text
from app.db.database import engine

def migrate():
    """Add image_data BYTEA column to skin_images table."""
    with engine.connect() as connection:
        try:
            # Check if column already exists
            result = connection.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='skin_images' AND column_name='image_data'
                """)
            )
            
            if result.fetchone():
                print("✅ Column 'image_data' already exists in skin_images table")
                return
            
            # Add the image_data BYTEA column
            print("Adding image_data BYTEA column to skin_images table...")
            connection.execute(
                text("""
                    ALTER TABLE skin_images 
                    ADD COLUMN image_data BYTEA
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
    print("Running migration: Add image_data BYTEA to skin_images")
    print("=" * 50)
    migrate()
    print("=" * 50)
