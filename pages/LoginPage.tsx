import React, { useState } from 'react';
import { auth } from '../services/firebase';

const EyeIcon: React.FC<{ className?: string }> = ({ ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EyeSlashIcon: React.FC<{ className?: string }> = ({ ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
    </svg>
);

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged dans AuthContext gère la redirection
        } catch (err: any) {
            // Afficher le code d'erreur Firebase pour diagnostic
            const code = err.code || '';
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setError('Email ou mot de passe incorrect.');
            } else if (code === 'auth/operation-not-allowed') {
                setError('Connexion email/mot de passe non activée dans Firebase Console. Activez-la dans Authentication > Sign-in method.');
            } else if (code === 'auth/too-many-requests') {
                setError('Trop de tentatives. Réessayez dans quelques minutes.');
            } else {
                setError(`Erreur: ${code || err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Taille de police minimum 18px (text-lg = 18px)
    const inputClasses = "appearance-none block w-full bg-transparent pb-2 border-b-2 border-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-0 text-lg text-slate-800";

    return (
        <div className="min-h-screen bg-[#E3E8EE] flex flex-col justify-center items-center p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl p-10">

                    <div className="text-center mb-10">
                        <h1 className="text-2xl font-bold text-slate-700">BEEBOX LAON</h1>
                        <p className="text-lg text-slate-500 mt-1">Gestion du Parc</p>
                        {error && (
                            <div className="mt-6 text-center text-lg text-red-700 bg-red-100 p-4 rounded-lg">
                                <p>{error}</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        <div>
                            <label htmlFor="email" className="block text-lg font-medium text-slate-600">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="votre@email.fr"
                                className={`${inputClasses} mt-2`}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-lg font-medium text-slate-600">Mot de passe</label>
                            <div className="relative mt-2">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className={inputClasses}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center"
                                    aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {showPassword
                                        ? <EyeIcon className="h-6 w-6 text-slate-400" />
                                        : <EyeSlashIcon className="h-6 w-6 text-slate-400" />
                                    }
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors"
                            >
                                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
