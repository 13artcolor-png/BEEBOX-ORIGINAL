
import React from 'react';
import { Box, Tenant } from '../types';

interface BoxHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  box: Box;
  allTenants: Tenant[];
}

const safeFormatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR');
};

const BoxHistoryModal: React.FC<BoxHistoryModalProps> = ({ isOpen, onClose, box, allTenants }) => {
  if (!isOpen) return null;

  const historyTenants = box.tenantHistory
    .map(tenantId => allTenants.find(t => t.id === tenantId))
    .filter((t): t is Tenant => !!t)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Historique du Box #{box.id}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-3">Anciens Locataires</h3>
            {historyTenants.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                {historyTenants.map(tenant => (
                    <li key={tenant.id} className="py-3">
                        <p className="font-medium text-slate-900">{tenant.firstName} {tenant.lastName}</p>
                        <p className="text-sm text-slate-500">
                            Loué du {safeFormatDate(tenant.startDate)} 
                            au {tenant.endDate ? safeFormatDate(tenant.endDate) : 'Présent'}
                        </p>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-sm text-slate-500 italic">Aucun ancien locataire enregistré.</p>
            )}
          </div>
          
           <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-3">Travaux Réalisés</h3>
            {box.workHistory && box.workHistory.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                {box.workHistory.map((work, index) => (
                    <li key={index} className="py-3">
                        <p className="font-medium text-slate-900">{work.description}</p>
                        <p className="text-sm text-slate-500">
                            Terminé le: {safeFormatDate(work.completedDate)}
                        </p>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-sm text-slate-500 italic">Aucun travaux enregistré.</p>
            )}
          </div>

        </div>

        <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default BoxHistoryModal;
