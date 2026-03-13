import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth, firestoreGet, logActivity } from '../services/firebase';
import { Agency, Agent, UserRole } from '../types';
import { sendEmailNotification } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface AgenciesContextType {
  agencies: Agency[];
  agents: Agent[];
  dataLoaded: boolean;
  isSaving: boolean;
  addAgency: (agencyData: Omit<Agency, 'id'>, userName: string, userRole: UserRole, adminEmail: string | null) => Promise<void>;
  updateAgency: (updatedAgency: Agency, userName: string, userRole: UserRole, adminEmail: string | null) => Promise<void>;
  deleteAgency: (agencyId: string, userName: string, userRole: UserRole, adminEmail: string | null) => Promise<void>;
  addAgent: (agentData: Omit<Agent, 'id'>, userName: string, userRole: UserRole, adminEmail: string | null) => Promise<void>;
  updateAgent: (updatedAgent: Agent, userName: string, userRole: UserRole, adminEmail: string | null) => Promise<void>;
  deleteAgent: (agentId: string, userName: string, userRole: UserRole, adminEmail: string | null) => Promise<void>;
  canDeleteAgency: (agencyId: string) => boolean;
  canDeleteAgent: (agentId: string, tenants: any[]) => boolean;
}

const AgenciesContext = createContext<AgenciesContextType | undefined>(undefined);

export const useAgencies = () => {
  const context = useContext(AgenciesContext);
  if (!context) {
    throw new Error('useAgencies must be used within AgenciesProvider');
  }
  return context;
};

interface AgenciesProviderProps {
  children: ReactNode;
}

export const AgenciesProvider: React.FC<AgenciesProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Listeners Firestore activés uniquement quand l'utilisateur est connecté
  useEffect(() => {
    if (!isAuthenticated) {
      setAgencies([]);
      setAgents([]);
      setDataLoaded(false);
      return;
    }

    let cancelled = false;
    setDataLoaded(false);

    const fetchAll = async () => {
      try {
        const [agenciesData, agentsData] = await Promise.all([
          firestoreGet('agencies'),
          firestoreGet('agents'),
        ]);
        if (cancelled) return;
        setAgencies(agenciesData as Agency[]);
        setAgents(agentsData as Agent[]);
        setDataLoaded(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching agencies/agents:', error);
        setDataLoaded(true);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const addAgency = async (
    agencyData: Omit<Agency, 'id'>,
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => {
    setIsSaving(true);
    try {
      const newAgencyId = (
        agencies.length > 0 ? Math.max(...agencies.map((a) => parseInt(a.id))) + 1 : 1
      ).toString();
      await db.collection('agencies').doc(newAgencyId).set(agencyData);

      await logActivity(userName, userRole, `Création de l'agence : ${agencyData.name}.`);

      if (adminEmail) {
        sendEmailNotification(adminEmail, 'Nouvelle Agence Créée', `L'agence ${agencyData.name} a été ajoutée.`);
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'agence:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateAgency = async (
    updatedAgency: Agency,
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => {
    setIsSaving(true);
    try {
      const { id, ...agencyData } = updatedAgency;
      await db.collection('agencies').doc(id).update(agencyData);

      await logActivity(userName, userRole, `Mise à jour de l'agence : ${updatedAgency.name}.`);

      if (adminEmail) {
        sendEmailNotification(
          adminEmail,
          "Mise à Jour d'une Agence",
          `Les informations de l'agence ${updatedAgency.name} ont été mises à jour.`
        );
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'agence:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAgency = async (
    agencyId: string,
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => {
    const agency = agencies.find((a) => a.id === agencyId);
    if (!agency) return;

    setIsSaving(true);
    try {
      await db.collection('agencies').doc(agencyId).delete();
      await logActivity(userName, userRole, `Suppression de l'agence : ${agency.name}.`);
      
      if (adminEmail) {
        sendEmailNotification(adminEmail, 'Agence Supprimée', `L'agence "${agency.name}" a été supprimée.`);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'agence:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const addAgent = async (
    agentData: Omit<Agent, 'id'>,
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => {
    setIsSaving(true);
    try {
      const { password, ...agentInfo } = agentData;
      if (!password) {
        throw new Error('Le mot de passe est requis pour un nouvel agent.');
      }

      // WARNING: This should be done via Cloud Functions in production
      console.warn('Simulation de la création d\'un utilisateur Auth depuis le client. NE PAS UTILISER EN PRODUCTION.');
      let authAlreadyExisted = false;
      try {
        const tempUserCredential = await auth.createUserWithEmailAndPassword(agentInfo.email, password);
        await tempUserCredential.user.sendEmailVerification();
        await auth.signOut();
        console.log(`Utilisateur Auth créé pour ${agentInfo.email}. L'admin doit se reconnecter.`);
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          // Le compte Auth existe déjà (tentative précédente) — on continue la sauvegarde Firestore
          authAlreadyExisted = true;
          console.warn(`Compte Auth déjà existant pour ${agentInfo.email}. Sauvegarde Firestore uniquement.`);
        } else {
          throw authError;
        }
      }

      const newAgentId = (
        agents.length > 0 ? Math.max(...agents.map((a) => parseInt(a.id))) + 1 : 1
      ).toString();
      await db.collection('agents').doc(newAgentId).set(agentInfo);

      await logActivity(userName, userRole, `Création de l'agent : ${agentInfo.name}.`);

      if (adminEmail) {
        sendEmailNotification(
          adminEmail,
          'Nouvel Agent Créé',
          `L'agent ${agentInfo.name} a été ajouté avec l'email ${agentInfo.email}.`
        );
      }

      if (authAlreadyExisted) {
        alert('Agent créé avec succès. (Le compte de connexion existait déjà.) Pour des raisons de sécurité, vous avez été déconnecté. Veuillez vous reconnecter.');
      } else {
        alert('Agent créé avec succès. Pour des raisons de sécurité, vous avez été déconnecté. Veuillez vous reconnecter.');
      }
    } catch (error: any) {
      console.error("Erreur lors de l'ajout de l'agent:", error);
      alert(`Une erreur s'est produite: ${error.message}`);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateAgent = async (
    updatedAgent: Agent,
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => {
    setIsSaving(true);
    try {
      const { id, password, ...agentData } = updatedAgent;
      await db.collection('agents').doc(id).update(agentData);

      if (password) {
        // Firebase Client SDK ne permet pas de changer le mot de passe d'un autre utilisateur.
        // On envoie un email de réinitialisation à l'agent pour qu'il définisse son nouveau mot de passe.
        try {
          await auth.sendPasswordResetEmail(updatedAgent.email);
          alert(`Un email de réinitialisation du mot de passe a été envoyé à ${updatedAgent.email}. L'agent pourra définir son nouveau mot de passe via ce lien.`);
        } catch (resetError: any) {
          console.error('Erreur envoi email reset:', resetError);
          alert(`Informations mises à jour. Impossible d'envoyer l'email de réinitialisation : ${resetError.message}`);
        }
      }

      await logActivity(userName, userRole, `Mise à jour de l'agent : ${updatedAgent.name}.`);

      if (adminEmail) {
        sendEmailNotification(
          adminEmail,
          "Mise à Jour d'un Agent",
          `Les informations de l'agent ${updatedAgent.name} ont été mises à jour.`
        );
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'agent:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAgent = async (
    agentId: string,
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    setIsSaving(true);
    try {
      // WARNING: Auth user deletion should be done via Cloud Functions
      console.error("SUPPRESSION DE L'UTILISATEUR AUTH IGNORÉE : Cette action nécessite une fonction Cloud.");

      await db.collection('agents').doc(agentId).delete();
      await logActivity(userName, userRole, `Suppression de l'agent : ${agent.name}.`);
      
      if (adminEmail) {
        sendEmailNotification(adminEmail, 'Agent Supprimé', `L'agent "${agent.name}" a été supprimé.`);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'agent:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const canDeleteAgency = (agencyId: string): boolean => {
    return !agents.some((a) => a.agencyId === agencyId);
  };

  const canDeleteAgent = (agentId: string, tenants: any[]): boolean => {
    return !tenants.some((t) => t.agentId === agentId);
  };

  const value: AgenciesContextType = {
    agencies,
    agents,
    dataLoaded,
    isSaving,
    addAgency,
    updateAgency,
    deleteAgency,
    addAgent,
    updateAgent,
    deleteAgent,
    canDeleteAgency,
    canDeleteAgent,
  };

  return <AgenciesContext.Provider value={value}>{children}</AgenciesContext.Provider>;
};
