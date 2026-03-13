# BEEBOX LAON — Application de Gestion

Application web de gestion locative pour le parc de boxes de stockage BEEBOX LAON.

---

## Stack technique

- **React 18 + TypeScript** — Frontend
- **Vite 6** — Build tool
- **Firebase Firestore** — Base de données temps réel
- **Firebase Auth** — Authentification Email/Password
- **Firebase Storage** — Stockage des documents (justificatifs, PDFs légaux)
- **Google Gemini** — Analyse des CRG PDF par IA
- **Tailwind CSS** — Styles
- **jsPDF** — Génération de quittances PDF

---

## Démarrage en développement

```bash
npm install
# Copier .env.example en .env et renseigner les clés API
cp .env.example .env
# Lancer le serveur de dev
npm run dev
# ou double-cliquer sur start.bat
```

Accessible sur : http://localhost:3000

---

## Déploiement en production

Prérequis : `npm install -g firebase-tools` puis `firebase login`

```bash
# Double-cliquer sur deploy.bat
# ou manuellement :
npm run build
firebase deploy --only hosting
```

URL de production : https://beebox-laon-gestion-14f28.web.app
Domaine personnalisé : https://gestion.beeboxlaon.fr

---

## Structure du projet

```
beeboxlaon-original/
├── components/          # Composants réutilisables
│   └── AddTenantModal.tsx  # Modes : nouveau locataire / réentrant
├── contexts/            # State global
│   ├── AuthContext.tsx
│   ├── BoxesContext.tsx
│   ├── TenantsContext.tsx  # saveTenant, reassignTenant, updateTenant, releaseTenant
│   ├── DataContext.tsx
│   └── AgenciesContext.tsx
├── pages/               # Pages de l'app
│   ├── BoxesPage.tsx
│   ├── TenantsPage.tsx
│   ├── FinancesPage.tsx
│   ├── DataPage.tsx        # Contrôle CRG + analyse rapport
│   ├── AgencyPage.tsx
│   ├── CalendarPage.tsx
│   └── HelpPage.tsx
├── services/
│   ├── firebase.ts         # Config Firebase (projet : beebox-laon-gestion-14f28)
│   ├── geminiService.ts    # analyzeReportImage(), analyzeCrgReport()
│   ├── pdfGenerator.ts     # Quittances PDF
│   └── notificationService.ts
├── import_data/         # Sources de données (Excel, PDFs annuels)
│   ├── 2023/ 2024/ 2025/ 2026/      # Rapports annuels PDF
│   ├── Gerance total.xlsx            # Source pour parse_rdg.py
│   ├── liste locataires orchestra.xlsx
│   ├── honoraire_total corrigé.xlsx
│   └── beebox-laon-inventaire-boxes-2026-03-08.xlsx
├── scripts/             # Scripts Node.js maintenance (usage local)
│   └── import_gerance.mjs
├── documents/           # PDFs légaux (règlement intérieur, mandat)
├── App.tsx
├── types.ts
├── firebase.json
├── firestore.rules
├── storage.rules
├── start.bat            # Démarrage dev local
└── deploy.bat           # Build + déploiement production
```

### Scripts de migration Python (dans C:\Users\ragot\)

```
parse_rdg.py          # Parse PDF gérance ORPI → CSV (utilisé par DataPage)
migrate_orchestra.py  # Importe adresse, dates, codeLocataire depuis orchestra.xlsx
migrate_intratone.py  # Importe codes de porte (doorCode) depuis intratone.xlsx
```

---

## Variables d'environnement (.env)

```
GEMINI_API_KEY=         # Clé Google Gemini (analyse CRG par IA)
EMAILJS_PUBLIC_KEY=     # EmailJS optionnel
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
```

---

## Rôles utilisateurs

- **Admin** — Accès complet (finances, données ORPI, administration)
- **Agent** — Accès limité (boxes, locataires de son portefeuille uniquement)

Les comptes sont créés manuellement dans Firebase Console > Authentication.

---

## Fonctionnalités principales

- Plan interactif des boxes avec statuts en temps réel
- Gestion des locataires : ajout, modification, rappels, quittances PDF
- **Locataire réentrant** : réaffectation d'un ex-locataire à un nouveau box
- Envoi règlement intérieur + mandat par email
- Finances : vue mensuelle/annuelle, impayés, bilan par locataire, IRL
- Alertes : assurances expirant, contrats se terminant, boxes disponibles
- Contrôle CRG mensuel : analyse PDF ORPI par Gemini → détection erreurs persistantes/corrigées/nouvelles
- Synchronisation automatique des impayés depuis données ORPI
- Guide d'utilisation intégré (onglet Aide)

---

## Champs Firestore — collection `tenants`

| Champ | Type | Description |
|-------|------|-------------|
| `codeLocataire` | string | Code ORPI (ex: "51063") |
| `doorCode` | string | Code de porte Intratone |
| `address` | string | Adresse du locataire |
| `postalCode` | string | Code postal (5 chiffres) |
| `city` | string | Ville |
| `startDate` | string | Date d'entrée (YYYY-MM-DD) |
| `endDate` | string | Date de sortie (YYYY-MM-DD), vide si actif |
| `rentedBoxes` | array | `[{ boxId: string, price: number }]` |
