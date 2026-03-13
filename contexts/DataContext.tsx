import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth, firestoreGet, logActivity } from '../services/firebase';
import { AdminUser, ActivityLog, GuidedVideo, GeranceRecord, HonorairesRecord, ErreurAgence, RdgRecord, UserRole } from '../types';
import { sendEmailNotification } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface DataContextType {
  adminUser: AdminUser | null;
  activityLogs: ActivityLog[];
  guidedVideos: GuidedVideo[];
  geranceRecords: GeranceRecord[];
  honorairesRecords: HonorairesRecord[];
  erreurAgences: ErreurAgence[];
  rdgRecords: RdgRecord[];
  dataLoaded: boolean;
  isSaving: boolean;
  updateAdminProfile: (updatedAdmin: AdminUser, userName: string, userRole: UserRole) => Promise<void>;
  addGuidedVideo: (title: string, url: string, userName: string, userRole: UserRole) => Promise<void>;
  deleteGuidedVideo: (video: GuidedVideo, userName: string, userRole: UserRole) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [guidedVideos, setGuidedVideos] = useState<GuidedVideo[]>([]);
  const [geranceRecords, setGeranceRecords] = useState<GeranceRecord[]>([]);
  const [honorairesRecords, setHonorairesRecords] = useState<HonorairesRecord[]>([]);
  const [erreurAgences, setErreurAgences] = useState<ErreurAgence[]>([]);
  const [rdgRecords, setRdgRecords] = useState<RdgRecord[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Firestore via .get() (polling) — onSnapshot WebSocket incompatible avec Firebase v8 CDN
  useEffect(() => {
    if (!isAuthenticated) {
      setAdminUser(null);
      setActivityLogs([]);
      setGuidedVideos([]);
      setGeranceRecords([]);
      setHonorairesRecords([]);
      setErreurAgences([]);
      setRdgRecords([]);
      setDataLoaded(false);
      return;
    }

    let cancelled = false;
    setDataLoaded(false);

    const fetchAll = async () => {
      try {
        const [adminData, logsData, videosData, geranceData, honorairesData, erreurData, rdgData] = await Promise.all([
          firestoreGet('admin'),
          firestoreGet('activityLogs'),
          firestoreGet('guidedVideos'),
          firestoreGet('geranceRecords'),
          firestoreGet('honorairesRecords'),
          firestoreGet('erreurAgence'),
          firestoreGet('rdgRecords'),
        ]);
        if (cancelled) return;

        setAdminUser(adminData.length > 0 ? adminData[0] as AdminUser : null);
        setGeranceRecords(geranceData as GeranceRecord[]);
        setHonorairesRecords(honorairesData as HonorairesRecord[]);
        setErreurAgences(erreurData as ErreurAgence[]);
        setRdgRecords(rdgData as RdgRecord[]);

        // Tri côté client par timestamp desc
        logsData.sort((a, b) => {
          const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
          const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
          return bTime - aTime;
        });
        videosData.sort((a, b) => {
          const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
          const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
          return bTime - aTime;
        });

        setActivityLogs(logsData as ActivityLog[]);
        setGuidedVideos(videosData as GuidedVideo[]);

        setDataLoaded(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching data:', error);
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

  const updateAdminProfile = async (updatedAdmin: AdminUser, userName: string, userRole: UserRole) => {
    setIsSaving(true);
    try {
      const { id, password, ...adminData } = updatedAdmin;

      // Recherche du doc admin par requête (évite le conflit entre id stocké et ID Firestore réel)
      const adminSnap = await db.collection('admin').limit(1).get();
      if (adminSnap.empty) throw new Error('Document admin introuvable dans Firestore.');
      await adminSnap.docs[0].ref.update(adminData);
      await logActivity(userName, userRole, 'Mise à jour du profil administrateur.');

      // Update password in Firebase Auth if provided
      if (password && password.length >= 6) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.updatePassword(password);
          await logActivity(userName, userRole, 'Mise à jour du mot de passe administrateur.');
        } else {
          throw new Error('Impossible de trouver l\'utilisateur courant pour changer le mot de passe.');
        }
      }

      if (adminUser) {
        let notificationBody = `Votre profil administrateur a été mis à jour par ${userName}.`;
        if (password) notificationBody += ' Votre mot de passe a également été modifié.';
        sendEmailNotification(adminData.email || adminUser.email, 'Profil Administrateur Mis à Jour', notificationBody);
      }
      
      alert('Profil administrateur mis à jour !');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil admin:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert(
          'Cette opération est sensible et nécessite une connexion récente. Veuillez vous déconnecter et vous reconnecter avant de changer votre mot de passe.'
        );
      } else {
        alert(`Erreur: ${error.message}`);
      }
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const addGuidedVideo = async (title: string, url: string, userName: string, userRole: UserRole) => {
    setIsSaving(true);
    try {
      const newVideo: Omit<GuidedVideo, 'id'> = {
        title,
        storageUrl: url,
        timestamp: new Date(),
      };
      
      await db.collection('guidedVideos').add(newVideo);
      await logActivity(userName, userRole, `Ajout d'une vidéo guidée : ${title}`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vidéo:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGuidedVideo = async (video: GuidedVideo, userName: string, userRole: UserRole) => {
    setIsSaving(true);
    try {
      await db.collection('guidedVideos').doc(video.id).delete();
      await logActivity(userName, userRole, `Suppression de la vidéo guidée : ${video.title}`);
    } catch (error) {
      console.error('Erreur lors de la suppression de la vidéo:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const value: DataContextType = {
    adminUser,
    activityLogs,
    guidedVideos,
    geranceRecords,
    honorairesRecords,
    erreurAgences,
    rdgRecords,
    dataLoaded,
    isSaving,
    updateAdminProfile,
    addGuidedVideo,
    deleteGuidedVideo,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
