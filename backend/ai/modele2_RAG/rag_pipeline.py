"""
Step 3 — Query Pipeline + Step 4 — Generation
Diagnosis-aware retriever + Gemini Flash structured clinical response.
"""

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import chromadb
import google.generativeai as genai
import httpx
from dotenv import load_dotenv

# Import alert engine (PatientContext + moteur d'alertes)
import sys
sys.path.insert(0, str(Path(__file__).parent))
from alert_engine import (
    PatientContext,
    build_patient_alerts,
    check_condition_contraindications,
)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env", override=False)
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").strip().lower()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
CLAUDE_API_KEY = (
    os.environ.get("CLAUDE_API_KEY", "").strip()
    or os.environ.get("ANTHROPIC_API_KEY", "").strip()
)
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-3-5-haiku-latest").strip()
CHROMA_PATH = Path(__file__).parent.parent / "chroma_store"
COLLECTION_NAME = "dermassist_kb"

# ─────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────

@dataclass
class Module1Output:
    condition_id: str
    condition_name: str
    confidence: float
    top_alternatives: list = field(default_factory=list)

@dataclass
class RAGResponse:
    confidence_level: str
    questions: list
    analyse_initiale: str
    analyse_affinee: str
    medicaments: list
    alertes_medicaments: list
    orientation: str
    urgence: str
    analyse_affinee_data: dict = field(default_factory=dict)
    alertes_maladie: list = field(default_factory=list)
    alertes_patient: list = field(default_factory=list)


# ─────────────────────────────────────────────
# STEP 3 — DIAGNOSIS-AWARE RETRIEVER
# ─────────────────────────────────────────────

class DiagnosisAwareRetriever:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        self.collection = self.client.get_or_create_collection(COLLECTION_NAME)
        self.kb = self._load_kb()

    def _load_kb(self):
        kb_path = Path(__file__).parent / "knowledge_base.json"
        with open(kb_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_condition_data(self, condition_id: str):
        for m in self.kb["maladies"]:
            if m["id"] == condition_id:
                return m
        return None

    def classify_confidence(self, condition_data: dict, confidence: float) -> str:
        seuils = condition_data.get("seuil_confiance", {"eleve": 0.80, "ambigu": 0.55})
        if confidence >= seuils["eleve"]: return "eleve"
        elif confidence >= seuils["ambigu"]: return "ambigu"
        return "faible"

    def build_contextual_query(self, module1, patient, confidence_level: str) -> str:
        parts = [
            f"protocole traitement {module1.condition_name}",
            f"confiance {confidence_level}",
            f"patient âge {patient.age} ans",
            f"Fitzpatrick {getattr(patient, 'fitzpatrick', 'unknown')}",
        ]
        if hasattr(patient, 'antecedents') and patient.antecedents:
            parts.append(f"antécédents: {', '.join(patient.antecedents)}")
        # Add structured comorbidities to query
        comorbidites = []
        for field_name in ["insuffisance_cardiaque","insuffisance_renale","insuffisance_hepatique","diabete","hypertension","coronaropathie"]:
            if getattr(patient, field_name, None) is True:
                comorbidites.append(field_name.replace("_", " "))
        if comorbidites:
            parts.append(f"comorbidités: {', '.join(comorbidites)}")
        if confidence_level in ("ambigu", "faible"):
            parts.append("diagnostic différentiel questions cliniques")
        return " — ".join(parts)

    def retrieve(self, module1, patient, n_results: int = 4) -> dict:
        condition_data = self.get_condition_data(module1.condition_id)
        if not condition_data:
            raise ValueError(f"Condition '{module1.condition_id}' non trouvée dans la KB")

        confidence_level = self.classify_confidence(condition_data, module1.confidence)
        query = self.build_contextual_query(module1, patient, confidence_level)

        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"condition_id": module1.condition_id}
        )
        retrieved_chunks = results["documents"][0] if results["documents"] else []

        questions_key = "confiance_elevee" if confidence_level == "eleve" else "confiance_ambigue"
        questions = condition_data.get("questions", {}).get(questions_key, [])
        medicaments = condition_data.get("medicaments", [])

        # Alertes niveau maladie (comorbidités avant prescription)
        alertes_maladie = check_condition_contraindications(condition_data, patient)

        # Alertes niveau médicament (drug × patient — moteur complet)
        alertes_med = build_patient_alerts(medicaments, patient)

        return {
            "condition_data": condition_data,
            "confidence_level": confidence_level,
            "retrieved_chunks": retrieved_chunks,
            "questions": questions,
            "medicaments": medicaments,
            "alertes_maladie": alertes_maladie,
            "alertes_patient": alertes_med,
        }


# ─────────────────────────────────────────────
# STEP 4 — GENERATION (Gemini Flash)
# ─────────────────────────────────────────────

ANALYSE_INITIALE_PROMPT = """Tu es un assistant clinique expert en dermatologie. 
Tu ASSISTES le médecin dermatologue — tu ne remplaces pas son jugement.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.

Contexte patient:
- Âge: {age} ans | Sexe: {sexe} | Fitzpatrick: {fitzpatrick}
- Antécédents: {antecedents}
- Comorbidités: {comorbidites}

Résultat CNN Module 1:
- Diagnostic: {condition_name} (ICD: {icd10})
- Confiance: {confidence_pct}% ({confidence_level})
- Alternatives: {alternatives}

Données cliniques récupérées:
{retrieved_chunks}

Ta tâche: Génère une ANALYSE INITIALE COURTE pour le médecin (4-6 lignes max).
Elle doit:
1. Rappeler les éléments clés de la lésion détectée
2. Mentionner le niveau de confiance et ce que ça implique
3. Orienter vers les 1-2 points cliniques les plus importants à vérifier
4. Si comorbidités présentes, mentionner l'impact sur la prise en charge
5. Indiquer l'urgence

Format JSON attendu:
{{
  "analyse_initiale": "texte de l'analyse initiale",
  "urgence_display": "🔴 Critique" | "🟠 Élevée" | "🟡 Modérée" | "🟢 Faible",
  "points_cles": ["point 1", "point 2", "point 3"]
}}"""

ANALYSE_AFFINEE_PROMPT = """Tu es un assistant clinique expert en dermatologie.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.

Contexte complet:
- Patient: {age} ans, {sexe}, Fitzpatrick {fitzpatrick}
- Antécédents: {antecedents}
- Comorbidités actives: {comorbidites}
- Diagnostic CNN: {condition_name} ({confidence_pct}% confiance — {confidence_level})
- Alternatives CNN à considérer: {alternatives}
- Ville: {ville}

Réponses aux questions cliniques:
{answers_text}

Données KB récupérées:
{retrieved_chunks}

Template d'analyse affinée:
{analyse_template}

Ta tâche: Génère une ANALYSE AFFINÉE COURTE (6-8 lignes) qui:
1. Intègre les réponses aux questions cliniques dans le raisonnement
2. Tient compte des comorbidités pour adapter le traitement proposé
3. Signale les médicaments à éviter vu les comorbidités
4. Précise le plan de prise en charge recommandé
5. Donne un petit paragraphe qui explique si la confiance diagnostique augmente ou diminue
6. Si la confiance baisse, priorise les alternatives à revoir

Format JSON attendu:
{{
  "analyse_affinee": "texte de l'analyse affinée personnalisée",
    "paragraphe_confiance": "petit paragraphe reliant réponses patient et diagnostic (3-4 phrases)",
    "confiance_revisee_pct": 0,
    "decision_diagnostique": "diagnostic_renforce" | "diagnostic_incertain" | "revoir_alternatives",
    "alternatives_prioritaires": [
        {{"nom": "alternative 1", "priorite": 1, "raison": "raison clinique"}},
        {{"nom": "alternative 2", "priorite": 2, "raison": "raison clinique"}}
    ],
  "plan_prise_en_charge": ["étape 1", "étape 2", "..."],
  "delai_urgence": "ex: Biopsie dans les 2 semaines",
  "medicaments_a_eviter": ["med1 (raison)", "med2 (raison)"],
  "note_algerie": "note locale si pertinente, sinon null"
}}"""


class ClinicalGenerator:
    def __init__(self):
        self.model = None
        self.model_name = None
        self.model_error = None
        self.provider = LLM_PROVIDER if LLM_PROVIDER in {"gemini", "claude"} else "gemini"

        if self.provider == "claude":
            self._init_claude()
            # Safety fallback if Claude is misconfigured.
            if self.model_error and GEMINI_API_KEY:
                self.provider = "gemini"
                self._init_gemini()
        else:
            self._init_gemini()
            # Safety fallback if Gemini is misconfigured.
            if self.model_error and CLAUDE_API_KEY:
                self.provider = "claude"
                self._init_claude()

    def _init_gemini(self) -> None:
        self.model = None
        self.model_name = None
        self.model_error = None
        if not GEMINI_API_KEY:
            self.model_error = "GEMINI_API_KEY non configurée"
            return

        try:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model_name = self._select_model_name()
            self.model = genai.GenerativeModel(self.model_name)
        except Exception as e:
            self.model_error = f"Gemini init failed: {str(e)}"

    def _init_claude(self) -> None:
        self.model = "anthropic_http"
        self.model_name = CLAUDE_MODEL
        self.model_error = None
        if not CLAUDE_API_KEY:
            self.model = None
            self.model_error = "CLAUDE_API_KEY non configurée"
            return

        selected_model, select_error = self._select_claude_model_name(CLAUDE_MODEL)
        if selected_model:
            self.model_name = selected_model
        if select_error:
            # Non-blocking: keep running even if model discovery failed.
            self.model_error = select_error

    def _select_model_name(self) -> str:
        preferred_models = [
            "models/gemini-2.0-flash",
            "models/gemini-2.5-flash",
            "models/gemini-flash-latest",
            "models/gemini-2.0-flash-lite",
            "models/gemini-2.0-flash-001",
        ]

        available_models = []
        try:
            for model in genai.list_models():
                methods = getattr(model, "supported_generation_methods", []) or []
                if "generateContent" in methods:
                    available_models.append(model.name)
        except Exception:
            available_models = []

        if available_models:
            available_set = set(available_models)
            for preferred in preferred_models:
                if preferred in available_set:
                    return preferred

            flash_models = [m for m in available_models if "flash" in m.lower()]
            if flash_models:
                return sorted(flash_models)[0]

            return sorted(available_models)[0]

        # Fallback when list_models is unavailable.
        return "models/gemini-2.0-flash"

    def _select_claude_model_name(self, requested_model: str) -> tuple[str, Optional[str]]:
        headers = {
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
        }
        preferred_haiku = [
            "claude-haiku-4-5-20251001",
            "claude-3-haiku-20240307",
        ]

        try:
            response = httpx.get("https://api.anthropic.com/v1/models", headers=headers, timeout=20)
            if response.status_code >= 400:
                return requested_model, f"Claude model discovery failed ({response.status_code})"

            data = response.json().get("data", [])
            available = [m.get("id") for m in data if isinstance(m, dict) and m.get("id")]
            if not available:
                return requested_model, None

            if requested_model in available:
                return requested_model, None

            for candidate in preferred_haiku:
                if candidate in available:
                    return candidate, None

            haiku_models = sorted([m for m in available if "haiku" in m.lower()])
            if haiku_models:
                return haiku_models[0], None

            return available[0], None
        except Exception as e:
            return requested_model, f"Claude model discovery error: {str(e)}"

    def _strip_code_fences(self, text: str) -> str:
        stripped = (text or "").strip()
        if stripped.startswith("```"):
            stripped = stripped.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return stripped

    def _attach_source(self, payload: dict) -> dict:
        payload["_llm_provider"] = self.provider
        payload["_llm_model"] = self.model_name
        return payload

    def _build_comorbidites_str(self, patient: PatientContext) -> str:
        active = []
        for field_name in ["insuffisance_cardiaque","insuffisance_renale","insuffisance_hepatique",
                           "diabete","hypertension","coronaropathie","depression","retinopathie",
                           "deficit_g6pd","porphyrie","allergie_penicilline","immunodepression","artere_periph"]:
            if getattr(patient, field_name, None) is True:
                active.append(field_name.replace("_", " "))
        return ", ".join(active) if active else "aucune connue"

    def _call_gemini(self, prompt: str) -> dict:
        if not self.model:
            return self._attach_source({"error": self.model_error or "Gemini model unavailable"})
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(temperature=0.2, max_output_tokens=1000),
                request_options={"timeout": 20},
            )
            text = self._strip_code_fences(response.text)
            return self._attach_source(json.loads(text))
        except Exception as e:
            # Keep the pipeline responsive even if external generation fails.
            model_info = self.model_name or "unknown_model"
            return self._attach_source({"error": f"Gemini call failed ({model_info}): {str(e)}"})

    def _call_claude(self, prompt: str) -> dict:
        if not CLAUDE_API_KEY:
            return self._attach_source({"error": "CLAUDE_API_KEY non configurée"})

        headers = {
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model_name or "claude-3-5-haiku-latest",
            "max_tokens": 1000,
            "temperature": 0.2,
            "messages": [{"role": "user", "content": prompt}],
        }
        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload,
                )

            if response.status_code >= 400:
                err_text = response.text[:300]
                return self._attach_source(
                    {
                        "error": f"Claude call failed ({response.status_code}): {err_text}",
                    }
                )

            data = response.json()
            content_blocks = data.get("content", []) if isinstance(data, dict) else []
            text_parts = []
            for block in content_blocks:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block.get("text", ""))

            raw_text = "\n".join(text_parts)
            cleaned_text = self._strip_code_fences(raw_text)
            return self._attach_source(json.loads(cleaned_text))
        except Exception as e:
            return self._attach_source({"error": f"Claude call failed: {str(e)}"})

    def _call_llm(self, prompt: str) -> dict:
        if self.provider == "claude":
            return self._call_claude(prompt)
        return self._call_gemini(prompt)

    def generate_analyse_initiale(self, module1, patient, condition_data, confidence_level, retrieved_chunks) -> dict:
        alternatives_str = ", ".join(f"{a['name']} ({int(a['confidence']*100)}%)" for a in module1.top_alternatives[:2]) or "aucune"
        patient_sexe = getattr(patient, 'sexe', 'unknown')
        patient_fitzpatrick = getattr(patient, 'fitzpatrick', 'unknown')
        patient_antecedents = getattr(patient, 'antecedents', [])
        prompt = ANALYSE_INITIALE_PROMPT.format(
            age=patient.age, sexe=patient_sexe, fitzpatrick=patient_fitzpatrick,
            antecedents=", ".join(patient_antecedents) or "aucun",
            comorbidites=self._build_comorbidites_str(patient),
            condition_name=module1.condition_name, icd10=condition_data.get("icd10", "N/A"),
            confidence_pct=int(module1.confidence * 100), confidence_level=confidence_level,
            alternatives=alternatives_str, retrieved_chunks="\n---\n".join(retrieved_chunks[:2]),
        )
        return self._call_llm(prompt)

    def generate_analyse_affinee(self, module1, patient, condition_data, confidence_level, retrieved_chunks, question_answers) -> dict:
        answers_text = "\n".join([f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')}" for qa in question_answers])
        alternatives_str = ", ".join(
            f"{a.get('name', a.get('condition_name', 'alternative'))} ({int(float(a.get('confidence', 0)) * 100)}%)"
            for a in (module1.top_alternatives or [])[:3]
        ) or "aucune"
        patient_sexe = getattr(patient, 'sexe', 'unknown')
        patient_fitzpatrick = getattr(patient, 'fitzpatrick', 'unknown')
        patient_antecedents = getattr(patient, 'antecedents', [])
        patient_ville = getattr(patient, 'ville', 'unknown')
        prompt = ANALYSE_AFFINEE_PROMPT.format(
            age=patient.age, sexe=patient_sexe, fitzpatrick=patient_fitzpatrick,
            antecedents=", ".join(patient_antecedents) or "aucun",
            comorbidites=self._build_comorbidites_str(patient),
            ville=patient_ville, condition_name=module1.condition_name,
            confidence_pct=int(module1.confidence * 100), confidence_level=confidence_level,
            alternatives=alternatives_str,
            answers_text=answers_text, retrieved_chunks="\n---\n".join(retrieved_chunks),
            analyse_template=condition_data.get("analyse_affinee_template", ""),
        )
        return self._call_llm(prompt)



# ─────────────────────────────────────────────
# MAIN RAG ORCHESTRATOR
# ─────────────────────────────────────────────

class DermAssistRAG:
    def __init__(self):
        self.retriever = DiagnosisAwareRetriever()
        self.generator = ClinicalGenerator()

    def process(self, module1, patient: PatientContext, question_answers: list = None) -> RAGResponse:
        retrieved = self.retriever.retrieve(module1, patient)
        condition_data = retrieved["condition_data"]
        confidence_level = retrieved["confidence_level"]
        chunks = retrieved["retrieved_chunks"]

        analyse_data = self.generator.generate_analyse_initiale(module1, patient, condition_data, confidence_level, chunks)
        analyse_initiale = analyse_data.get("analyse_initiale") or condition_data.get("analyse_initiale", "")

        analyse_affinee = ""
        analyse_affinee_data = {}
        if question_answers:
            affinee_data = self.generator.generate_analyse_affinee(module1, patient, condition_data, confidence_level, chunks, question_answers)
            analyse_affinee = affinee_data.get("analyse_affinee", "")
            analyse_affinee_data = affinee_data if isinstance(affinee_data, dict) else {}

        return RAGResponse(
            confidence_level=confidence_level,
            questions=retrieved["questions"],
            analyse_initiale=analyse_initiale,
            analyse_affinee=analyse_affinee,
            analyse_affinee_data=analyse_affinee_data,
            medicaments=retrieved["medicaments"],
            alertes_medicaments=[],
            orientation=condition_data.get("orientation", ""),
            urgence=condition_data.get("urgence", "faible"),
            alertes_maladie=retrieved["alertes_maladie"],
            alertes_patient=retrieved["alertes_patient"],
        )