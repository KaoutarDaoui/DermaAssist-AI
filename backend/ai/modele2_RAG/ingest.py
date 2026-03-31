"""
Step 2 — Ingestion Pipeline
Reads the JSON KB, creates condition-level + section-level chunks,
embeds with Gemini text-embedding-004, stores in ChromaDB.
"""

import json
import os
import hashlib
from pathlib import Path
import chromadb
from chromadb.config import Settings
import google.generativeai as genai

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
KB_PATH = Path(__file__).parent.parent / "knowledge_base" / "knowledge_base.json"
CHROMA_PATH = Path(__file__).parent.parent / "chroma_store"
COLLECTION_NAME = "dermassist_kb"


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts using Gemini text-embedding-004."""
    genai.configure(api_key=GEMINI_API_KEY)
    embeddings = []
    for text in texts:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        embeddings.append(result["embedding"])
    return embeddings


def make_chunk_id(condition_id: str, section: str) -> str:
    raw = f"{condition_id}::{section}"
    return hashlib.md5(raw.encode()).hexdigest()[:16]


def build_chunks(maladie: dict) -> list[dict]:
    """
    Returns a list of chunk dicts: {id, text, metadata}
    Each condition generates:
    - 1 overview chunk
    - 1 diagnosis/questions chunk
    - 1 treatment chunk (if meds exist)
    - 1 alerts chunk (if alerts exist)
    """
    chunks = []
    cid = maladie["id"]

    # ── CHUNK 1: Overview ────────────────────────────────────────
    overview_text = (
        f"Condition: {maladie['nom']} (ICD-10: {maladie.get('icd10', 'N/A')})\n"
        f"Catégorie: {maladie['categorie']}\n"
        f"Urgence: {maladie['urgence']}\n"
        f"Analyse initiale: {maladie['analyse_initiale']}\n"
        f"Orientation: {maladie.get('orientation', '')}\n"
    )
    if maladie.get("note_algerie"):
        overview_text += f"Note Algérie: {maladie['note_algerie']}\n"
    if maladie.get("contexte_geographique"):
        overview_text += f"Contexte: {maladie['contexte_geographique']}\n"

    chunks.append({
        "id": make_chunk_id(cid, "overview"),
        "text": overview_text.strip(),
        "metadata": {
            "condition_id": cid,
            "condition_name": maladie["nom"],
            "section": "overview",
            "category": maladie["categorie"],
            "urgence": maladie["urgence"],
            "icd10": maladie.get("icd10", ""),
            "datasets": ",".join(maladie.get("datasets", [])),
            "seuil_eleve": maladie.get("seuil_confiance", {}).get("eleve", 0.8),
            "seuil_ambigu": maladie.get("seuil_confiance", {}).get("ambigu", 0.55),
        }
    })

    # ── CHUNK 2: Clinical Questions ──────────────────────────────
    q_high = maladie.get("questions", {}).get("confiance_elevee", [])
    q_ambig = maladie.get("questions", {}).get("confiance_ambigue", [])

    q_text = f"Questions cliniques pour {maladie['nom']}:\n"
    q_text += "\n[Confiance élevée]\n"
    for q in q_high:
        opts = " | ".join(q["options"])
        q_text += f"- {q['texte']} [{opts}]\n"
    q_text += "\n[Confiance ambiguë]\n"
    for q in q_ambig:
        opts = " | ".join(q["options"])
        q_text += f"- {q['texte']} [{opts}]\n"

    chunks.append({
        "id": make_chunk_id(cid, "questions"),
        "text": q_text.strip(),
        "metadata": {
            "condition_id": cid,
            "condition_name": maladie["nom"],
            "section": "questions",
            "category": maladie["categorie"],
            "urgence": maladie["urgence"],
            "n_questions_high": len(q_high),
            "n_questions_ambig": len(q_ambig),
        }
    })

    # ── CHUNK 3: Treatment ───────────────────────────────────────
    meds = maladie.get("medicaments", [])
    if meds:
        treat_text = f"Traitements pour {maladie['nom']}:\n"
        for med in meds:
            treat_text += (
                f"\n• {med['nom']} ({med['classe']})\n"
                f"  Indication: {med['indication']}\n"
                f"  Posologie: {med['posologie']}\n"
            )
            for alert in med.get("alertes", []):
                treat_text += f"  ⚠ Alerte [{alert['severite']}] {alert['condition']}: {alert['message']}\n"

        chunks.append({
            "id": make_chunk_id(cid, "treatment"),
            "text": treat_text.strip(),
            "metadata": {
                "condition_id": cid,
                "condition_name": maladie["nom"],
                "section": "treatment",
                "category": maladie["categorie"],
                "urgence": maladie["urgence"],
                "n_medicaments": len(meds),
            }
        })

    # ── CHUNK 4: Alerts (drug-patient interactions) ──────────────
    all_alerts = []
    for med in meds:
        for alert in med.get("alertes", []):
            all_alerts.append({
                "medicament": med["nom"],
                "condition": alert["condition"],
                "message": alert["message"],
                "severite": alert["severite"],
            })

    if all_alerts:
        alert_text = f"Alertes médicamenteuses pour {maladie['nom']}:\n"
        for a in all_alerts:
            alert_text += f"• [{a['severite'].upper()}] {a['medicament']} — {a['condition']}: {a['message']}\n"

        chunks.append({
            "id": make_chunk_id(cid, "alerts"),
            "text": alert_text.strip(),
            "metadata": {
                "condition_id": cid,
                "condition_name": maladie["nom"],
                "section": "alerts",
                "category": maladie["categorie"],
                "urgence": maladie["urgence"],
                "n_alerts": len(all_alerts),
                "has_danger_alert": any(a["severite"] == "danger" for a in all_alerts),
            }
        })

    return chunks


def run_ingestion(use_embeddings: bool = True):
    """
    Main ingestion function.
    use_embeddings=False for testing without Gemini API key.
    """
    print("=" * 60)
    print("DermAssist RAG — Ingestion Pipeline")
    print("=" * 60)

    # Load KB
    with open(KB_PATH, "r", encoding="utf-8") as f:
        kb = json.load(f)

    maladies = kb["maladies"]
    print(f"[1/4] Chargement KB: {len(maladies)} maladies")

    # Build chunks
    all_chunks = []
    for maladie in maladies:
        chunks = build_chunks(maladie)
        all_chunks.extend(chunks)
    print(f"[2/4] Chunks générés: {len(all_chunks)} chunks")

    # Init ChromaDB
    CHROMA_PATH.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))

    # Delete existing collection if re-ingesting
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"[3/4] Collection existante supprimée")
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

    # Embed and store
    ids = [c["id"] for c in all_chunks]
    texts = [c["text"] for c in all_chunks]
    metadatas = [c["metadata"] for c in all_chunks]

    if use_embeddings and GEMINI_API_KEY:
        print(f"[4/4] Embedding {len(texts)} chunks avec Gemini text-embedding-004...")
        embeddings = embed_texts(texts)
        collection.add(ids=ids, documents=texts, metadatas=metadatas, embeddings=embeddings)
    else:
        print(f"[4/4] Stockage sans embeddings (mode test — ChromaDB utilisera son propre modèle)")
        collection.add(ids=ids, documents=texts, metadatas=metadatas)

    print(f"\n✅ Ingestion terminée: {collection.count()} chunks dans ChromaDB")
    print(f"   Store: {CHROMA_PATH}")

    # Summary
    sections = {}
    for c in all_chunks:
        s = c["metadata"]["section"]
        sections[s] = sections.get(s, 0) + 1
    print("\nRépartition par section:")
    for s, n in sections.items():
        print(f"  {s}: {n} chunks")

    return collection


if __name__ == "__main__":
    run_ingestion(use_embeddings=bool(GEMINI_API_KEY))