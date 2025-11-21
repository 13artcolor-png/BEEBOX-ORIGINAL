import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, logActivity } from '../services/firebase';
import { Tenant, PaymentStatus, BoxStatus, UserRole } from '../types';
import { sendEmailNotification } from '../services/notificationService';

interface TenantsContextType {
  tenants: Tenant[];
  dataLoaded: boolean;
  isSaving: boolean;
  saveTenant: (
    tenantData: Omit<Tenant, 'id' | 'rentedBoxes' | 'unpaidRent' | 'paymentStatus'>,
    boxId: string,
    boxPrice: number,
    workData: { workToDo: string; workAlert: boolean },
    userName: string,
    userRole: UserRole,
    agentId: string | null,
    adminEmail: string | null
  ) => Promise<void>;
  updateTenant: (
    updatedTenant: Tenant,
    files: { idImage: File | null; insuranceImage: File | null },
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => Promise<void>;
  releaseTenant: (
    tenantId: string,
    boxId: string,
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => Promise<void>;
}

const TenantsContext = createContext<TenantsContextType | undefined>(undefined);

export const useTenants = () => {
  const context = useContext(TenantsContext);
  if (!context) {
    throw new Error('useTenants must be used within TenantsProvider');
  }
  return context;
};

interface TenantsProviderProps {
  children: ReactNode;
}

export const TenantsProvider: React.FC<TenantsProviderProps> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time listener for tenants
  useEffect(() => {
    const unsubscribe = db
      .collection('tenants')
      .onSnapshot(
        (querySnapshot) => {
          const data = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Tenant[];
          
          // Sort by ID
          data.sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
          
          setTenants(data);
          setDataLoaded(true);
        },
        (error) => {
          console.error('Error listening to tenants:', error);
          setDataLoaded(true);
        }
      );

    return () => unsubscribe();
  }, []);

  const saveTenant = async (
    tenantData: Omit<Tenant, 'id' | 'rentedBoxes' | 'unpaidRent' | 'paymentStatus'>,
    boxId: string,
    boxPrice: number,
    workData: { workToDo: string; workAlert: boolean },
    userName: string,
    userRole: UserRole,
    agentId: string | null,
    adminEmail: string | null
  ) => {
    setIsSaving(true);
    try {
      const cleanTenantData: { [key: string]: any } = { ...tenantData };
      Object.keys(cleanTenantData).forEach((key) => {
        if (cleanTenantData[key] === undefined) {
          delete cleanTenantData[key];
        }
      });

      const nextDueDate = new Date(tenantData.startDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      const newTenantId = (
        tenants.length > 0 ? Math.max(...tenants.map((t) => parseInt(t.id))) + 1 : 1
      ).toString();

      const newTenantForDb = {
        ...cleanTenantData,
        rentedBoxes: [{ boxId, price: boxPrice }],
        agentId: agentId || '',
        unpaidRent: 0,
        paymentStatus: PaymentStatus.Paid,
        lastPaymentDate: tenantData.startDate,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
      };

      const tenantDocRef = db.collection('tenants').doc(newTenantId);
      await tenantDocRef.set(newTenantForDb);

      const boxUpdateData = {
        status: BoxStatus.Occupied,
        currentTenantId: newTenantId,
        rentedByAgentId: agentId,
        workToDo: workData.workToDo,
        workAlert: workData.workAlert,
      };
      await db.collection('boxes').doc(boxId).update(boxUpdateData);

      const logMessage = `Ajout du locataire ${tenantData.firstName} ${tenantData.lastName} au box #${boxId}.`;
      await logActivity(userName, userRole, logMessage);

      if (workData.workAlert && workData.workToDo) {
        const workLogMessage = `ALERTE : "${workData.workToDo}" pour le Box #${boxId} lors de l'ajout du locataire.`;
        await logActivity(userName, userRole, workLogMessage);
        if (adminEmail) {
          sendEmailNotification(adminEmail, 'Alerte Travaux', workLogMessage);
        }
      }

      if (adminEmail) {
        sendEmailNotification(adminEmail, 'Nouveau Locataire Ajouté', logMessage);
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du locataire:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateTenant = async (
    updatedTenant: Tenant,
    files: { idImage: File | null; insuranceImage: File | null },
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => {
    setIsSaving(true);
    try {
      const { id, ...tenantData } = updatedTenant;

      const cleanTenantData: { [key: string]: any } = { ...tenantData };
      Object.keys(cleanTenantData).forEach((key) => {
        if (cleanTenantData[key] === undefined) {
          delete cleanTenantData[key];
        }
      });

      await db.collection('tenants').doc(id).update(cleanTenantData);

      const logMessage = `Mise à jour du locataire ${updatedTenant.firstName} ${updatedTenant.lastName}.`;
      await logActivity(userName, userRole, logMessage);

      if (adminEmail) {
        sendEmailNotification(adminEmail, "Mise à Jour d'un Locataire", logMessage);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du locataire:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const releaseTenant = async (
    tenantId: string,
    boxId: string,
    userName: string,
    userRole: UserRole,
    adminEmail: string | null
  ) => {
    setIsSaving(true);
    try {
      const tenant = tenants.find((t) => t.id === tenantId);
      if (!tenant) return;

      const today = new Date().toISOString().split('T')[0];

      const batch = db.batch();
      const tenantDocRef = db.collection('tenants').doc(tenant.id);
      batch.update(tenantDocRef, { endDate: today });

      const boxDocRef = db.collection('boxes').doc(boxId);
      batch.update(boxDocRef, {
        status: BoxStatus.Vacant,
        currentTenantId: null,
        rentedByAgentId: null,
        workToDo: '',
        workAlert: false,
      });
      
      await batch.commit();

      const logMessage = `Libération du box #${boxId}, fin du contrat pour ${tenant.firstName} ${tenant.lastName}.`;
      await logActivity(userName, userRole, logMessage);

      if (adminEmail) {
        sendEmailNotification(adminEmail, "Libération d'un Box", logMessage);
      }
    } catch (error) {
      console.error('Erreur lors de la libération du locataire:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const value: TenantsContextType = {
    tenants,
    dataLoaded,
    isSaving,
    saveTenant,
    updateTenant,
    releaseTenant,
  };

  return <TenantsContext.Provider value={value}>{children}</TenantsContext.Provider>;
};
