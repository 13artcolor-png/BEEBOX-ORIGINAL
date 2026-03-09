/**
 * Script d'import Firestore — Compte rendu de gérance Jan 2024
 * Immeuble R69 - 58 RUE DE MANOISE, 02000 LAON
 *
 * AVANT DE LANCER :
 * 1. Remplir ADMIN_EMAIL et ADMIN_PASSWORD avec vos identifiants Beebox
 * 2. Vérifier que les boxIds correspondent aux IDs dans votre Firestore
 * 3. Lancer : node import_firestore.js
 */

const ADMIN_EMAIL    = 'beeboxlaon@gmail.com'; // <-- votre email admin
const ADMIN_PASSWORD = 'VOTRE_MOT_DE_PASSE';  // <-- à remplir

const API_KEY   = 'AIzaSyB_YszIcRB4URTeelLPHD3hQSiFvp3-E6U';
const PROJECT   = 'beebox-laon-gestion-14f28';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH_URL  = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

// ─── Données extraites du PDF ────────────────────────────────────────────────
// Les champs address/phone/email/doorCode sont à compléter si disponibles.
// startDate = 01/01/2024 pour tous (sauf Box 24 démarré le 26/12/2023)

const tenants = [
  {
    boxId: '4', immLot: '0004', price: 90,
    firstName: 'Karine', lastName: 'CERF',
    startDate: '2024-01-01', unpaidRent: 0,
  },
  {
    boxId: '6', immLot: '0006', price: 90,
    firstName: 'Olivier', lastName: 'LATHURAZ',
    startDate: '2024-01-01', unpaidRent: 0,
  },
  {
    boxId: '7', immLot: '0007', price: 90,
    firstName: 'Ziadath', lastName: 'GERARD',
    startDate: '2024-01-01', unpaidRent: 99,
  },
  {
    boxId: '14', immLot: '0014', price: 116.66,
    firstName: 'Alexia', lastName: 'HARANT',
    startDate: '2024-01-01', unpaidRent: 0,
  },
  {
    boxId: '16', immLot: '0016', price: 90,
    firstName: 'Charlotte', lastName: 'BARREYRE',
    startDate: '2024-01-01', unpaidRent: 0,
  },
  {
    boxId: '17', immLot: '0017', price: 71,
    firstName: 'Thomas', lastName: 'RIGOBERT',
    startDate: '2024-01-01', unpaidRent: 0,
  },
  {
    boxId: '24', immLot: '0024', price: 90,
    firstName: 'Stephanie', lastName: 'DELANCHY',
    startDate: '2023-12-26', unpaidRent: 9,
  },
  {
    boxId: '33', immLot: '0033', price: 140,
    firstName: 'Marc', lastName: 'MOREAU',
    startDate: '2024-01-01', unpaidRent: 0,
  },
  {
    boxId: '39', immLot: '0039', price: 90,
    firstName: 'Dominique', lastName: 'IDELOT',
    startDate: '2024-01-04', unpaidRent: 0,
  },
  {
    boxId: '40', immLot: '0040', price: 190,
    firstName: 'Dominique', lastName: 'IDELOT',
    startDate: '2024-01-04', unpaidRent: 0,
  },
];

// ─── Helpers REST Firestore ──────────────────────────────────────────────────

function toFirestore(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string')  fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (Array.isArray(v)) {
      fields[k] = { arrayValue: { values: v.map(item => {
        if (typeof item === 'object') return { mapValue: { fields: toFirestore(item) } };
        if (typeof item === 'string') return { stringValue: item };
        return { doubleValue: item };
      })}};
    }
  }
  return fields;
}

async function getToken() {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error('Auth failed: ' + JSON.stringify(data));
  console.log('Connecte en tant que:', data.email);
  return data.idToken;
}

async function setDoc(collection, docId, data, token) {
  const url = `${FIRESTORE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: toFirestore(data) }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PATCH ${collection}/${docId} failed: ${err.error?.message}`);
  }
  return res.json();
}

// ─── Import principal ────────────────────────────────────────────────────────

async function run() {
  console.log('=== Import Firestore — Gérance Jan 2024 ===\n');

  const token = await getToken();

  for (let i = 0; i < tenants.length; i++) {
    const t = tenants[i];
    const tenantId = (100 + i + 1).toString(); // IDs: 101, 102, ...

    const nextDue = new Date(t.startDate);
    nextDue.setMonth(nextDue.getMonth() + 1);

    const tenantDoc = {
      firstName: t.firstName,
      lastName: t.lastName,
      address: '58 RUE DE MANOISE',
      postalCode: '02000',
      city: 'LAON',
      phone: '',
      email: '',
      idNumber: '',
      idType: 'Carte d\'identité',
      insuranceInfo: 'Appel assurance inclus',
      doorCode: '',
      agentId: '',
      startDate: t.startDate,
      endDate: null,
      potentialEndDate: '',
      info: `Imm-Lot: ${t.immLot} — Import gérance ORPI Jan 2024`,
      unpaidRent: t.unpaidRent,
      paymentStatus: t.unpaidRent > 0 ? 'unpaid' : 'paid',
      lastPaymentDate: t.startDate,
      nextDueDate: nextDue.toISOString().split('T')[0],
    };

    // Champ rentedBoxes en tableau — traitement manuel
    const tenantWithBoxes = {
      ...tenantDoc,
    };

    // Créer le document tenant
    await setDoc('tenants', tenantId, tenantWithBoxes, token);

    // Mettre à jour le box : occupé + immLot + currentTenantId
    await setDoc('boxes', t.boxId, {
      status: 'occupied',
      currentTenantId: tenantId,
      immLot: t.immLot,
    }, token);

    console.log(`[OK] Box ${t.boxId} (${t.immLot}) — ${t.firstName} ${t.lastName} → tenant ID ${tenantId}`);
  }

  console.log('\nImport termine avec succes !');
}

run().catch(err => {
  console.error('\nErreur:', err.message);
  process.exit(1);
});
