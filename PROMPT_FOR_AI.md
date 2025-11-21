# Prompt pour IA Spécialisée en Développement : Projet BEEBOX LAON

## 1. Contexte du Projet

**Objectif :** Vous êtes chargé de finaliser et d'améliorer une application web de gestion complète pour "BEEBOX LAON", une entreprise de location de boxes de stockage. L'application est déjà fonctionnelle mais présente des lacunes critiques en matière de sécurité, d'architecture et de complétude fonctionnelle.

**Audience :** L'application est destinée aux administrateurs (gestion totale) et aux agents immobiliers partenaires (gestion limitée à leurs locataires).

**Stack Technologique Actuelle :**
- **Frontend :** React 18, TypeScript.
- **Styling :** TailwindCSS (via CDN).
- **Backend & Base de données :** Firebase (Firestore pour la base de données en temps réel). Le SDK v8 (compat) est utilisé.
- **Intelligence Artificielle :** API Google Gemini (`@google/genai`) pour un chatbot d'assistance et l'analyse de documents.
- **Build :** Pas de bundler (ex: Webpack, Vite). Le projet utilise `importmap` dans `index.html` pour la gestion des modules ES6.
- **PDF :** `jspdf` et `jspdf-autotable` pour la génération de rapports, `pdfjs-dist` pour la conversion de PDF en images côté client.

## 2. Analyse de l'Existant (Ce qui a été réalisé)

### 2.1. Architecture et Structure du Code
- **Point d'entrée :** `index.html` -> `index.tsx` -> `App.tsx`.
- **State Management :** L'état global (boxes, locataires, agents, etc.) est entièrement géré dans le composant racine `App.tsx` via `useState`. Les données et les fonctions de manipulation sont passées aux composants enfants via "prop drilling".
- **Composants :** Le code est structuré avec des dossiers `components/` (éléments réutilisables), `pages/` (vues principales), `services/` (logique externe : Firebase, Gemini, PDF) et `hooks/` (fourniture de données de démo).
- **Base de Données :** L'application se connecte à une base de données Firestore et utilise des listeners en temps réel (`onSnapshot`) pour maintenir les données à jour sans rechargement de la page.

### 2.2. Fonctionnalités Implémentées

- **Gestion du Parc de Boxes (`BoxesPage`)**
  - Affichage en grille de tous les boxes avec leur statut (Libre/Occupé).
  - Filtres multiples (ID, statut, taille, niveau, côté).
  - Alertes visuelles sur les tuiles pour les loyers impayés ou les travaux à prévoir.
  - Accès aux détails d'un box via un modal (`BoxDetailModal`).
  - Possibilité de "libérer" un box, ce qui met fin au contrat du locataire.

- **Gestion des Locataires (`TenantsPage`)**
  - Affichage en tableau de tous les locataires (actifs et passés).
  - Tri et recherche par nom. Filtre par statut (Actif/Passé).
  - Visualisation des informations clés : contact, boxes loués, statut de paiement, dates.
  - Actions : Ajouter un nouveau locataire (`AddTenantModal`), modifier un locataire existant (`EditTenantModal`).

- **Gestion des Agences & Agents (`AgencyPage`)**
  - Interface pour le CRUD (Créer, Lire, Mettre à jour, Supprimer) des agences et des agents.
  - Association claire d'un agent à une agence.

- **Tableau de Bord Administrateur (`DataPage`)**
  - **Statistiques :** Taux d'occupation, revenu mensuel estimé, nombre de locataires.
  - **Visualisation :** Graphique d'évolution sur 12 mois de l'occupation et des revenus.
  - **Rapports :** Tableaux de performance des agents et des boxes les plus populaires.
  - **Génération de PDF :** Téléchargement de rapports d'inventaire des boxes et de listes de locataires.
  - **Gestion du parc :** Interface pour ajuster dynamiquement le nombre total de boxes dans la base de données.
  - **Profil Admin :** Modification des informations de l'administrateur et de son mot de passe.
  - **Zone de Danger :** Fonction pour réinitialiser la base de données avec des données de démo (`useMockData.ts`).

- **Intégration de l'IA (Gemini)**
  1.  **Chatbot d'Assistance (`ChatBot.tsx` & `geminiService.ts`)**
      - Un chatbot flottant qui conserve l'historique de la conversation.
      - Fait appel au modèle Gemini (`gemini-2.5-flash` ou `gemini-2.5-pro` en "mode réflexion") pour répondre aux questions sur la gestion du parc.
  2.  **Analyse de Rapports de Gérance (`DataPage.tsx` & `geminiService.ts`)**
      - **Workflow :** L'utilisateur télécharge un rapport PDF d'une agence.
      - **Client-side :** Le PDF est converti en une série d'images JPEG en base64 via `pdfjs-dist`.
      - **API Gemini :** Les images sont envoyées au modèle `gemini-2.5-flash` avec un prompt demandant d'extraire des informations structurées (N° de box, nom du locataire, montant du loyer).
      - **Sortie Structurée :** La requête spécifie un `responseSchema` JSON pour garantir une sortie fiable.
      - **Analyse :** Le résultat JSON est comparé aux données de Firestore pour identifier les correspondances et les anomalies (ex: box loué dans le rapport mais libre dans l'app, différences de loyer, etc.).

### 2.3. Authentification
- **Contournement Actif :** Le flux de connexion est actuellement **contourné** dans `App.tsx`. Un objet `appUser` est codé en dur avec le rôle `Admin`.
- **Composants Existants :** Les composants `LoginPage.tsx`, `ResetPasswordPage.tsx` et `Login.tsx` (utilisant FirebaseUI) existent mais ne sont pas intégrés dans le flux principal de l'application.

## 3. Problèmes Rencontrés et Points Critiques à Résoudre

Ceci est la partie la plus importante. Vous devez adresser ces points en priorité.

### 3.1. **Faille de Sécurité Majeure : Opérations d'Authentification Côté Client**
- **Problème :** Les fonctions `handleAddAgent` et `handleUpdateAgent` dans `App.tsx` contiennent une logique pour créer et potentiellement modifier des utilisateurs Firebase Auth directement depuis le client. Le code tente même un `auth.createUserWithEmailAndPassword` et mentionne l'impossibilité de changer le mot de passe d'un autre utilisateur.
- **Raison :** C'est une faille de sécurité critique. Le SDK client de Firebase n'est pas conçu pour gérer l'authentification d'autres utilisateurs. Cette logique doit **impérativement** être déplacée côté serveur.
- **Action Requise :**
  1.  Créez des **Firebase Cloud Functions** (en TypeScript ou JavaScript) pour gérer la création, la mise à jour (y compris le changement de mot de passe) et la suppression des utilisateurs `Agent`.
  2.  Ces fonctions doivent être des "Callable Functions", invoquées depuis le client.
  3.  Assurez-vous que ces fonctions vérifient que l'appelant est bien un administrateur authentifié avant d'exécuter l'action.
  4.  Supprimez toute la logique de `auth.createUserWithEmailAndPassword` et les tentatives de mise à jour de mot de passe du code client dans `App.tsx`.

### 3.2. **Architecture du State Management (Prop Drilling)**
- **Problème :** `App.tsx` est un "God Component". Tout l'état de l'application y est centralisé et passé en cascade à travers de multiples niveaux de composants. C'est difficile à maintenir et à faire évoluer.
- **Action Requise :**
  1.  Refactorez la gestion de l'état.
  2.  **Option 1 (Préférée) :** Utilisez `React.Context` pour créer des fournisseurs de données distincts (ex: `BoxesContext`, `TenantsContext`, `AuthContext`). C'est léger et ne nécessite pas de dépendances externes.
  3.  **Option 2 :** Intégrez une bibliothèque de gestion d'état plus robuste comme Zustand ou Redux Toolkit si le projet est amené à grandir considérablement.

### 3.3. **Logique Métier Côté Client**
- **Problème :** La logique de mise à jour des statuts de paiement (`checkPaymentStatuses` dans `App.tsx`) est exécutée dans un `useEffect` côté client. Si aucun administrateur n'ouvre l'application, les statuts ne sont pas mis à jour.
- **Action Requise :**
  1.  Migrez cette logique vers une **Firebase Cloud Function planifiée (scheduled)**.
  2.  Configurez la fonction pour s'exécuter une fois par jour (par exemple, à minuit) et mettre à jour les statuts de paiement de tous les locataires en fonction de la date d'échéance.

### 3.4. **Gestion des Fichiers et Images**
- **Problème :** Le code pour téléverser les justificatifs (identité, assurance) dans `AddTenantModal` et `EditTenantModal` est incomplet ou simulé. Il ne téléverse pas réellement les fichiers.
- **Action Requise :**
  1.  Implémentez la logique complète de téléversement de fichiers