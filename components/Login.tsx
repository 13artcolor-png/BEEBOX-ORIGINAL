import React, { useEffect } from 'react';
import { auth, EmailAuthProvider } from '../services/firebase';

// FirebaseUI est maintenant chargé globalement via une balise <script>.
// On le déclare ici pour que TypeScript le reconnaisse.
declare const firebaseui: any;

const FirebaseLogin: React.FC = () => {
    useEffect(() => {
        // On définit la langue de l'interface sur le français
        auth.languageCode = 'fr';

        // On utilise la variable globale firebaseui
        const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
        ui.start('#firebaseui-auth-container', {
            signInOptions: [
                {
                    provider: EmailAuthProvider.PROVIDER_ID,
                    requireDisplayName: false
                }
            ],
            signInSuccessUrl: '/', // On reste sur la même page, onAuthStateChanged gère la redirection
            callbacks: {
                signInSuccessWithAuthResult: function(authResult, redirectUrl) {
                    // Évite la redirection pour laisser onAuthStateChanged gérer l'état
                    return false;
                },
            },
            credentialHelper: firebaseui.auth.CredentialHelper.NONE
        });
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="bg-white shadow-xl rounded-xl p-8 sm:p-10 w-full max-w-md">
                <div className="text-center mb-8">
                     <h1 className="text-3xl font-bold text-slate-800">BEEBOX LAON</h1>
                     <p className="text-slate-500 mt-2">Veuillez vous identifier pour continuer</p>
                </div>
                <div id="firebaseui-auth-container"></div>
                {/* Ajout d'une note pour l'utilisateur */}
                <p className="text-xs text-slate-400 text-center mt-6">
                    Si vous ne recevez pas d'email de réinitialisation, pensez à vérifier votre dossier de courriers indésirables (spam).
                </p>
            </div>
        </div>
    );
};

export default FirebaseLogin;