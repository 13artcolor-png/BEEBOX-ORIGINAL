import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Box, Tenant, ChatMessage } from '../types';

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose?: () => void;
}

interface UIContextType {
  activePage: string;
  setActivePage: (page: string) => void;
  
  // Modal states
  isTenantModalOpen: boolean;
  isEditTenantModalOpen: boolean;
  isBoxDetailModalOpen: boolean;
  isHistoryModalOpen: boolean;
  isVideoManagerOpen: boolean;
  
  // Selected items
  selectedBox: Box | null;
  editingTenant: Tenant | null;
  
  // Confirmation modal
  confirmation: ConfirmationState;
  setConfirmation: (confirmation: ConfirmationState) => void;
  
  // Chat messages
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  
  // Modal handlers
  openTenantModal: (box?: Box) => void;
  closeTenantModal: () => void;
  openEditTenantModal: (tenant: Tenant) => void;
  closeEditTenantModal: () => void;
  openBoxDetailModal: (box: Box) => void;
  closeBoxDetailModal: () => void;
  openHistoryModal: (box: Box) => void;
  closeHistoryModal: () => void;
  openVideoManager: () => void;
  closeVideoManager: () => void;
  closeAllModals: () => void;
  
  // Confirmation handlers
  showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmation: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const [activePage, setActivePage] = useState('boxes');
  
  // Modal states
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
  const [isBoxDetailModalOpen, setIsBoxDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isVideoManagerOpen, setIsVideoManagerOpen] = useState(false);
  
  // Selected items
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  // Confirmation modal
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'gemini', text: 'Bonjour ! Comment puis-je vous aider avec la gestion de BEEBOX LAON ?' },
  ]);
  
  // Modal handlers
  const openTenantModal = (box?: Box) => {
    if (box) {
      setSelectedBox(box);
      setIsBoxDetailModalOpen(false);
    } else {
      setSelectedBox(null);
    }
    setIsTenantModalOpen(true);
  };
  
  const closeTenantModal = () => {
    setIsTenantModalOpen(false);
    setSelectedBox(null);
  };
  
  const openEditTenantModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsEditTenantModalOpen(true);
  };
  
  const closeEditTenantModal = () => {
    setEditingTenant(null);
    setIsEditTenantModalOpen(false);
  };
  
  const openBoxDetailModal = (box: Box) => {
    setSelectedBox(box);
    setIsBoxDetailModalOpen(true);
  };
  
  const closeBoxDetailModal = () => {
    setIsBoxDetailModalOpen(false);
    setSelectedBox(null);
  };
  
  const openHistoryModal = (box: Box) => {
    setSelectedBox(box);
    setIsHistoryModalOpen(true);
  };
  
  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedBox(null);
  };
  
  const openVideoManager = () => {
    setIsVideoManagerOpen(true);
  };
  
  const closeVideoManager = () => {
    setIsVideoManagerOpen(false);
  };
  
  const closeAllModals = () => {
    setIsTenantModalOpen(false);
    setIsEditTenantModalOpen(false);
    setIsBoxDetailModalOpen(false);
    setIsHistoryModalOpen(false);
    setIsVideoManagerOpen(false);
    setSelectedBox(null);
    setEditingTenant(null);
  };
  
  // Confirmation handlers
  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmation({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };
  
  const closeConfirmation = () => {
    setConfirmation({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {},
    });
  };
  
  const value: UIContextType = {
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
    setConfirmation,
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
  };
  
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
