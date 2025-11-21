import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth, logActivity } from '../services/firebase';
import { Agency, Agent, UserRole } from '../types';
import { sendEmailNotification } from '../services/notificationService';

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
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time listeners
  useEffect(() => {
    const unsubscribeAgencies = db.collection('agencies').onSnapshot(
      (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Agency[];
        setAgencies(data);
      },
      (error) => console.error('Error listening to agencies:', error)
    );

    const unsubscribeAgents = db.collection('agents').onSnapshot(
      (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Agent[];
        setAgents(data);
        setDataLoaded(true);
      },
      (error) => {
        console.error('Error listening to agents:', error);
        setDataLoaded(true);
      }
    );

    return () => {
      unsubscribeAgencies();
      unsubscribeAgents();
    };
  }, []);

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
      const tempUserCredential = await auth.createUserWithEmailAndPassword(agentInfo.email, password);
      await tempUserCredential.user.sendEmailVerification();
      await auth.signOut();
      console.log(`Utilisateur Auth créé pour ${agentInfo.email}. L'admin doit se reconnecter.`);

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

      alert('Agent créé avec succès. Pour des raisons de sécurité, vous avez été déconnecté. Veuillez vous reconnecter.');
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
        console.error('MISE À JOUR DU MOT DE PASSE IGNORÉE : Cette action nécessite une fonction Cloud.');
        alert(
          "Les informations de l'agent ont été mises à jour, mais le mot de passe n'a pas pu être changé. Cette action nécessite des droits d'administrateur sur le serveur."
        );
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
