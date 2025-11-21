
# Fichier de Configuration et d'Identifiants - BEEBOX LAON

Ce document contient toutes les informations nécessaires pour configurer et se connecter à l'environnement de développement de l'application.

---

## 1. Configuration Firebase

L'objet de configuration suivant doit être placé dans le fichier `services/firebase.ts`. Ces informations sont extraites directement du code source existant.

```javascript
// Contenu pour la variable `firebaseConfig` dans services/firebase.ts

const firebaseConfig = {
  apiKey: "AIzaSyBGD5Ow52xuel1ERGkPEZ2h87-aSYjJVOU",
  authDomain: "beebox-laon-gestion.firebaseapp.com",
  projectId: "beebox-laon-gestion",
  storageBucket: "beebox-laon-gestion.appspot.com",
  messagingSenderId: "352595159783",
  appId: "1:352595159783:web:106de09a5eec4011fd9042",
  measurementId: "G-C6EE6H4GX1"
};
```

### Accès à la Console Firebase

Pour gérer la base de données Firestore, l'authentification et le stockage, utilisez les URL suivantes :

-   **Console Principale :** `https://console.firebase.google.com/project/beebox-laon-gestion`
-   **Base de données Firestore :** `https://console.firebase.google.com/project/beebox-laon-gestion/firestore`
-   **Authentification :** `https://console.firebase.google.com/project/beebox-laon-gestion/authentication`

---

## 2. Clé d'API Google Gemini

L'application est conçue pour utiliser une clé d'API Google Gemini fournie via une variable d'environnement.

-   **Variable Attendue :** `process.env.API_KEY`
-   **Fichiers concernés :** `services/geminiService.ts`

Assurez-vous que l'environnement d'exécution injecte cette variable pour que les fonctionnalités du chatbot et de l'analyseur de rapports fonctionnent.

---

## 3. Identifiants de Connexion de Développement

Le fichier `pages/LoginPage.tsx` contient des identifiants codés en dur pour faciliter le développement. Ces informations sont utilisées pour se connecter à l'application lorsque le flux d'authentification est actif.

-   **Email :** `beeboxlaon@gmail.com`
-   **Mot de passe :** `@Sodomie123`

**Note :** Ces identifiants ne doivent jamais être utilisés en production. Le code actuel contourne la page de connexion, mais ces informations sont présentes pour les futures étapes de développement du flux d'authentification.
