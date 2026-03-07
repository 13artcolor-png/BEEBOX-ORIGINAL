import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, firestoreGet, logActivity } from '../services/firebase';
import { Box, BoxStatus } from '../types';
import { useAuth } from './AuthContext';

interface BoxesContextType {
  boxes: Box[];
  dataLoaded: boolean;
  updateBoxDetails: (updatedBox: Box, userName: string, userRole: string) => Promise<void>;
  isSaving: boolean;
}

const BoxesContext = createContext<BoxesContextType | undefined>(undefined);

export const useBoxes = () => {
  const context = useContext(BoxesContext);
  if (!context) {
    throw new Error('useBoxes must be used within BoxesProvider');
  }
  return context;
};

interface BoxesProviderProps {
  children: ReactNode;
}

export const BoxesProvider: React.FC<BoxesProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Firestore via .get() (polling) — onSnapshot WebSocket incompatible avec Firebase v8 CDN
  useEffect(() => {
    if (!isAuthenticated) {
      setBoxes([]);
      setDataLoaded(false);
      return;
    }

    let cancelled = false;
    setDataLoaded(false);

    const fetchBoxes = async () => {
      try {
        const data = await firestoreGet('boxes') as Box[];
        if (cancelled) return;
        data.sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
        setBoxes(data);
        setDataLoaded(true);
      } catch (error: any) {
        if (cancelled) return;
        console.error('Error fetching boxes:', error?.code, error?.message);
        setDataLoaded(true);
      }
    };

    fetchBoxes();
    const interval = setInterval(fetchBoxes, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const updateBoxDetails = async (updatedBox: Box, userName: string, userRole: string) => {
    setIsSaving(true);
    try {
      const originalBox = boxes.find((b) => b.id === updatedBox.id);
      if (!originalBox) return;

      const changes: string[] = [];
      for (const key in updatedBox) {
        if (Object.prototype.hasOwnProperty.call(updatedBox, key)) {
          const typedKey = key as keyof Box;
          if (originalBox[typedKey] !== updatedBox[typedKey]) {
            changes.push(`${typedKey}: '${originalBox[typedKey]}' -> '${updatedBox[typedKey]}'`);
          }
        }
      }

      const { id, ...boxData } = updatedBox;
      await db.collection('boxes').doc(id).update(boxData);
      // Mise à jour locale immédiate sans attendre le prochain poll
      setBoxes(prev => prev.map(b => b.id === id ? updatedBox : b));

      if (changes.length > 0) {
        await logActivity(userName, userRole as any, `Modification du box #${id}: ${changes.join(', ')}`);
      }
    } catch (error) {
      console.error('Error updating box details:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const value: BoxesContextType = {
    boxes,
    dataLoaded,
    updateBoxDetails,
    isSaving,
  };

  return <BoxesContext.Provider value={value}>{children}</BoxesContext.Provider>;
};
