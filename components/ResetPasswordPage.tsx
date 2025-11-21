
import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';

interface ResetPasswordPageProps {
  oobCode: string;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ oobCode }) => {
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    auth.verifyPasswordResetCode(oobCode)
      .then((email: string) => {
        setEmail(email);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Le lien de réinitialisation est invalide ou a expiré. Veuillez réessayer depuis la page de connexion.");
        setIsLoading(false);
      });
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsLoading(true);
    try {
      await auth.confirmPasswordReset(oobCode, newPassword);
      setSuccess("Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.");
    } catch (error) {
      setError("Une erreur s'est produite. Le lien a peut-être expiré. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const backToLogin = () => {
    window.location.href = window.location.origin;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white shadow-xl rounded-xl p-8 sm:p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">BEEBOX LAON</h1>
          <p className="text-slate-500 mt-2">Réinitialisation du mot de passe</p>
        </div>
        
        {isLoading && <div className="text-center">Vérification...</div>}

        {error && !success && (
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={backToLogin} className="w-full bg-slate-600 text-white py-2.5 rounded-md hover:bg-slate-700 font-semibold">
              Retour à la connexion
            </button>
          </div>
        )}

        {success && (
           <div className="text-center">
            <p className="text-green-600 mb-4">{success}</p>
            <button onClick={backToLogin} className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 font-semibold">
              Aller à la page de connexion
            </button>
          </div>
        )}

        {!isLoading && !error && !success && email && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-center text-slate-600">
              Réinitialisation du mot de passe pour : <span className="font-bold">{email}</span>
            </p>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
              <input 
                type="password" 
                id="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
             <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
              <input 
                type="password" 
                id="confirmPassword" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 font-semibold">
              Enregistrer le nouveau mot de passe
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
