import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../services/firebase';
import { UserRole } from '../types';
import { initialAdminUser } from '../hooks/useMockData';

interface AppUser {
  role: UserRole;
  agentId: string | null;
  name: string;
}

interface AuthContextType {
  appUser: AppUser | null;
  isAuthenticated: boolean;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Écouter les changements d'état d'authentification Firebase
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Utilisateur connecté
        console.log('Firebase user authenticated:', firebaseUser.email);
        setAppUser({
          role: UserRole.Admin,
          agentId: null,
          name: initialAdminUser.name,
        });
        setIsAuthenticated(true);
        setLoading(false);
      } else {
        // Pas d'utilisateur - connexion automatique anonyme
        console.log('No Firebase user, signing in anonymously...');
        try {
          await auth.signInAnonymously();
          setAppUser({
            role: UserRole.Admin,
            agentId: null,
            name: initialAdminUser.name,
          });
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error signing in anonymously:', error);
          // Même en cas d'erreur, on permet l'accès
          setAppUser({
            role: UserRole.Admin,
            agentId: null,
            name: initialAdminUser.name,
          });
          setIsAuthenticated(true);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = () => {
    auth.signOut();
    setAppUser(null);
    setIsAuthenticated(false);
  };

  const value: AuthContextType = {
    appUser,
    isAuthenticated,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
