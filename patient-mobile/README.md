# Skin+ Patient Mobile App

Application mobile React Native pour les patients - Suivi des conseils médicaux, check-ins quotidiens, et upload de photos.

## Installation

```bash
npm install
# ou
yarn install
```

## Développement

```bash
npm start
# ou
yarn start
```

Avec Expo, vous pouvez scanner le QR code avec:

- **Expo Go** app sur votre téléphone
- Émulateur Android/iOS

## Build

### Android

```bash
npm run build:android
```

### iOS

```bash
npm run build:ios
```

## Structure du projet

```
src/
├── screens/     # Pages de l'application
├── services/    # API et stores (Zustand)
└── App.js       # Point d'entrée
```

## Variables d'environnement

Créer un fichier `.env.local` :

```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

## Features

- ✅ Authentification (Login / Register)
- ✅ Affichage des conseils médicaux
- ✅ Check-in quotidien
- ✅ Upload de photos (en développement)
- ✅ Gestion du profil
- ✅ Notifications push (en développement)
