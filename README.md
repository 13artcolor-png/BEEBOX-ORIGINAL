# 🐝 BeeBox Laon - Système de Gestion de Parc

> Application web de gestion de boxes de stockage avec suivi des locataires, gestion des agences, et tableau de bord analytique.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF)](https://vitejs.dev/)

---

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Structure du Projet](#-structure-du-projet)
- [Technologies](#-technologies)
- [Contribuer](#-contribuer)
- [Licence](#-licence)

---

## ✨ Fonctionnalités

### 🏢 Gestion des Boxes
- Vue d'ensemble interactive des boxes
- Statuts en temps réel (libre, occupé, réservé, maintenance)
- Historique complet par box
- Gestion des détails et modifications

### 👥 Gestion des Locataires
- Ajout et édition de locataires
- Suivi des paiements (payé, dû, en retard)
- Calcul automatique des loyers
- Gestion des dates de location
- Libération automatique des boxes

### 🏛️ Gestion des Agences & Agents
- Création et gestion d'agences
- Ajout d'agents par agence
- Attribution de boxes aux agents
- Suivi des performances

### 📊 Tableau de Bord
- Statistiques en temps réel
- Graphiques d'occupation et revenus
- Journal d'activité complet
- Indicateurs de performance (KPI)

### 🤖 Chatbot IA
- Assistant virtuel intégré
- Powered by Google Gemini
- Réponses contextuelles

### 📄 Génération de Documents
- Exports PDF automatiques
- Rapports personnalisables
- Historiques imprimables

---

## 🏗️ Architecture

L'application utilise une architecture moderne basée sur React Context API :

```
┌─────────────────────────────────────┐
│           App Component             │
├─────────────────────────────────────┤
│         AppProviders (6 Contexts)   │
│  ┌──────────────────────────────┐   │
│  │ - AuthContext                │   │
│  │ - BoxesContext               │   │
│  │ - TenantsContext             │   │
│  │ - AgenciesContext            │   │
│  │ - DataContext                │   │
│  │ - UIContext                  │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│        Pages & Components           │
└─────────────────────────────────────┘
```

### Avantages de cette architecture :
- ✅ Pas de prop drilling
- ✅ État global centralisé
- ✅ Code modulaire et maintenable
- ✅ Séparation des responsabilités
- ✅ Réutilisabilité maximale

---

## 🚀 Installation

### Prérequis

- Node.js 18+ et npm
- Compte Firebase avec projet configuré
- Clé API Google Gemini (optionnel)

### Étapes

1. **Cloner le repository**
   ```bash
   git clone https://github.com/13artcolor-png/beebox-laon-gestion.git
   cd beebox-laon-gestion
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env.local
   ```
   Éditez `.env.local` avec vos vraies clés API.

4. **Configurer Firebase**
   - Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
   - Activez Firestore Database
   - Activez Authentication (Anonyme + Email/Password)
   - Copiez les credentials dans `.env.local`

5. **Lancer en développement**
   ```bash
   npm run dev
   ```

6. **Ouvrir dans le navigateur**
   ```
   http://localhost:3000
   ```

---

## ⚙️ Configuration

### Firebase Rules (Firestore)

Pour le développement :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **ATTENTION** : Pour la production, sécurisez ces règles !

### Firebase Authentication

Activez les méthodes suivantes :
- ✅ Anonyme (pour le développement)
- ✅ Email/Password (recommandé pour production)

---

## 🎮 Utilisation

### Connexion
Par défaut, l'application utilise l'authentification anonyme.

### Navigation
- **📦 Boxes** : Gérer les boxes
- **👥 Locataires** : Gérer les locataires
- **🎬 Vidéos guidées** : Tutoriels
- **📊 Historique** : Journal d'activité
- **🏢 Agences & Agents** : Gestion des agences
- **⚙️ Données & Admin** : Configuration

### Raccourcis Clavier
- `Ctrl + K` : Ouvrir le chatbot
- `Esc` : Fermer les modales

---

## 📁 Structure du Projet

```
beebox-laon-gestion/
├── components/          # Composants React réutilisables
│   ├── AddTenantModal.tsx
│   ├── BoxDetailModal.tsx
│   ├── ChatBot.tsx
│   ├── Header.tsx
│   └── ...
├── contexts/           # Contexts React (État global)
│   ├── AuthContext.tsx
│   ├── BoxesContext.tsx
│   ├── TenantsContext.tsx
│   ├── AgenciesContext.tsx
│   ├── DataContext.tsx
│   ├── UIContext.tsx
│   └── index.tsx
├── pages/              # Pages de l'application
│   ├── BoxesPage.tsx
│   ├── TenantsPage.tsx
│   ├── AgencyPage.tsx
│   └── ...
├── services/           # Services externes
│   ├── firebase.ts
│   ├── geminiService.ts
│   ├── pdfGenerator.ts
│   └── notificationService.ts
├── hooks/              # Custom React Hooks
│   └── useMockData.ts
├── App.tsx             # Composant racine
├── index.tsx           # Point d'entrée
├── types.ts            # Types TypeScript
└── vite.config.ts      # Configuration Vite
```

---

## 🛠️ Technologies

### Frontend
- **React 18.2** - Library UI
- **TypeScript 5.8** - Typage statique
- **Vite 6.2** - Build tool ultra-rapide

### Backend & Services
- **Firebase Firestore** - Base de données NoSQL
- **Firebase Auth** - Authentification
- **Firebase Storage** - Stockage de fichiers

### AI & Génération
- **Google Gemini** - Chatbot IA
- **jsPDF** - Génération de PDF

### Styling
- **Tailwind CSS** - Framework CSS utility-first

---

## 📊 Statistiques du Code

```
Total Lignes de Code :  ~15,000
TypeScript :            99.3%
Composants React :      20+
Contexts :              6
Pages :                 6
Services :              4
```

---

## 🤝 Contribuer

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📝 Roadmap

### Version 1.1 (En cours)
- [ ] Tests unitaires avec Vitest
- [ ] Authentification Email/Password
- [ ] Rôles utilisateurs (Admin, Agent, Viewer)
- [ ] Export Excel

### Version 2.0 (Prévu)
- [ ] Mode sombre
- [ ] Multi-langues (FR, EN)
- [ ] Notifications push
- [ ] Application mobile (React Native)
- [ ] Statistiques avancées

---

## 🐛 Bugs Connus

Aucun bug critique connu actuellement. 

Pour signaler un bug : [Issues](https://github.com/13artcolor-png/beebox-laon-gestion/issues)

---

## 📄 Licence

Ce projet est sous licence MIT. Voir `LICENSE` pour plus de détails.

---

## 👨‍💻 Auteur

**Pierre (13artcolor-png)**
- GitHub: [@13artcolor-png](https://github.com/13artcolor-png)

---

## 🙏 Remerciements

- Firebase pour l'infrastructure backend
- Google Gemini pour l'IA conversationnelle
- La communauté React pour les outils incroyables
- Claude Code pour l'assistance au développement

---

## 📞 Support

Besoin d'aide ?
- 📧 Email : contact@beebox-laon.fr
- 💬 Issues GitHub : [Créer un ticket](https://github.com/13artcolor-png/beebox-laon-gestion/issues)

---

**Made with ❤️ and ☕ by Pierre**

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=13artcolor-png/beebox-laon-gestion&type=Date)](https://star-history.com/#13artcolor-png/beebox-laon-gestion&Date)

---

*Dernière mise à jour : 21 novembre 2025*
