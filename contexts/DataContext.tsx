import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth, logActivity } from '../services/firebase';
import { AdminUser, ActivityLog, GuidedVideo, UserRole } from '../types';
import { sendEmailNotification } from '../services/notificationService';

interface DataContextType {
  adminUser: AdminUser | null;
  activityLogs: ActivityLog[];
  guidedVideos: GuidedVideo[];
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
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [guidedVideos, setGuidedVideos] = useState<GuidedVideo[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time listeners
  useEffect(() => {
    let loadedCount = 0;
    const collectionsToLoad = 3;

    const onDataLoaded = () => {
      loadedCount++;
      if (loadedCount >= collectionsToLoad) {
        setDataLoaded(true);
      }
    };

    const unsubscribeAdmin = db.collection('admin').onSnapshot(
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const adminDoc = querySnapshot.docs[0];
          setAdminUser({ id: adminDoc.id, ...adminDoc.data() } as AdminUser);
        } else {
          setAdminUser(null);
        }
        onDataLoaded();
      },
      (error) => {
        console.error('Error listening to admin:', error);
        onDataLoaded();
      }
    );

    const unsubscribeLogs = db
      .collection('activityLogs')
      .orderBy('timestamp', 'desc')
      .onSnapshot(
        (querySnapshot) => {
          const data = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ActivityLog[];
          setActivityLogs(data);
          onDataLoaded();
        },
        (error) => {
          console.error('Error listening to activity logs:', error);
          onDataLoaded();
        }
      );

    const unsubscribeVideos = db
      .collection('guidedVideos')
      .orderBy('timestamp', 'desc')
      .onSnapshot(
        (querySnapshot) => {
          const data = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as GuidedVideo[];
          setGuidedVideos(data);
          onDataLoaded();
        },
        (error) => {
          console.error('Error listening to guided videos:', error);
          onDataLoaded();
        }
      );

    return () => {
      unsubscribeAdmin();
      unsubscribeLogs();
      unsubscribeVideos();
    };
  }, []);

  const updateAdminProfile = async (updatedAdmin: AdminUser, userName: string, userRole: UserRole) => {
    if (!adminUser || !adminUser.id) {
      alert('Action non autorisée ou utilisateur non connecté.');
      return;
    }

    setIsSaving(true);
    try {
      const { id, password, ...adminData } = updatedAdmin;

      // Update Firestore profile data
      await db.collection('admin').doc(adminUser.id).update(adminData);
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
    dataLoaded,
    isSaving,
    updateAdminProfile,
    addGuidedVideo,
    deleteGuidedVideo,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
