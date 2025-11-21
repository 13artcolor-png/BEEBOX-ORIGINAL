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
    const [email, setEmail] = useState('beeboxlaon@gmail.com');
    const [password, setPassword] = useState('@Sodomie123');
    const [error, setError] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(false);
        setIsLoading(true);
        try {
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged in App.tsx will handle redirection
        } catch (err: any) {
            setError(true);
            if (password !== 'password123') {
                setPassword('password123');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    // Adjusted styles for pixel-perfect match
    const inputClasses = "appearance-none block w-full bg-transparent pb-1 border-b border-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-0 text-sm text-slate-800";
    
    return (
        <div className="min-h-screen bg-[#E3E8EE] flex flex-col justify-center items-center p-4 font-sans">
            <div className="w-full max-w-sm">
                <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl p-8 sm:p-10">
                    
                    <div className="text-center mb-10">
                        <h1 className={`text-xl font-bold text-slate-700`}>Gestion du Parc</h1>
                         {error && (
                            <div className="mt-6 text-center text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                                <p className="font-medium">Une erreur de connexion est survenue.</p>
                                <p>Veuillez réessayer.</p>
                            </div>
                        )}
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-8">
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-slate-500">Email</label>
                            <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required
                                className={`${inputClasses} mt-2`} />
                        </div>

                        <div>
                            <label htmlFor="password"className="block text-xs font-medium text-slate-500">Mot de passe</label>
                            <div className="relative mt-2">
                                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required
                                    className={inputClasses} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center text-sm leading-5" aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}>
                                    {showPassword ? <EyeIcon className="h-5 w-5 text-slate-400" /> : <EyeSlashIcon className="h-5 w-5 text-slate-400" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                             <button type="submit" disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors">
                                {isLoading ? 'Connexion...' : 'Se connecter'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
