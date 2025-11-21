import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, logActivity } from '../services/firebase';
import { Box, BoxStatus } from '../types';

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
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time listener for boxes
  useEffect(() => {
    const unsubscribe = db
      .collection('boxes')
      .onSnapshot(
        (querySnapshot) => {
          const data = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Box[];
          
          // Sort by ID
          data.sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
          
          setBoxes(data);
          setDataLoaded(true);
        },
        (error) => {
          console.error('Error listening to boxes:', error);
          setDataLoaded(true);
        }
      );

    return () => unsubscribe();
  }, []);

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
