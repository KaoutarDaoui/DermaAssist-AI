# test_view_image.py — place ce fichier dans ton dossier module3
from dotenv import load_dotenv
load_dotenv()

import os
import psycopg2
import psycopg2.extras
from urllib.parse import unquote
from PIL import Image
import io

DATABASE_URL = os.getenv("DATABASE_URL", "")
PATIENT_ID   = os.getenv("PATIENT_ID", "")

def parse_db_url(url):
    decoded = unquote(url)
    rest    = decoded.split("://", 1)[1]
    at_idx  = rest.rfind("@")
    userinfo, hostinfo = rest[:at_idx], rest[at_idx+1:]
    colon   = userinfo.index(":")
    user, password = userinfo[:colon], userinfo[colon+1:]
    host_port, dbname = hostinfo.split("/", 1)
    host, port = host_port.rsplit(":", 1)
    return dict(user=user, password=password, host=host, port=int(port), dbname=dbname)

params = parse_db_url(DATABASE_URL)
conn   = psycopg2.connect(**params, sslmode="require")

with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
    cur.execute("""
        SELECT id, uploaded_at, source, image_data, minio_url
        FROM skin_images
        WHERE patient_id = %s
        ORDER BY uploaded_at ASC
    """, (PATIENT_ID,))
    rows = cur.fetchall()

conn.close()

print(f"✅ {len(rows)} image(s) trouvée(s)\n")

for i, row in enumerate(rows):
    print(f"── Image {i+1} ──────────────────────────")
    print(f"   ID         : {row['id']}")
    print(f"   Date       : {row['uploaded_at']}")
    print(f"   Source     : {row['source']}")
    print(f"   minio_url  : {row['minio_url'] or 'null'}")

    if row["image_data"]:
        img = Image.open(io.BytesIO(bytes(row["image_data"])))
        path = f"image_{i+1}_from_db.png"
        img.save(path)
        print(f"   ✅ Sauvegardée → {path}  ({img.size[0]}x{img.size[1]})")
    else:
        print(f"   ⚠️  Pas de bytea — voir minio_url")