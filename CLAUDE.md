# BEEBOX LAON — Instructions Claude

## Projet
Application web de gestion locative pour le parc de boxes de stockage BEEBOX LAON.
Propriétaire : beeboxlaon@gmail.com

## Stack technique
- React 18 + TypeScript + Vite 6
- Firebase Firestore (base de données), Auth (authentification), Storage (documents)
- Google Gemini API (analyse CRG PDF par IA)
- Tailwind CSS
- jsPDF + jspdf-autotable (quittances PDF)

## Déploiement
- URL production : https://gestion.beeboxlaon.fr
- Firebase project ID : beebox-laon-gestion-14f28
- Pour déployer : double-cliquer sur `deploy.bat` (build + firebase deploy)
- Clé Gemini : dans `.env` (fichier local, ne pas commiter)

## Structure des fichiers importants
```
pages/
  BoxesPage.tsx       — Plan interactif des boxes
  TenantsPage.tsx     — Gestion des locataires (quittances, docs)
  FinancesPage.tsx    — Finances, alertes, IRL, bilan par locataire
  DataPage.tsx        — Stats, Contrôle CRG, Gestion boxes, Admin
  AgencyPage.tsx      — Gestion agences et agents ORPI
  CalendarPage.tsx    — Calendrier des événements
  HelpPage.tsx        — Guide d'utilisation intégré

components/
  AddTenantModal.tsx  — Modal ajout locataire (mode: 'new' | 'existing')
                        Props: tenants, onSave, onReassign
                        Mode 'existing' : recherche parmi ex-locataires (endDate définie),
                        appelle onReassign(tenantId, boxId, startDate, workData)

services/
  geminiService.ts    — analyzeReportImage(), analyzeCrgReport()
  pdfGenerator.ts     — generateQuittanceLoyer()
  notificationService.ts — sendPaymentReminder(), sendDocumentsToTenant()
  firebase.ts         — Config Firebase (auth, db, storage)

contexts/
  TenantsContext.tsx  — saveTenant, reassignTenant, updateTenant, releaseTenant
                        reassignTenant : réaffecte un ex-locataire (endDate=null,
                        nouveau rentedBoxes, startDate, paymentStatus=Paid)
```

## Scripts de migration Python (dans C:\Users\ragot\)
```
parse_rdg.py          — Parse PDF gérance ORPI → utilisé par DataPage.tsx (Contrôle CRG)
migrate_orchestra.py  — Importe adresse, CP, ville, startDate, endDate, codeLocataire
                        depuis liste locataires orchestra.xlsx → Firestore
                        Règle : ne remplace QUE les champs vides (conservatif)
migrate_intratone.py  — Importe doorCode depuis intratone.xlsx → Firestore
                        Matching par box actif (locataire sans endDate)
```

## Règles de développement

### PRIORITÉ 1 — Ne jamais affirmer qu'une correction frontend fonctionne sans test utilisateur
- Toujours dire : "J'ai modifié le code. Veuillez rebuild (deploy.bat) et tester."

### Workflow de modification
1. Modifier le code source
2. `npm run build` (ou deploy.bat)
3. `firebase deploy`

### Règles de code
- Commenter en français
- **JAMAIS DE DONNÉES FICTIVES — JAMAIS. Pas de noms inventés, pas de valeurs test, pas d'exemples hardcodés dans le code ou Firestore. Toute donnée affichée doit venir d'une source réelle (Firestore, Firebase Auth, etc.).**
- Toujours chercher la cause racine (pas de pansement)
- WebSearch au moindre doute sur une syntaxe ou API

### Sécurité
- Le fichier `.env` contient GEMINI_API_KEY — ne jamais le commiter
- Les comptes utilisateurs sont dans Firebase Authentication
- Jamais afficher ou reproduire des mots de passe dans le chat

## Données Firestore — collection `tenants`
Champs importants :
- `codeLocataire` : code ORPI (ex: "51063") — importé via migrate_orchestra.py
- `doorCode` : code de porte Intratone — importé via migrate_intratone.py
- `address`, `postalCode`, `city` — importés via migrate_orchestra.py
- `startDate`, `endDate` — format YYYY-MM-DD ; endDate vide = locataire actif
- `rentedBoxes` : `[{ boxId: string, price: number }]`
- Box IDs = chaînes numériques pures ('1', '2', ... '61') — JAMAIS 'box-XX'
- **ATTENTION** : certains locataires n'ont pas de `startDate` valide (import ORPI incomplet).
  Dans le fallback du graphique (mois sans geranceRecords), on utilise '2020-01-01' comme
  startDate par défaut pour NE PAS ignorer ces locataires → évite les creux artificiels.

## Graphique "Évolution depuis 2023" — sources de données
- **Mois avec geranceRecords** (CSV ORPI importés) : source principale, count loyer > 0
- **Mois courant** : `boxes.status === 'occupied'` (temps réel)
- **Mois sans geranceRecords** (fallback) : locataires Firestore avec startDate/endDate
  → Si `startDate` manquant/invalide, défaut = '2020-01-01' (avant ouverture BEEBOX)
  → Ne PAS filtrer `isNaN(startDate)` sinon ~8 locataires manquants → creux artificiel
- Honoraires agence = `rdgRecords.honoraires_gerance + rdgRecords.honoraires_entree` par mois, **cumulatifs**

## Fonctionnalités principales implémentées
- Plan interactif des boxes avec statuts temps réel
- Gestion locataires : ajout, modification, quittances PDF par période
- **Locataire réentrant** : bouton "Locataire existant" dans AddTenantModal → reassignTenant
- Envoi règlement intérieur + mandat par email (mailto:)
- Documents légaux : upload dans Firebase Storage (onglet Admin)
- Finances : vue mensuelle/annuelle, impayés, bilan par locataire
- Alertes : assurances expirant ≤60j, contrats se terminant ≤60j
- Calcul IRL (Indice de Révision des Loyers)
- Contrôle CRG mensuel : upload PDF ORPI → Gemini → détection erreurs persistantes/corrigées/nouvelles
- Synchronisation données ORPI (import Excel gérance)
- Guide d'utilisation intégré (onglet Aide)

## Erreurs connues ORPI (erreurAgences dans Firestore)
- DETTE_FANTOME : locataires avec loyer=0 et solde>0 (ex: DIEUSEUL box 1 et 23)
- TARIF_ERRONNE : loyers facturés à un montant incorrect vs le loyer réel

## Rôles utilisateurs
- Admin : accès complet (finances, données ORPI, administration)
- Agent : accès limité (ses propres locataires uniquement)
Les comptes sont créés manuellement dans Firebase Console > Authentication.

## Variables d'environnement (.env)
```
GEMINI_API_KEY=      # Clé Google Gemini (analyse CRG par IA)
EMAILJS_PUBLIC_KEY=  # EmailJS optionnel
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
```
