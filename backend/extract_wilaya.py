from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'algerianwilaya') ORDER BY enumsortorder"))
    values = [row[0] for row in result]
    for val in values:
        print(f'    {val} = "{val}"')
