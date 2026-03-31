"""
FastAPI Router — Module 2 RAG endpoints
Mount: app.include_router(rag_router, prefix="/ai")
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent / "pipeline"))
from rag_pipeline import DermAssistRAG, Module1Output
from alert_engine import PatientContext, build_patient_alerts

rag_router = APIRouter(tags=["AI — Module 2 RAG"])
_rag: Optional[DermAssistRAG] = None

def get_rag() -> DermAssistRAG:
    global _rag
    if _rag is None:
        _rag = DermAssistRAG()
    return _rag

class Module1Result(BaseModel):
    condition_id: str
    condition_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    top_alternatives: list[dict] = Field(default_factory=list)

class PatientInfo(BaseModel):
    age: int = Field(..., ge=0, le=120)
    sexe: str = Field(..., pattern="^(homme|femme)$")
    fitzpatrick: str
    ville: str
    antecedents: list[str] = Field(default_factory=list)
    medicaments_actuels: list[str] = Field(default_factory=list)
    # Grossesse
    grossesse: Optional[bool] = None
    allaitement: Optional[bool] = None
    # Cardiologie
    insuffisance_cardiaque: Optional[bool] = None
    coronaropathie: Optional[bool] = None
    hypertension: Optional[bool] = None
    artere_periph: Optional[bool] = None
    # Rein / Foie
    insuffisance_renale: Optional[bool] = None
    insuffisance_hepatique: Optional[bool] = None
    # Métabolisme
    diabete: Optional[bool] = None
    hypertriglyceridemie: Optional[bool] = None
    # Neuro / Psy
    depression: Optional[bool] = None
    epilepsie: Optional[bool] = None
    # Ophtalmo
    retinopathie: Optional[bool] = None
    # Hemato
    deficit_g6pd: Optional[bool] = None
    porphyrie: Optional[bool] = None
    # Immuno / Allergies
    allergie_penicilline: Optional[bool] = None
    immunodepression: Optional[bool] = None

class QuestionAnswer(BaseModel):
    question: str
    answer: str

class AnalyseInitialeRequest(BaseModel):
    module1: Module1Result
    patient: PatientInfo

class AnalyseAffineRequest(BaseModel):
    module1: Module1Result
    patient: PatientInfo
    answers: list[QuestionAnswer]

class MedicamentValidationRequest(BaseModel):
    module1: Module1Result
    patient: PatientInfo
    medicaments_selectionnes: list[str]

def _to_patient(p: PatientInfo) -> PatientContext:
    return PatientContext(**{k: getattr(p, k) for k in PatientContext.__dataclass_fields__})

def _to_m1(m: Module1Result) -> Module1Output:
    return Module1Output(condition_id=m.condition_id, condition_name=m.condition_name,
                         confidence=m.confidence, top_alternatives=m.top_alternatives)

@rag_router.post("/rag/analyse-initiale")
async def analyse_initiale(req: AnalyseInitialeRequest, rag: DermAssistRAG = Depends(get_rag)):
    try:
        r = rag.process(_to_m1(req.module1), _to_patient(req.patient))
        return {
            "status": "ok",
            "confidence_level": r.confidence_level,
            "urgence": r.urgence,
            "analyse_initiale": r.analyse_initiale,
            "questions": r.questions,
            "medicaments": r.medicaments,
            "alertes_maladie": r.alertes_maladie,
            "alertes_patient": r.alertes_patient,
            "orientation": r.orientation,
            "alertes_summary": {
                "n_danger": sum(1 for a in r.alertes_patient if a.get("severite")=="danger"),
                "n_warning": sum(1 for a in r.alertes_patient if a.get("severite")=="warning"),
                "n_questions": sum(1 for a in r.alertes_patient if a.get("type")=="question_requise"),
                "n_maladie": len(r.alertes_maladie),
            }
        }
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erreur RAG: {e}")

@rag_router.post("/rag/analyse-affinee")
async def analyse_affinee(req: AnalyseAffineRequest, rag: DermAssistRAG = Depends(get_rag)):
    try:
        answers = [{"question": a.question, "answer": a.answer} for a in req.answers]
        r = rag.process(_to_m1(req.module1), _to_patient(req.patient), question_answers=answers)
        return {"status": "ok", "analyse_affinee": r.analyse_affinee,
                "alertes_patient": r.alertes_patient, "alertes_maladie": r.alertes_maladie}
    except Exception as e:
        raise HTTPException(500, str(e))

@rag_router.post("/rag/valider-medicaments")
async def valider_medicaments(req: MedicamentValidationRequest, rag: DermAssistRAG = Depends(get_rag)):
    try:
        cd = rag.retriever.get_condition_data(req.module1.condition_id)
        if not cd: raise HTTPException(404, "Condition non trouvée")
        patient = _to_patient(req.patient)
        selected = [m for m in cd.get("medicaments",[]) if m["nom"] in req.medicaments_selectionnes]
        alertes = build_patient_alerts(selected, patient)
        return {
            "status": "ok", "medicaments_valides": selected, "alertes": alertes,
            "resume": {
                "n_danger": sum(1 for a in alertes if a.get("severite")=="danger"),
                "n_warning": sum(1 for a in alertes if a.get("severite")=="warning"),
                "n_questions": sum(1 for a in alertes if a.get("type")=="question_requise"),
                "prescription_bloquee": any(a.get("severite")=="danger" and a.get("type")=="alerte_active" for a in alertes),
            }
        }
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, str(e))

@rag_router.get("/rag/questions/{condition_id}")
async def get_questions(condition_id: str, confidence: float = 0.9, rag: DermAssistRAG = Depends(get_rag)):
    cd = rag.retriever.get_condition_data(condition_id)
    if not cd: raise HTTPException(404, f"Condition '{condition_id}' non trouvée")
    cl = rag.retriever.classify_confidence(cd, confidence)
    key = "confiance_elevee" if cl=="eleve" else "confiance_ambigue"
    return {"condition_id": condition_id, "condition_name": cd["nom"],
            "confidence_level": cl, "questions": cd.get("questions",{}).get(key,[])}