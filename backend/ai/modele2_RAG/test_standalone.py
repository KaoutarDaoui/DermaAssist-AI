"""
Tests — DermAssist RAG Module 2 (Standalone)
Run: python tests/test_standalone.py
"""
import sys, json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
sys.path.insert(0, str(Path(__file__).parent))
from alert_engine import PatientContext, build_patient_alerts, check_condition_contraindications

KB_PATH = Path(__file__).parent / "knowledge_base.json"
kb = json.load(open(KB_PATH))
maladies = {m["id"]: m for m in kb["maladies"]}

@dataclass
class Module1Output:
    condition_id: str
    condition_name: str
    confidence: float
    top_alternatives: list = field(default_factory=list)

def classify_confidence(cond_data, conf):
    s = cond_data.get("seuil_confiance", {"eleve":0.80,"ambigu":0.55})
    if conf >= s["eleve"]: return "eleve"
    elif conf >= s["ambigu"]: return "ambigu"
    return "faible"

def build_chunks(maladie):
    import hashlib
    mkid = lambda cid,s: hashlib.md5(f"{cid}::{s}".encode()).hexdigest()[:16]
    cid = maladie["id"]
    chunks = [{"section":"overview"},{"section":"questions"}]
    if maladie.get("medicaments"): chunks.append({"section":"treatment"})
    if any(a for m in maladie.get("medicaments",[]) for a in m.get("alertes",[])): chunks.append({"section":"alerts"})
    return chunks

print("\n" + "🔬 "*15)
print("DermAssist RAG — Test Suite Module 2")
print("🔬 "*15)
passed = total = 0

# TEST 1 — Confidence Classification
total += 1
print("\n[TEST 1] Confidence Classification")
cases = [("melanome",0.92,"eleve"),("melanome",0.65,"ambigu"),("melanome",0.40,"faible"),
         ("acne_vulgaire",0.95,"eleve"),("acne_vulgaire",0.60,"faible")]
ok = all((r:=classify_confidence(maladies[c],v))==e or not print(f"  {'✅' if r==e else '❌'} {c} {v:.2f} → {r}") for c,v,e in cases)
for c,v,e in cases:
    r = classify_confidence(maladies[c],v)
    print(f"  {'✅' if r==e else '❌'} {c} {v:.2f} → {r} (expected {e})")
    if r != e: ok = False
if ok: passed += 1

# TEST 2 — Question Selection
total += 1
print("\n[TEST 2] Question Selection")
ok = True
for cid,level in [("melanome","eleve"),("melanome","ambigu"),("acne_vulgaire","eleve"),("acne_vulgaire","ambigu")]:
    key = "confiance_elevee" if level=="eleve" else "confiance_ambigue"
    qs = maladies[cid].get("questions",{}).get(key,[])
    print(f"  {cid} [{level}]: {len(qs)} questions")
    if not qs: ok = False
if ok: passed += 1

# TEST 3 — Grossesse / sexe / phototype alerts
total += 1
print("\n[TEST 3] Patient Alerts (grossesse, sexe, phototype)")
ok = True
tc3 = [
    ("carcinome_basocellulaire", PatientContext(30,"femme","III","Alger",grossesse=None),
     "question_requise", "Femme 30 ans, grossesse inconnue → question requise"),
    ("carcinome_basocellulaire", PatientContext(45,"homme","IV","Oran"),
     "alerte_active", "Homme 45 ans → Vismodegib sperme warning"),
    ("hyperpigmentation_post_inflammatoire", PatientContext(25,"femme","IV","Constantine",grossesse=True),
     "alerte_active", "Femme enceinte → Trétinoïne CI danger"),
]
for cid,patient,exp_type,label in tc3:
    alerts = build_patient_alerts(maladies[cid]["medicaments"], patient)
    matching = [a for a in alerts if a.get("type")==exp_type]
    s = "✅" if matching else "❌"
    print(f"  {s} {label}")
    for a in alerts[:2]:
        icon = "🔴" if a.get("severite")=="danger" else ("❓" if a.get("type")=="question_requise" else "⚠️ ")
        print(f"     {icon} {a.get('medicament') or a.get('condition','')}: {(a.get('message') or '')[:70]}")
    if not matching: ok = False
if ok: passed += 1

# TEST 4 — Comorbidity Alerts
total += 1
print("\n[TEST 4] Comorbidity Alerts (cardiaque, rénal, hépatique, diabète, G6PD)")
ok = True
tc4 = [
    {"label":"Cardiaque → Leishmaniose → Glucantime DANGER","condition":"leishmaniose_cutanee",
     "patient":PatientContext(62,"homme","IV","Biskra",insuffisance_cardiaque=True),"expect_danger":True},
    {"label":"IRC → Herpès → Valaciclovir DANGER","condition":"herpes_zoster",
     "patient":PatientContext(70,"femme","III","Oran",insuffisance_renale=True),"expect_danger":True},
    {"label":"Diabète + HTA → Pemphigoïde → warnings","condition":"pemphigoide_bulleuse",
     "patient":PatientContext(75,"homme","III","Alger",diabete=True,hypertension=True),"expect_warnings":True},
    {"label":"G6PD → Prurigo → Hydroxychloroquine DANGER","condition":"prurigo_actinique",
     "patient":PatientContext(28,"homme","IV","Tlemcen",deficit_g6pd=True),"expect_danger":True},
    {"label":"Insuf. hépatique → Psoriasis → MTX DANGER","condition":"psoriasis",
     "patient":PatientContext(50,"homme","III","Constantine",insuffisance_hepatique=True),"expect_danger":True},
    {"label":"Comorbidités inconnues → questions requises","condition":"psoriasis",
     "patient":PatientContext(35,"femme","III","Constantine"),"expect_questions":True},
]
for tc in tc4:
    alerts = build_patient_alerts(maladies[tc["condition"]]["medicaments"], tc["patient"])
    has_d = any(a.get("severite")=="danger" and a.get("type")=="alerte_active" for a in alerts)
    has_w = any(a.get("severite")=="warning" and a.get("type")=="alerte_active" for a in alerts)
    has_q = any(a.get("type")=="question_requise" for a in alerts)
    res = not (tc.get("expect_danger") and not has_d) and not (tc.get("expect_warnings") and not has_w) and not (tc.get("expect_questions") and not has_q)
    print(f"  {'✅' if res else '❌'} {tc['label']}")
    for a in alerts[:3]:
        icon = "🔴" if a.get("severite")=="danger" else ("❓" if a.get("type")=="question_requise" else "⚠️ ")
        name = a.get("medicament") or a.get("condition","")
        print(f"     {icon} [{a['type']}] {name}: {(a.get('message') or a.get('question',''))[:70]}")
    if not res: ok = False
if ok: passed += 1

# TEST 5 — check_condition_contraindications
total += 1
print("\n[TEST 5] Alertes niveau maladie")
ok = True
for cid,patient,exp_min in [
    ("leishmaniose_cutanee", PatientContext(58,"homme","IV","Biskra",insuffisance_cardiaque=True), 1),
    ("psoriasis", PatientContext(40,"femme","III","Alger",insuffisance_hepatique=True), 1),
]:
    alerts = check_condition_contraindications(maladies[cid], patient)
    s = "✅" if len(alerts)>=exp_min else "❌"
    print(f"  {s} {cid} → {len(alerts)} alertes maladie")
    for a in alerts:
        print(f"     ⚕ [{a['type']}] {a['condition']}: {a['message'][:70]}")
    if len(alerts)<exp_min: ok=False
if ok: passed += 1

# TEST 6 — Chunk Building
total += 1
print("\n[TEST 6] Chunk Building")
total_chunks = sum(len(build_chunks(m)) for m in kb["maladies"])
print(f"  Total: {total_chunks} chunks pour {len(kb['maladies'])} maladies")
for m in kb["maladies"][:4]:
    c = build_chunks(m)
    print(f"  {m['id']}: {[x['section'] for x in c]}")
if total_chunks > 0: passed += 1

# TEST 7 — Contextual Query with comorbidities
total += 1
print("\n[TEST 7] Contextual Query Building")
def build_query(m1, patient, cl):
    parts = [f"protocole {m1.condition_name}", f"confiance {cl}", f"{patient.age}ans", f"Fitzpatrick {patient.fitzpatrick}"]
    comorbs = [fn.replace("_"," ") for fn in ["insuffisance_cardiaque","insuffisance_renale","insuffisance_hepatique","diabete","hypertension","coronaropathie"] if getattr(patient,fn,None) is True]
    if comorbs: parts.append(f"comorbidités: {', '.join(comorbs)}")
    return " — ".join(parts)

q1 = build_query(Module1Output("acne_vulgaire","Acné vulgaire",0.94), PatientContext(19,"homme","III","Alger"), "eleve")
q3 = build_query(Module1Output("psoriasis","Psoriasis",0.88), PatientContext(50,"homme","III","Alger",insuffisance_hepatique=True), "eleve")
print(f"  [sans comorb] {q1}")
print(f"  [insuf hep]   {q3}")
assert "comorbidités" in q3
passed += 1

# TEST 8 — Full End-to-End Flow
total += 1
print("\n[TEST 8] Full Flow — Homme cardiaque, Leishmaniose, Biskra")
patient = PatientContext(62,"homme","IV","Biskra",insuffisance_cardiaque=True)
cond = maladies["leishmaniose_cutanee"]
cl = classify_confidence(cond, 0.83)
alerts = build_patient_alerts(cond["medicaments"], patient)
alerts_m = check_condition_contraindications(cond, patient)
print(f"  Confiance: {cl} | Urgence: {cond['urgence']}")
print(f"  Alertes médicament: {len(alerts)} | Alertes maladie: {len(alerts_m)}")
print(f"  Danger: {sum(1 for a in alerts if a.get('severite')=='danger')} | Questions: {sum(1 for a in alerts if a.get('type')=='question_requise')}")
for a in alerts:
    icon = "🔴" if a.get("severite")=="danger" else ("❓" if a.get("type")=="question_requise" else "⚠️ ")
    name = a.get("medicament") or a.get("condition","")
    print(f"  {icon} {name}: {(a.get('message') or a.get('question',''))[:75]}")
assert any(a.get("severite")=="danger" for a in alerts)
passed += 1

print("\n" + "="*55)
print(f"RÉSULTAT FINAL: {passed}/{total} tests passed {'✅' if passed==total else '⚠️'}")
print("="*55)