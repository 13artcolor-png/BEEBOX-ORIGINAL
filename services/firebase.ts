// L'application est maintenant reconfigurée pour utiliser Firebase.

// Les imports ESM de firebase sont supprimés.
// L'objet 'firebase' est maintenant chargé globalement via les balises <script> dans index.html.

// Déclare l'objet global 'firebase' pour que TypeScript le reconnaisse.
declare const firebase: any;

import { UserRole } from '../types';


// ✅ Configuration CORRIGÉE du projet "beebox-laon-gestion-14f28"
const firebaseConfig = {
  apiKey: "AIzaSyBGD5Ow52xuel1ERGkPEZ2h87-aSYjJVOU",
  authDomain: "beebox-laon-gestion-14f28.firebaseapp.com",
  projectId: "beebox-laon-gestion-14f28",
  storageBucket: "beebox-laon-gestion-14f28.appspot.com",
  messagingSenderId: "352595159783",
  appId: "1:352595159783:web:106de09a5eec4011fd9042",
  measurementId: "G-C6EE6H4GX1"
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


export default firebase;
