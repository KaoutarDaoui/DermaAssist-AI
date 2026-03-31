"""
alert_engine.py — Moteur d'alertes DermAssist
Croise le profil patient (antécédents + données démographiques)
avec les alertes médicaments de la KB.

Utilisé par rag_pipeline.py et rag_router.py.
"""

from dataclasses import dataclass, field
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# MODÈLE PATIENT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class PatientContext:
    age: int
    sexe: str                        # "homme" | "femme"
    fitzpatrick: str                 # "I" à "VI"
    ville: str
    # Antécédents médicaux (entrés par le patient dans l'app mobile)
    antecedents: list[str] = field(default_factory=list)
    medicaments_actuels: list[str] = field(default_factory=list)
    # Champs spécifiques — None = inconnu, True/False = connu
    grossesse: Optional[bool] = None
    allaitement: Optional[bool] = None
    # Antécédents structurés (cochés dans l'interface patient)
    insuffisance_cardiaque: Optional[bool] = None
    insuffisance_renale: Optional[bool] = None
    insuffisance_hepatique: Optional[bool] = None
    diabete: Optional[bool] = None
    hypertension: Optional[bool] = None
    coronaropathie: Optional[bool] = None
    depression: Optional[bool] = None
    epilepsie: Optional[bool] = None
    retinopathie: Optional[bool] = None
    deficit_g6pd: Optional[bool] = None
    porphyrie: Optional[bool] = None
    allergie_penicilline: Optional[bool] = None
    immunodepression: Optional[bool] = None
    artere_periph: Optional[bool] = None
    hypertriglyceridemie: Optional[bool] = None


# ─────────────────────────────────────────────────────────────────────────────
# RÈGLES DE DÉCLENCHEMENT
# Chaque condition d'alerte dans le JSON est mappée à une fonction qui
# prend le patient et retourne : True (alerte), False (pas d'alerte), None (question requise)
# ─────────────────────────────────────────────────────────────────────────────

def _unknown_to_question(value: Optional[bool], condition_label: str):
    """
    Helper: si la valeur est None → question requise, True → alerte, False → pas d'alerte
    """
    if value is True:
        return "triggered"
    if value is False:
        return "clear"
    return "question"   # None = inconnu


TRIGGER_RULES: dict[str, callable] = {

    # ── Grossesse / reproduction ──────────────────────────────────────────────
    "grossesse": lambda p: (
        "triggered" if p.grossesse is True
        else "question" if (p.grossesse is None and p.sexe == "femme" and 15 <= p.age <= 50)
        else "clear"
    ),
    "grossesse_t1": lambda p: (
        "triggered" if p.grossesse is True
        else "question" if (p.grossesse is None and p.sexe == "femme" and 15 <= p.age <= 50)
        else "clear"
    ),
    "grossesse_t3": lambda p: (
        "triggered" if p.grossesse is True
        else "question" if (p.grossesse is None and p.sexe == "femme" and 15 <= p.age <= 50)
        else "clear"
    ),
    "allaitement": lambda p: (
        "triggered" if p.allaitement is True
        else "question" if (p.allaitement is None and p.sexe == "femme" and 15 <= p.age <= 50)
        else "clear"
    ),
    "femme_age_15_50": lambda p: (
        "triggered" if (p.sexe == "femme" and 15 <= p.age <= 50) else "clear"
    ),
    "femme_age_15_45": lambda p: (
        "triggered" if (p.sexe == "femme" and 15 <= p.age <= 45) else "clear"
    ),
    "homme": lambda p: (
        "triggered" if p.sexe == "homme" else "clear"
    ),

    # ── Cardiologie ──────────────────────────────────────────────────────────
    "insuffisance_cardiaque": lambda p: _unknown_to_question(p.insuffisance_cardiaque, "insuffisance_cardiaque"),
    "coronaropathie": lambda p: _unknown_to_question(p.coronaropathie, "coronaropathie"),
    "hypertension": lambda p: _unknown_to_question(p.hypertension, "hypertension"),
    "artere_periph": lambda p: _unknown_to_question(p.artere_periph, "artere_periph"),

    # ── Rein / Foie ───────────────────────────────────────────────────────────
    "insuffisance_renale": lambda p: _unknown_to_question(p.insuffisance_renale, "insuffisance_renale"),
    "insuffisance_hepatique": lambda p: _unknown_to_question(p.insuffisance_hepatique, "insuffisance_hepatique"),

    # ── Métabolisme ───────────────────────────────────────────────────────────
    "diabete": lambda p: _unknown_to_question(p.diabete, "diabete"),
    "hypertriglyceridemie": lambda p: _unknown_to_question(p.hypertriglyceridemie, "hypertriglyceridemie"),

    # ── Neurologie / psychiatrie ──────────────────────────────────────────────
    "depression": lambda p: _unknown_to_question(p.depression, "depression"),
    "epilepsie": lambda p: _unknown_to_question(p.epilepsie, "epilepsie"),

    # ── Ophtalmologie ─────────────────────────────────────────────────────────
    "retinopathie": lambda p: _unknown_to_question(p.retinopathie, "retinopathie"),

    # ── Hématologie / enzymes ────────────────────────────────────────────────
    "deficit_g6pd": lambda p: _unknown_to_question(p.deficit_g6pd, "deficit_g6pd"),
    "porphyrie": lambda p: _unknown_to_question(p.porphyrie, "porphyrie"),

    # ── Immuno / infectieux ───────────────────────────────────────────────────
    "immunodepression": lambda p: _unknown_to_question(p.immunodepression, "immunodepression"),
    "infection_active": lambda p: "clear",  # contexte clinique uniquement

    # ── Allergies ─────────────────────────────────────────────────────────────
    "allergie_penicilline": lambda p: _unknown_to_question(p.allergie_penicilline, "allergie_penicilline"),
    "allergie_penicilline_severe": lambda p: _unknown_to_question(p.allergie_penicilline, "allergie_penicilline"),

    # ── Pédiatrie / poids ────────────────────────────────────────────────────
    "age_moins_8_ans": lambda p: "triggered" if p.age < 8 else "clear",
    "moins_2_ans": lambda p: "triggered" if p.age < 2 else "clear",
    "nourrisson_moins_2_ans": lambda p: "triggered" if p.age < 2 else "clear",
    "nourrisson_moins_2_mois": lambda p: "triggered" if p.age < 1 else "clear",
    "moins_15kg": lambda p: "clear",  # poids non disponible dans ce modèle

    # ── Dermatologie spécifique ───────────────────────────────────────────────
    "peau_foncee": lambda p: "triggered" if p.fitzpatrick in ("IV", "V", "VI") else "clear",
    "peau_noire_phototype_5_6": lambda p: "triggered" if p.fitzpatrick in ("V", "VI") else "clear",
    "visage": lambda p: "triggered",           # toujours afficher — localisation à confirmer
    "visage_plis": lambda p: "triggered",
    "muqueuse": lambda p: "triggered",
    "peau_lesee": lambda p: "triggered",
    "surface_superieure_30_pourcent": lambda p: "clear",  # évalué cliniquement
    "utilisation_prolongee": lambda p: "triggered",       # toujours afficher
    "colite": lambda p: "clear",
    "personne_agee": lambda p: "triggered" if p.age >= 70 else "clear",
    "alcool": lambda p: "clear",               # non renseigné dans ce modèle
}


# Questions associées à chaque condition inconnue
CONDITION_QUESTIONS: dict[str, dict] = {
    "insuffisance_cardiaque": {
        "texte": "Le patient a-t-il des antécédents d'insuffisance cardiaque ou de cardiopathie ?",
        "options": ["Oui, insuffisance cardiaque", "Oui, cardiopathie ischémique", "Oui, trouble du rythme", "Non"],
    },
    "insuffisance_renale": {
        "texte": "Le patient présente-t-il une insuffisance rénale connue ?",
        "options": ["Oui, IRC légère (DFG 30-60)", "Oui, IRC modérée à sévère (DFG < 30)", "Dialyse", "Non"],
    },
    "insuffisance_hepatique": {
        "texte": "Le patient a-t-il une maladie hépatique connue (cirrhose, hépatite chronique) ?",
        "options": ["Oui, cirrhose", "Oui, hépatite chronique", "Oui, autre atteinte hépatique", "Non"],
    },
    "diabete": {
        "texte": "Le patient est-il diabétique ?",
        "options": ["Oui, type 1 (insulinodépendant)", "Oui, type 2", "Diabète équilibré", "Non"],
    },
    "hypertension": {
        "texte": "Le patient est-il hypertendu ?",
        "options": ["Oui, sous traitement", "Oui, non traité", "Antécédent, actuellement contrôlé", "Non"],
    },
    "coronaropathie": {
        "texte": "Le patient a-t-il des antécédents coronariens (infarctus, angor) ?",
        "options": ["Oui, infarctus", "Oui, angor/stent", "Oui, pontage", "Non"],
    },
    "depression": {
        "texte": "Le patient présente-t-il des antécédents de dépression ou de troubles psychiatriques ?",
        "options": ["Oui, dépression suivie", "Oui, antécédent", "Tendances anxieuses", "Non"],
    },
    "retinopathie": {
        "texte": "Le patient a-t-il une rétinopathie connue (diabétique ou autre) ?",
        "options": ["Oui, rétinopathie diabétique", "Oui, autre", "Non"],
    },
    "deficit_g6pd": {
        "texte": "Le patient a-t-il été testé pour le déficit en G6PD ? (Fréquent en Algérie)",
        "options": ["Oui, déficit confirmé", "Oui, test normal", "Non, jamais testé", "Ne sait pas"],
    },
    "porphyrie": {
        "texte": "Le patient a-t-il des antécédents de porphyrie ?",
        "options": ["Oui, confirmée", "Suspicion", "Non"],
    },
    "allergie_penicilline": {
        "texte": "Le patient est-il allergique aux pénicillines ou aux bêta-lactamines ?",
        "options": ["Oui, allergie sévère (anaphylaxie)", "Oui, réaction modérée", "Intolérance (troubles digestifs)", "Non"],
    },
    "immunodepression": {
        "texte": "Le patient est-il immunodéprimé ?",
        "options": ["Oui, VIH/SIDA", "Oui, transplantation + IS", "Oui, chimiothérapie", "Non"],
    },
    "artere_periph": {
        "texte": "Le patient a-t-il une artériopathie oblitérante des membres inférieurs ?",
        "options": ["Oui, diagnostiquée", "Suspicion (claudication)", "Non"],
    },
    "hypertriglyceridemie": {
        "texte": "Le patient a-t-il une hypertriglycéridémie connue ou un bilan lipidique récent ?",
        "options": ["Oui, hypertriglycéridémie connue", "Bilan lipidique non fait", "Non, bilan normal"],
    },
    "grossesse": {
        "texte": "La patiente est-elle enceinte ou allaite-t-elle ?",
        "options": ["Oui, enceinte", "Oui, allaitement", "Non", "Ne sait pas"],
    },
    "allaitement": {
        "texte": "La patiente allaite-t-elle actuellement ?",
        "options": ["Oui", "Non"],
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# MOTEUR PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

def build_patient_alerts(medicaments: list[dict], patient: PatientContext) -> list[dict]:
    """
    Pour chaque médicament × chaque alerte dans le JSON :
    - Évalue si la condition d'alerte est déclenchée, inconnue, ou non applicable
    - Retourne une liste d'alertes structurées pour l'interface médecin

    Types d'alertes retournées :
    - "alerte_active"    → patient a confirmé la condition (ou démographiquement certain)
    - "question_requise" → condition inconnue, médecin doit demander avant de prescrire
    """
    alerts = []
    seen_questions = set()  # éviter doublons de questions pour même condition

    for med in medicaments:
        for alert in med.get("alertes", []):
            condition = alert["condition"]
            severite = alert["severite"]

            # Obtenir la règle
            rule = TRIGGER_RULES.get(condition)
            if rule is None:
                continue  # condition non gérée — skip silencieux

            result = rule(patient)

            if result == "triggered":
                alerts.append({
                    "type": "alerte_active",
                    "medicament": med["nom"],
                    "classe": med.get("classe", ""),
                    "condition": condition,
                    "message": alert["message"],
                    "severite": severite,
                })

            elif result == "question":
                # Ne poser la question qu'une seule fois même si plusieurs meds concernés
                q_key = condition
                q_info = CONDITION_QUESTIONS.get(condition)
                if q_info and q_key not in seen_questions:
                    seen_questions.add(q_key)
                    # Collecter tous les médicaments concernés par cette question
                    concerned_meds = [
                        m["nom"] for m in medicaments
                        if any(a["condition"] == condition for a in m.get("alertes", []))
                    ]
                    alerts.append({
                        "type": "question_requise",
                        "condition": condition,
                        "question": q_info["texte"],
                        "options": q_info["options"],
                        "medicaments_concernes": concerned_meds,
                        "message": f"Cette information est nécessaire avant de prescrire : {', '.join(concerned_meds)}",
                        "severite": severite,
                    })

    # Trier : danger > warning, puis questions
    order = {"danger": 0, "warning": 1}
    alerts.sort(key=lambda a: (
        0 if a["type"] == "alerte_active" else 1,
        order.get(a.get("severite", "warning"), 1)
    ))

    return alerts


def check_condition_contraindications(condition_data: dict, patient: PatientContext) -> list[dict]:
    """
    Vérifie les contre-indications au niveau de la maladie entière
    (champ 'antecedents_a_verifier' dans le JSON).
    Retourne des alertes de niveau maladie avant même d'afficher les médicaments.
    """
    alerts = []
    a_verifier = condition_data.get("antecedents_a_verifier", [])

    for condition in a_verifier:
        rule = TRIGGER_RULES.get(condition)
        if not rule:
            continue
        result = rule(patient)
        if result in ("triggered", "question"):
            q_info = CONDITION_QUESTIONS.get(condition, {})
            alerts.append({
                "type": "alerte_maladie" if result == "triggered" else "question_maladie",
                "condition": condition,
                "message": f"Antécédent de {condition.replace('_', ' ')} détecté — certains traitements peuvent être contre-indiqués.",
                "question": q_info.get("texte", f"Le patient a-t-il un antécédent de {condition} ?"),
                "options": q_info.get("options", ["Oui", "Non", "Ne sait pas"]),
                "severite": "warning",
            })

    return alerts


def patient_from_dict(data: dict) -> PatientContext:
    """Crée un PatientContext depuis un dict (ex: request FastAPI)."""
    return PatientContext(
        age=data.get("age", 0),
        sexe=data.get("sexe", "homme"),
        fitzpatrick=data.get("fitzpatrick", "III"),
        ville=data.get("ville", ""),
        antecedents=data.get("antecedents", []),
        medicaments_actuels=data.get("medicaments_actuels", []),
        grossesse=data.get("grossesse"),
        allaitement=data.get("allaitement"),
        insuffisance_cardiaque=data.get("insuffisance_cardiaque"),
        insuffisance_renale=data.get("insuffisance_renale"),
        insuffisance_hepatique=data.get("insuffisance_hepatique"),
        diabete=data.get("diabete"),
        hypertension=data.get("hypertension"),
        coronaropathie=data.get("coronaropathie"),
        depression=data.get("depression"),
        epilepsie=data.get("epilepsie"),
        retinopathie=data.get("retinopathie"),
        deficit_g6pd=data.get("deficit_g6pd"),
        porphyrie=data.get("porphyrie"),
        allergie_penicilline=data.get("allergie_penicilline"),
        immunodepression=data.get("immunodepression"),
        artere_periph=data.get("artere_periph"),
        hypertriglyceridemie=data.get("hypertriglyceridemie"),
    )