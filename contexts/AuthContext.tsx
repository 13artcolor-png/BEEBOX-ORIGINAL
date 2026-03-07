import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, firestoreGet } from '../services/firebase';
import { UserRole } from '../types';

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
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser && firebaseUser.email) {
        try {
          await firebaseUser.getIdToken(true);
        } catch (e) {}

        try {
          // Si l'email est dans la collection 'agents' → Agent, sinon → Admin
          const agentsData = await firestoreGet('agents');
          const agent = agentsData.find((a: any) =>
            a.email?.toLowerCase() === firebaseUser.email?.toLowerCase()
          );

          if (agent) {
            setAppUser({ role: UserRole.Agent, agentId: agent.id, name: agent.name || firebaseUser.email });
          } else {
            setAppUser({ role: UserRole.Admin, agentId: null, name: firebaseUser.displayName || firebaseUser.email });
          }
        } catch (error) {
          console.error('Erreur détermination du rôle:', error);
          setAppUser({ role: UserRole.Admin, agentId: null, name: firebaseUser.displayName || firebaseUser.email });
        }

        setIsAuthenticated(true);
      } else {
        setAppUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
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
