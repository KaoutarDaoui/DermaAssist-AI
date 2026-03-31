import sys
sys.path.insert(0, '.')
from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("=== Checking FitzpatrickType enum values ===")
    result = conn.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'fitzpatricktype') ORDER BY enumsortorder"))
    for row in result:
        print(f"  {row[0]}")
    
    print("\n=== Checking YesNoUndefined enum values ===")
    result = conn.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'yes_no_undefined') ORDER BY enumsortorder"))
    for row in result:
        print(f"  {row[0]}")
    
    print("\n=== Checking Sex enum values ===")
    result = conn.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sex') ORDER BY enumsortorder"))
    for row in result:
        print(f"  {row[0]}")
    
    print("\n=== Checking AlgerianWilaya enum values (first 10) ===")
    result = conn.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'algerianwilaya') ORDER BY enumsortorder LIMIT 10"))
    for row in result:
        print(f"  {row[0]}")
