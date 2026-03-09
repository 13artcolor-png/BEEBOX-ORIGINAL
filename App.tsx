import React, { useEffect } from 'react';
import { useAuth, useBoxes, useTenants, useAgencies, useData, useUI } from './contexts';
import { db, logActivity } from './services/firebase';
import { UserRole, PaymentStatus } from './types';

// Components
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import BoxesPage from './pages/BoxesPage';
import TenantsPage from './pages/TenantsPage';
import AgencyPage from './pages/AgencyPage';
import DataPage from './pages/DataPage';
import CalendarPage from './pages/CalendarPage';
import ChatBot from './components/ChatBot';
import AddTenantModal from './components/AddTenantModal';
import EditTenantModal from './components/EditTenantModal';
import BoxDetailModal from './components/BoxDetailModal';
import BoxHistoryModal from './components/BoxHistoryModal';
import ConfirmationModal from './components/ConfirmationModal';
import { sendPaymentReminder } from './services/notificationService';

// Import mock data functions
import {
  initialAdminUser,
  initialBoxes,
  initialTenants,
  initialAgents,
  initialAgencies,
} from './hooks/useMockData';

const FullScreenLoader: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-sm flex flex-col justify-center items-center z-50">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
    <p className="mt-4 text-slate-700 font-semibold">{message}</p>
  </div>
);

const VideoManagerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const { guidedVideos, addGuidedVideo, deleteGuidedVideo, isSaving: dataIsSaving } = useData();
  const { appUser } = useAuth();
  const { showConfirmation } = useUI();

  if (!isOpen || !appUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) {
      alert('Veuillez fournir un titre et une URL pour la vidéo.');
      return;
    }
    try {
      await addGuidedVideo(title, url, appUser.name, appUser.role);
      setTitle('');
      setUrl('');
    } catch (error) {
      // Error handled in context
    }
  };

  const handleDelete = (video: any) => {
    if (appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }
    showConfirmation(
      'Supprimer la vidéo',
      `Êtes-vous sûr de vouloir supprimer la vidéo "${video.title}" ?`,
      async () => {
        try {
          await deleteGuidedVideo(video, appUser.name, appUser.role);
        } catch (error) {
          alert("Une erreur s'est produite.");
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Visites Guidées Vidéo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">
            &times;
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {appUser.role === UserRole.Admin && (
            <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h3 className="font-semibold text-lg">Ajouter une nouvelle vidéo</h3>
              <div>
                <label htmlFor="video-title" className="text-sm font-medium text-slate-700">
                  Titre de la vidéo
                </label>
                <input
                  id="video-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Visite du Box 23m²"
                  required
                  className="w-full px-3 py-2 border rounded-md mt-1"
                />
              </div>
              <div>
                <label htmlFor="video-url" className="text-sm font-medium text-slate-700">
                  URL de la vidéo
                </label>
                <input
                  id="video-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://votre-cloud.com/video.mp4"
                  required
                  className="w-full px-3 py-2 border rounded-md mt-1"
                />
              </div>
              <button
                type="submit"
                disabled={dataIsSaving || !title || !url}
                className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-semibold"
              >
                {dataIsSaving ? 'Ajout en cours...' : 'Ajouter la vidéo'}
              </button>
            </form>
          )}
          <div>
            <h3 className="font-semibold text-lg mb-2">Vidéos disponibles</h3>
            <ul className="divide-y divide-slate-200">
              {guidedVideos.length === 0 && (
                <li className="py-2 text-sm text-slate-500 italic">Aucune vidéo disponible.</li>
              )}
              {guidedVideos.map((video) => (
                <li key={video.id} className="py-3 flex justify-between items-center">
                  <a
                    href={video.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {video.title}
                  </a>
                  {appUser.role === UserRole.Admin && (
                    <button
                      onClick={() => handleDelete(video)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Supprimer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end bg-slate-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  // Context hooks
  const { appUser, logout, loading: authLoading } = useAuth();
  const { boxes, updateBoxDetails, dataLoaded: boxesLoaded, isSaving: boxesIsSaving } = useBoxes();
  const { tenants, saveTenant, updateTenant, releaseTenant, dataLoaded: tenantsLoaded, isSaving: tenantsIsSaving } = useTenants();
  const { agencies, agents, addAgency, updateAgency, deleteAgency, addAgent, updateAgent, deleteAgent, canDeleteAgency, canDeleteAgent, dataLoaded: agenciesLoaded, isSaving: agenciesIsSaving } = useAgencies();
  const { adminUser, activityLogs, updateAdminProfile, dataLoaded: dataLoaded, isSaving: dataIsSaving } = useData();
  const {
    activePage,
    setActivePage,
    isTenantModalOpen,
    isEditTenantModalOpen,
    isBoxDetailModalOpen,
    isHistoryModalOpen,
    isVideoManagerOpen,
    selectedBox,
    editingTenant,
    confirmation,
    chatMessages,
    setChatMessages,
    openTenantModal,
    closeTenantModal,
    openEditTenantModal,
    closeEditTenantModal,
    openBoxDetailModal,
    closeBoxDetailModal,
    openHistoryModal,
    closeHistoryModal,
    openVideoManager,
    closeVideoManager,
    closeAllModals,
    showConfirmation,
    closeConfirmation,
  } = useUI();

  const allDataLoaded = boxesLoaded && tenantsLoaded && agenciesLoaded && dataLoaded;
  const anySaving = boxesIsSaving || tenantsIsSaving || agenciesIsSaving || dataIsSaving;

  // Check payment statuses (business logic that should eventually move to Cloud Function)
  useEffect(() => {
    if (!allDataLoaded || !appUser || appUser.role !== UserRole.Admin || tenants.length === 0) return;

    const checkPaymentStatuses = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const batch = db.batch();
      let hasChanges = false;

      tenants.forEach((tenant) => {
        if (!tenant.endDate && tenant.nextDueDate) {
          const dueDate = new Date(tenant.nextDueDate);
          if (isNaN(dueDate.getTime())) return;

          dueDate.setHours(0, 0, 0, 0);

          const currentUnpaid = tenant.rentedBoxes.reduce((acc, box) => acc + box.price, 0);
          let updatedTenantData: Partial<any> = {};

          if (today > dueDate && tenant.paymentStatus !== PaymentStatus.Overdue) {
            updatedTenantData = {
              paymentStatus: PaymentStatus.Overdue,
              unpaidRent: tenant.unpaidRent + currentUnpaid,
            };
            hasChanges = true;
          } else if (today <= dueDate) {
            const daysUntilDue = (dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
            if (daysUntilDue <= 7 && tenant.paymentStatus === PaymentStatus.Paid) {
              updatedTenantData = { paymentStatus: PaymentStatus.Due };
              hasChanges = true;
            }
          }

          if (Object.keys(updatedTenantData).length > 0) {
            const tenantRef = db.collection('tenants').doc(tenant.id);
            batch.update(tenantRef, updatedTenantData);
          }
        }
      });

      if (hasChanges) {
        console.log('Mise à jour automatique des statuts de paiement...');
        await batch.commit();
        await logActivity('Système', UserRole.Admin, 'Mise à jour automatique des statuts de paiement.');
      }
    };

    const timer = setTimeout(checkPaymentStatuses, 5000);
    return () => clearTimeout(timer);
  }, [tenants, appUser, allDataLoaded]);

  // Attente de la résolution de l'état d'authentification
  if (authLoading) {
    return <FullScreenLoader message="Chargement en cours..." />;
  }

  // Utilisateur non connecté → afficher la page de connexion
  if (!appUser) {
    return <LoginPage />;
  }

  // Utilisateur connecté mais données pas encore chargées
  if (!allDataLoaded) {
    return <FullScreenLoader message="Chargement des données..." />;
  }


  // Handlers
  const handleBoxClick = (box: any) => {
    openBoxDetailModal(box);
  };

  const handleInitiateRelease = (boxId: string) => {
    showConfirmation(
      'Libérer le Box',
      `Êtes-vous sûr de vouloir libérer le box #${boxId} ? Cette action mettra fin au contrat du locataire actuel.`,
      async () => {
        if (!appUser) return;
        const boxToRelease = boxes.find((b) => b.id === boxId);
        if (!boxToRelease || !boxToRelease.currentTenantId) return;

        try {
          await releaseTenant(boxToRelease.currentTenantId, boxId, appUser.name, appUser.role, adminUser?.email || null);
          closeConfirmation();
        } catch (error) {
          console.error('Error releasing box:', error);
        }
      }
    );
  };

  const handleOpenAddTenantForBox = (box: any) => {
    openTenantModal(box);
    closeBoxDetailModal();
  };

  const handleShowHistory = (box: any) => {
    openHistoryModal(box);
  };

  const handleSaveTenant = async (tenantData: any, boxId: string, workData: any) => {
    if (!appUser) return;
    const boxToRent = boxes.find((b) => b.id === boxId);
    if (!boxToRent) {
      alert('Erreur: Le box sélectionné est introuvable.');
      return;
    }

    try {
      await saveTenant(
        tenantData,
        boxId,
        boxToRent.price,
        workData,
        appUser.name,
        appUser.role,
        appUser.agentId,
        adminUser?.email || null
      );
      closeTenantModal();
    } catch (error) {
      console.error('Error saving tenant:', error);
    }
  };

  const handleUpdateTenant = async (updatedTenant: any, files: any) => {
    if (!appUser) return;
    try {
      await updateTenant(updatedTenant, files, appUser.name, appUser.role, adminUser?.email || null);
      closeEditTenantModal();
    } catch (error) {
      console.error('Error updating tenant:', error);
    }
  };

  const handleUpdateBoxDetails = async (updatedBox: any) => {
    if (!appUser) return;
    try {
      await updateBoxDetails(updatedBox, appUser.name, appUser.role);
    } catch (error) {
      console.error('Error updating box:', error);
    }
  };

  const handleMarkAsPaid = async (tenantId: string) => {
    if (!appUser) return;
    try {
      const tenant = tenants.find((t) => t.id === tenantId);
      if (!tenant) return;

      const nextDueDate = new Date();
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      await db.collection('tenants').doc(tenantId).update({
        paymentStatus: PaymentStatus.Paid,
        unpaidRent: 0,
        lastPaymentDate: new Date().toISOString().split('T')[0],
        nextDueDate: nextDueDate.toISOString().split('T')[0],
      });

      await logActivity(
        appUser.name,
        appUser.role,
        `Paiement enregistré pour ${tenant.firstName} ${tenant.lastName}.`
      );
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const handleSendReminder = (tenant: any) => {
    if (!adminUser) return;
    sendPaymentReminder(tenant, adminUser.email);
  };

  const handleAddAgent = async (agentData: any) => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }
    try {
      await addAgent(agentData, appUser.name, appUser.role, adminUser?.email || null);
    } catch (error) {
      console.error('Error adding agent:', error);
    }
  };

  const handleUpdateAgent = async (updatedAgent: any) => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }
    try {
      await updateAgent(updatedAgent, appUser.name, appUser.role, adminUser?.email || null);
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const handleAddAgency = async (agencyData: any) => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }
    try {
      await addAgency(agencyData, appUser.name, appUser.role, adminUser?.email || null);
    } catch (error) {
      console.error('Error adding agency:', error);
    }
  };

  const handleUpdateAgency = async (updatedAgency: any) => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }
    try {
      await updateAgency(updatedAgency, appUser.name, appUser.role, adminUser?.email || null);
    } catch (error) {
      console.error('Error updating agency:', error);
    }
  };

  const handleInitiateDeleteAgency = (agencyId: string) => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }
    const agency = agencies.find((a) => a.id === agencyId);
    if (!agency) return;

    if (!canDeleteAgency(agencyId)) {
      alert(`Impossible de supprimer l'agence "${agency.name}" car des agents y sont toujours assignés.`);
      return;
    }

    showConfirmation(
      "Supprimer l'Agence",
      `Êtes-vous sûr de vouloir supprimer l'agence "${agency.name}" ? Cette action est irréversible.`,
      async () => {
        try {
          await deleteAgency(agencyId, appUser.name, appUser.role, adminUser?.email || null);
          closeConfirmation();
        } catch (error) {
          console.error('Error deleting agency:', error);
        }
      }
    );
  };

  const handleInitiateDeleteAgent = (agentId: string) => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    if (!canDeleteAgent(agentId, tenants)) {
      alert(`Impossible de supprimer l'agent "${agent.name}" car il/elle est assigné(e) à des locataires.`);
      return;
    }

    showConfirmation(
      "Supprimer l'Agent",
      `Êtes-vous sûr de vouloir supprimer l'agent "${agent.name}" ? Cette action est irréversible et supprimera son compte de connexion.`,
      async () => {
        try {
          await deleteAgent(agentId, appUser.name, appUser.role, adminUser?.email || null);
          closeConfirmation();
        } catch (error) {
          console.error('Error deleting agent:', error);
        }
      }
    );
  };

  const handleUpdateAdminProfile = async (updatedAdmin: any) => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }
    try {
      await updateAdminProfile(updatedAdmin, appUser.name, appUser.role);
    } catch (error) {
      console.error('Error updating admin profile:', error);
    }
  };

  const seedDatabase = async () => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }

    const confirmSeed = confirm(
      'ATTENTION : Cette action va supprimer TOUTES les données actuelles et les remplacer par des données de démonstration. Continuer ?'
    );
    if (!confirmSeed) return;

    try {
      // Delete all collections
      const collections = ['boxes', 'tenants', 'agents', 'agencies', 'admin', 'activityLogs', 'guidedVideos'];
      for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName).get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      // Add mock data
      await db.collection('admin').doc('1').set(initialAdminUser);
      
      for (const box of initialBoxes) {
        await db.collection('boxes').doc(box.id).set(box);
      }
      
      for (const tenant of initialTenants) {
        await db.collection('tenants').doc(tenant.id).set(tenant);
      }
      
      for (const agent of initialAgents) {
        await db.collection('agents').doc(agent.id).set(agent);
      }
      
      for (const agency of initialAgencies) {
        await db.collection('agencies').doc(agency.id).set(agency);
      }

      await logActivity(appUser.name, appUser.role, 'Réinitialisation de la base de données avec des données de démo.');
      alert('Base de données réinitialisée avec succès !');
    } catch (error) {
      console.error('Error seeding database:', error);
      alert('Une erreur est survenue lors de la réinitialisation.');
    }
  };

  const handleUpdateBoxCount = async (newCount: number) => {
    if (!appUser || appUser.role !== UserRole.Admin) {
      alert('Action non autorisée.');
      return;
    }

    try {
      const currentCount = boxes.length;
      const batch = db.batch();

      if (newCount > currentCount) {
        // Add new boxes
        for (let i = currentCount + 1; i <= newCount; i++) {
          const newBox = {
            size: '15 m²',
            price: 100,
            status: 'vacant',
            side: 'Cour',
            level: 'RDC',
            opening: 'Porte',
            tenantHistory: [],
            workHistory: [],
          };
          batch.set(db.collection('boxes').doc(i.toString()), newBox);
        }
      } else if (newCount < currentCount) {
        // Remove boxes (only vacant ones)
        for (let i = currentCount; i > newCount; i--) {
          const box = boxes.find((b) => b.id === i.toString());
          if (box && box.status === 'vacant') {
            batch.delete(db.collection('boxes').doc(i.toString()));
          } else {
            alert(`Le box #${i} ne peut pas être supprimé car il est occupé.`);
            return;
          }
        }
      }

      await batch.commit();
      await logActivity(appUser.name, appUser.role, `Mise à jour du nombre de boxes : ${newCount}`);
      alert(`Nombre de boxes mis à jour à ${newCount} !`);
    } catch (error) {
      console.error('Error updating box count:', error);
      alert('Une erreur est survenue.');
    }
  };

  const currentPage = () => {
    switch (activePage) {
      case 'boxes':
        return (
          <BoxesPage
            boxes={boxes}
            tenants={tenants}
            agents={agents}
            onBoxClick={handleBoxClick}
            onInitiateReleaseBox={handleInitiateRelease}
            onShowHistory={handleShowHistory}
            currentUserRole={appUser.role}
            currentAgentId={appUser.agentId}
          />
        );
      case 'tenants':
        return (
          <TenantsPage
            tenants={tenants}
            agents={agents}
            agencies={agencies}
            currentUserRole={appUser.role}
            currentAgentId={appUser.agentId}
            onSendReminder={handleSendReminder}
            onAddTenant={() => openTenantModal()}
            onEditTenant={openEditTenantModal}
          />
        );
      case 'agency':
        if (appUser.role !== UserRole.Admin) return null;
        return (
          <AgencyPage
            agents={agents}
            agencies={agencies}
            onAddAgent={handleAddAgent}
            onUpdateAgent={handleUpdateAgent}
            onAddAgency={handleAddAgency}
            onUpdateAgency={handleUpdateAgency}
            onDeleteAgency={handleInitiateDeleteAgency}
            onDeleteAgent={handleInitiateDeleteAgent}
          />
        );
      case 'data':
        if (appUser.role !== UserRole.Admin) return null;
        return adminUser ? (
          <DataPage
            tenants={tenants}
            boxes={boxes}
            agents={agents}
            agencies={agencies}
            onUpdateBox={handleUpdateBoxDetails}
            adminUser={adminUser}
            onUpdateAdminProfile={handleUpdateAdminProfile}
            onSeedDatabase={seedDatabase}
            onUpdateBoxCount={handleUpdateBoxCount}
          />
        ) : (
          <div>Chargement...</div>
        );
      case 'calendar':
        if (appUser.role !== UserRole.Admin) return null;
        return <CalendarPage logs={activityLogs} />;
      default:
        return (
          <BoxesPage
            boxes={boxes}
            tenants={tenants}
            agents={agents}
            onBoxClick={handleBoxClick}
            onInitiateReleaseBox={handleInitiateRelease}
            onShowHistory={handleShowHistory}
            currentUserRole={appUser.role}
            currentAgentId={appUser.agentId}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        currentUserRole={appUser.role}
        userName={appUser.name}
        onLogout={logout}
        onOpenVideoManager={openVideoManager}
      />
      <main>{currentPage()}</main>
      <ChatBot messages={chatMessages} setMessages={setChatMessages} />

      {isTenantModalOpen && (
        <AddTenantModal
          box={selectedBox}
          allBoxes={boxes}
          agentId={appUser.agentId || ''}
          onClose={closeTenantModal}
          onSave={handleSaveTenant}
          onShowHistory={handleShowHistory}
        />
      )}

      {isEditTenantModalOpen && editingTenant && (
        <EditTenantModal
          isOpen={isEditTenantModalOpen}
          onClose={closeEditTenantModal}
          onSave={handleUpdateTenant}
          tenantToEdit={editingTenant}
          isAdmin={appUser?.role === UserRole.Admin}
        />
      )}

      {isBoxDetailModalOpen && selectedBox && (
        <BoxDetailModal
          isOpen={isBoxDetailModalOpen}
          onClose={closeBoxDetailModal}
          box={selectedBox}
          tenant={tenants.find((t) => t.id === selectedBox.currentTenantId)}
          agent={agents.find((a) => a.id === selectedBox.rentedByAgentId)}
          onSaveDetails={handleUpdateBoxDetails}
          onMarkAsPaid={handleMarkAsPaid}
          onShowHistory={handleShowHistory}
          onRentBox={handleOpenAddTenantForBox}
        />
      )}

      {isHistoryModalOpen && selectedBox && (
        <BoxHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={closeHistoryModal}
          box={selectedBox}
          allTenants={tenants}
        />
      )}

      <VideoManagerModal isOpen={isVideoManagerOpen} onClose={closeVideoManager} />

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={() => {
          confirmation.onConfirm();
          closeConfirmation();
        }}
        onClose={() => {
          if (confirmation.onClose) confirmation.onClose();
          closeConfirmation();
        }}
      />

      {anySaving && <FullScreenLoader message="Opération en cours..." />}
    </div>
  );
}

export default App;
