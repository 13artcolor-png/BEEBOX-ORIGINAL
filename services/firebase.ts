// L'application est maintenant reconfigurée pour utiliser Firebase.

// Les imports ESM de firebase sont supprimés.
// L'objet 'firebase' est maintenant chargé globalement via les balises <script> dans index.html.

// Déclare l'objet global 'firebase' pour que TypeScript le reconnaisse.
declare const firebase: any;

import { UserRole } from '../types';


// ✅ Configuration du projet "beebox-laon-gestion-14f28" (source: Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyB_YszIcRB4URTeelLPHD3hQSiFvp3-E6U",
  authDomain: "beebox-laon-gestion-14f28.firebaseapp.com",
  projectId: "beebox-laon-gestion-14f28",
  storageBucket: "beebox-laon-gestion-14f28.firebasestorage.app",
  messagingSenderId: "306445484381",
  appId: "1:306445484381:web:4ba36c0c1dd937bbf428b4",
  measurementId: "G-FVV9Q3EJG8"
};

// === Initialisation Firebase ===
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ✅ Export des services Firebase avec la syntaxe de compatibilité (namespacée v8)
export const db = firebase.firestore();
export const storage = firebase.storage();
export const auth = firebase.auth();
export const EmailAuthProvider = firebase.auth.EmailAuthProvider;

/**
 * Enregistre une action dans le journal d'activité de Firestore.
 * @param userName - Nom de l'utilisateur effectuant l'action.
 * @param userRole - Rôle de l'utilisateur.
 * @param action - Description de l'action.
 */
export const logActivity = async (userName: string, userRole: UserRole, action: string) => {
  try {
    await db.collection('activityLogs').add({
      userName,
      userRole,
      action,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'activité:", error);
  }
};

// ✅ Exporter des helpers pour un usage simplifié dans l'application
export const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;
export const Timestamp = firebase.firestore.Timestamp;

// ===================================================================
// REST API Firestore — contourne le canal gRPC-Web du SDK v8 CDN
// qui ne propage pas correctement le token d'auth après restauration
// de session. Utilisé pour tous les reads (collections).
// ===================================================================
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

function parseFirestoreValue(value: any): any {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) {
    const d = new Date(value.timestampValue);
    return isNaN(d.getTime()) ? value.timestampValue : d;
  }
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(parseFirestoreValue);
  if ('mapValue' in value) {
    const obj: any = {};
    for (const [k, v] of Object.entries(value.mapValue?.fields || {})) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function parseFirestoreDoc(doc: any): any {
  const id = doc.name.split('/').pop();
  const data: any = { id };
  for (const [key, value] of Object.entries(doc.fields || {})) {
    data[key] = parseFirestoreValue(value);
  }
  return data;
}

export const firestoreGet = async (collection: string, pageSize = 500): Promise<any[]> => {
  const user = auth.currentUser;
  if (!user) {
    console.error('[REST] auth.currentUser est null !');
    throw new Error('Not authenticated');
  }
  const token = await user.getIdToken();
  const url = `${FIRESTORE_REST_BASE}/${collection}?pageSize=${pageSize}`;
  console.log('[REST] GET', collection, '— uid:', user.uid);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  console.log('[REST]', collection, '— HTTP', res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[REST] Erreur', collection, ':', err.error?.message, err.error?.status);
    throw Object.assign(new Error(err.error?.message || `HTTP ${res.status}`), { code: 'permission-denied' });
  }
  const data = await res.json();
  console.log('[REST] OK', collection, '—', data.documents?.length ?? 0, 'docs');
  return (data.documents || []).map(parseFirestoreDoc);
};

export default firebase;
