"""
Migration script to add consultation_id as auto-incrementing INTEGER to consultations table
"""
from sqlalchemy import text
from app.db.database import engine

def migrate():
    """Add consultation_id column as auto-incrementing INTEGER to consultations."""
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='consultations' AND column_name='consultation_id'
                """)
            )
            
            if result.fetchone():
                print("✅ Column 'consultation_id' already exists")
                return
            
            print("Adding consultation_id as auto-incrementing INTEGER...")
            
            # Step 1: Create a sequence for auto-increment
            connection.execute(
                text("""
                    CREATE SEQUENCE IF NOT EXISTS consultations_consultation_id_seq
                    INCREMENT 1
                    START 1
                    MINVALUE 1
                """)
            )
            
            # Step 2: Add new INTEGER column with sequence
            connection.execute(
                text("""
                    ALTER TABLE consultations 
                    ADD COLUMN consultation_id INTEGER NOT NULL UNIQUE DEFAULT nextval('consultations_consultation_id_seq')
                """)
            )
            
            # Step 3: Update sequence to continue from current max
            connection.execute(
                text("""
                    SELECT setval('consultations_consultation_id_seq', 
                    COALESCE((SELECT MAX(consultation_id) FROM consultations), 0) + 1)
                """)
            )
            
            # Step 4: Modify ai_results.consultation_id to be INTEGER (if needed)
            result = connection.execute(
                text("""
                    SELECT column_name, data_type
                    FROM information_schema.columns 
                    WHERE table_name='ai_results' AND column_name='consultation_id'
                """)
            )
            col_info = result.fetchone()
            
            if col_info and col_info[1] != 'integer':
                # Drop foreign key constraint first
                connection.execute(
                    text("""
                        ALTER TABLE ai_results 
                        DROP CONSTRAINT IF EXISTS ai_results_consultation_id_fkey
                    """)
                )
                
                # Set all values to NULL first (since we can't convert UUID to INTEGER)
                connection.execute(
                    text("""
                        UPDATE ai_results SET consultation_id = NULL
                    """)
                )
                
                # Convert to INTEGER
                connection.execute(
                    text("""
                        ALTER TABLE ai_results 
                        ALTER COLUMN consultation_id TYPE INTEGER USING NULL::INTEGER
                    """)
                )
                
                # Re-add foreign key constraint
                connection.execute(
                    text("""
                        ALTER TABLE ai_results 
                        ADD CONSTRAINT ai_results_consultation_id_fkey 
                        FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id)
                    """)
                )
            
            connection.commit()
            print("✅ Migration completed successfully!")
            print("   - consultation_id is now INTEGER auto-incrementing (1, 2, 3, ...)")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            import traceback
            traceback.print_exc()
            connection.rollback()

if __name__ == "__main__":
    migrate()
