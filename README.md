
# BEEBOX LAON - Application de Gestion de Parc

Cette application est un outil complet conçu pour la gestion d'un parc de location de boxes de stockage. Elle permet aux administrateurs et aux agents partenaires de gérer efficacement les boxes, les locataires, les agences, tout en intégrant des fonctionnalités d'assistance par IA.

## ✨ Fonctionnalités Principales

- **Tableau de Bord Visuel :** Vue d'ensemble du parc de boxes avec un système de filtres avancés et des indicateurs de statut en temps réel.
- **Gestion Complète des Locataires :** Création, modification, et archivage des locataires. Suivi détaillé des contrats, des documents et des statuts de paiement.
- **Gestion des Agences et Agents :** Administration des agences partenaires et de leurs agents, avec gestion des commissions et des accès.
- **Analyse de Données & Rapports :**
    - Statistiques clés (taux d'occupation, revenus, etc.).
    - Graphiques d'évolution historique.
    - Génération de rapports PDF personnalisés (inventaire, liste de locataires).
- **🤖 Assistant IA (Google Gemini) :**
    - **Chatbot d'Aide :** Un assistant conversationnel pour répondre aux questions sur la gestion du parc.
    - **Analyseur de Rapports :** Un outil puissant qui lit les rapports de gérance PDF des agences, en extrait les données et les compare avec la base de données de l'application pour détecter les anomalies.
- **Journal d'Activité :** Historique complet de toutes les actions importantes effectuées sur la plateforme pour une traçabilité totale.
- **Gestion de Contenu :** Module pour ajouter et gérer des liens vers des visites guidées vidéo.

## 🛠️ Stack Technique

- **Frontend :** React 18, TypeScript
- **Styling :** TailwindCSS (via CDN)
- **Backend & Base de Données :** Firebase (Firestore, Authentication, Storage)
- **API IA :** Google Gemini API (`@google/genai`)
- **Dépendances Notables :** `jspdf`, `jspdf-autotable`, `pdfjs-dist`

## 📂 Structure du Projet

```
.
├── components/         # Composants React réutilisables (modals, tuiles, etc.)
├── hooks/              # Hooks personnalisés (ex: données de démo)
├── pages/              # Vues principales de l'application (Boxes, Locataires, etc.)
├── services/           # Logique externe (Firebase, Gemini, PDF, Notifications)
├── App.tsx             # Composant racine, gestion de l'état principal
├── index.html          # Point d'entrée HTML, chargement des scripts et importmap
├── index.tsx           # Rendu de l'application React
├── types.ts            # Définitions des types et interfaces TypeScript
├── CREDENTIALS_AND_SETUP.md # Fichier de configuration et d'identifiants
└── README.md           # Ce fichier
```

## 🚀 Installation et Lancement

Ce projet est conçu pour fonctionner sans étape de build complexe grâce à l'utilisation d'un `importmap`.

1.  **Prérequis :**
    - Un serveur web local simple. Vous pouvez utiliser l'extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) pour VSCode ou un serveur python (`python -m http.server`).
    - Un projet Firebase configuré.
    - Une clé d'API pour Google Gemini.

2.  **Configuration :**
    - **Firebase :** Ouvrez le fichier `services/firebase.ts` et remplacez l'objet `firebaseConfig` par les informations de votre propre projet Firebase.
    - **Clé API Gemini :** La plateforme sur laquelle ce code s'exécute doit fournir une variable d'environnement `process.env.API_KEY` contenant votre clé API Gemini.

3.  **Lancement :**
    - Servez le dossier racine du projet à l'aide de votre serveur web local.
    - Ouvrez votre navigateur à l'adresse fournie par le serveur (ex: `http://127.0.0.1:5500`).

## ⚠️ Problèmes Connus et Axes d'Amélioration (TODO)

-   **[CRITIQUE] Sécurité :** La création d'utilisateurs `Agent` se fait côté client. **Ceci doit être migré vers des Firebase Cloud Functions** pour des raisons de sécurité évidentes.
-   **Gestion de l'état :** L'état global est centralisé dans `App.tsx`, entraînant du "prop drilling". Une refactorisation avec `React.Context` ou une bibliothèque comme Zustand est recommandée.
-   **Logique Métier :** La mise à jour des statuts de paiement devrait être gérée par une Cloud Function planifiée (cron job) plutôt que côté client.
-   **Téléversement de Fichiers :** La logique de téléversement des justificatifs vers Firebase Storage est à implémenter.
-   **Flux d'Authentification :** Le système de connexion est actuellement contourné pour le développement. Il doit être pleinement intégré.
-   **Notifications :** Remplacer les `alert()` par un système de notifications (toasts) plus moderne pour une meilleure expérience utilisateur.

