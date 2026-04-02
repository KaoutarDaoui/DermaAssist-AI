# Skin+ Doctor Web

Interface web pour les dermatologues - Gestion des dossiers patients, analyse d'images cutanées, et assistance AI.

## Installation

```bash
npm install
npm install chart.js react-chartjs-2
```

## Développement

```bash
npm run dev
```

L'application sera en cours d'exécution sur `http://localhost:5173`

## Build pour la production

```bash
npm run build
```

## Structure du projet

```
src/
├── components/      # Composants réutilisables
├── pages/          # Pages de l'application
├── services/       # Services API et stores
├── styles/         # Fichiers CSS/Tailwind
└── App.jsx         # Composant principal
```

## Variables d'environnement

Créer un fichier `.env.local` :

```
VITE_API_URL=http://localhost:8000
```
