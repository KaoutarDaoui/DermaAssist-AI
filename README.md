# DermaAssist AI

Plateforme complete d'assistance dermatologique avec:

- un backend FastAPI
- un tableau de bord web medecin (React + Vite)
- une application mobile patient (React Native + Expo)

Le projet couvre le parcours principal: comptes doctor/patient, consultations, resultats AI, suivi photo, conseils, check-ins et ecrans mobiles de comparaison.

## Vue d'ensemble

### Stack principale

| Couche               | Technologie                                          |
| -------------------- | ---------------------------------------------------- |
| Backend API          | FastAPI, SQLAlchemy, Pydantic                        |
| Web medecin          | React 18, Vite, Tailwind, Zustand                    |
| Mobile patient       | Expo 49, React Native 0.72, React Navigation         |
| Auth                 | JWT access + refresh tokens                          |
| Donnees              | PostgreSQL (prod) ou SQLite (dev)                    |
| AI et enrichissement | pipeline AI, OpenWeather/OpenUV/OpenAQ, services LLM |

### Structure du repo

```text
DermaAssist-AI/
├── backend/
│   ├── app/
│   │   ├── api/           # Routers FastAPI (auth, mobile, consultations, AI, chat...)
│   │   ├── services/      # Logique metier
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── db/            # Session SQLAlchemy
│   │   └── core/          # Config et securite
│   ├── main.py            # Entree du serveur
│   └── requirements.txt
├── doctor-web/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   ├── public/logo/       # Logos web (ex: white_logoSkin.png)
│   └── package.json
├── patient-mobile/
│   ├── src/
│   │   ├── screens/
│   │   ├── services/
│   │   └── constants/
│   ├── assets/logo/       # Logos mobile (ex: green_logoSkin.png)
│   ├── App.js
│   └── package.json
├── docs/
├── setup.bat
├── setup.sh
└── TROUBLESHOOTING.md
```

## Fonctionnalites actuelles

### Backend

- Authentification complete: register, login (email ou username), refresh token
- Gestion patient/consultation
- Upload d'images de consultation et suivi patient
- Comparaison d'images cutanees patient
- Endpoints mobiles dedies (/mobile/patient/\*)
- Resultats AI, historique AI, chat medecin
- Endpoints health/docs

### Web medecin

- Dashboard, patients, profil patient, consultation, comparaison photo
- Generation/telechargement/impression de rapport consultation
- Correctif nom complet patient dans le rapport
- Notification page, contact/settings/profile pages
- Branding logo web via public/logo/white_logoSkin.png

### Mobile patient

- Auth, accueil, traitement, consultations, details
- Upload photo + ecran comparaison avec selection de 2 images
- Profil + aide/assistance + notifications
- Splash startup avec logo local (assets/logo/green_logoSkin.png)

## Demarrage rapide

### Prerequis

- Node.js 18+
- Python 3.10+
- npm

Services optionnels pour un mode complet:

- PostgreSQL
- MinIO (ou S3 compatible)

### Option A: setup automatique

Windows:

```bash
setup.bat
```

Linux/macOS:

```bash
bash setup.sh
```

### Option B: setup manuel

#### 1) Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

Creer backend/.env (exemple minimal dev):

```env
SECRET_KEY=change-this-secret
DEBUG=True
ENVIRONMENT=development

# Option simple dev (sans Postgres):
DATABASE_URL=sqlite:///./dermassist.db

# Option complete:
# DATABASE_URL=postgresql://user:password@localhost:5432/dermassist_db

REDIS_URL=redis://localhost:6379/0
MINIO_URL=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_IMAGES=dermassist-images
MINIO_SECURE=False

OPENWEATHERMAP_API_KEY=
OPENUV_API_KEY=
MISTRAL_API_KEY=
CLAUDE_API_KEY=
```

Lancer le backend:

```bash
python main.py
```

Backend disponible sur:

- http://localhost:8000
- http://localhost:8000/docs
- http://localhost:8000/redoc

#### 2) Web medecin

```bash
cd doctor-web
npm install
npm install chart.js react-chartjs-2
```

Optionnel: creer doctor-web/.env.local

```env
VITE_API_URL=http://localhost:8000
```

Lancer:

```bash
npm run dev
```

Web dispo sur http://localhost:5173

#### 3) Mobile patient

```bash
cd patient-mobile
npm install
```

Optionnel: creer patient-mobile/.env

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Pour emulateur Android, la valeur par defaut est deja 10.0.2.2:8000.
Pour un telephone physique, utiliser l'IP LAN de votre machine.

Lancer:

```bash
npm start
```

Autres commandes utiles:

```bash
npm run web
npm run android
npm run ios
```

## Scripts utiles

### Racine

- setup.bat: bootstrap Windows
- setup.sh: bootstrap Linux/macOS

### backend/package.json

- npm run dev: uvicorn reload
- npm run start: uvicorn production-like

### doctor-web/package.json

- npm run dev
- npm run build
- npm run preview
- npm run lint
- npm run format

### patient-mobile/package.json

- npm start
- npm run web
- npm run android
- npm run ios
- npm run build

## Endpoints API cles

### Auth

- POST /auth/register
- POST /auth/login
- POST /auth/refresh

### Patients

- GET /patients
- POST /patients
- GET /patients/{patient_id}
- PATCH /patients/{patient_id}
- DELETE /patients/{patient_id}

### Consultations

- POST /consultations
- GET /consultations/{consultation_id}
- GET /consultations/by-patient/{patient_id}
- PATCH /consultations/{consultation_id}/notes

### Images et comparaison

- POST /consultations/{consultation_id}/images
- GET /consultations/{consultation_id}/images
- POST /patients/{patient_id}/skin-images
- GET /patients/{patient_id}/skin-images
- GET /patients/{patient_id}/skin-images/progression
- POST /patients/{patient_id}/skin-images/compare

### Mobile

- GET /mobile/patient/profile
- GET /mobile/patient/consultations
- GET /mobile/patient/advice
- GET /mobile/patient/ai-results-history
- GET /mobile/patient/ai-results/{ai_result_id}
- GET /mobile/patient/ai-medications
- GET /mobile/patient/checkins

### AI et chat

- POST /ai/analyze
- GET /ai/result/{consultation_id}
- GET /ai/env-snapshot
- POST /chat/send-message
- GET /chat/history
- DELETE /chat/history

## Branding et assets logo

- Logo web: doctor-web/public/logo/white_logoSkin.png
- Logo mobile startup: patient-mobile/assets/logo/green_logoSkin.png

## Docs complementaires

- backend/README.md
- doctor-web/README.md
- patient-mobile/README.md
- docs/ARCHITECTURE.md
- docs/AI_IMPLEMENTATION_GUIDE.md
- docs/MINIO_IMPLEMENTATION_GUIDE.md
- TROUBLESHOOTING.md

## Etat actuel

Le projet est activement en evolution avec des ameliorations recentes sur:

- le flux comparaison mobile
- les pages aide/notifications
- l'integration branding logo web/mobile
- la fiabilite du rapport consultation (nom complet patient)

## Contribution

Contributions bienvenue.
Ouvrez une issue ou une PR avec contexte, reproduction et proposition claire.
