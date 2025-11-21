



import React, { useState } from 'react';
import { Box, Tenant, Agent, PaymentStatus } from '../types';

interface BoxDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  box: Box;
  tenant?: Tenant;
  agent?: Agent;
  onSaveDetails: (box: Box) => void;
  onMarkAsPaid: (tenantId: string) => void;
  onShowHistory: (box: Box) => void;
  onRentBox: (box: Box) => void;
}

const safeFormatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR');
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{value}</dd>
  </div>
);

const AlertItem: React.FC<{ type: 'warning' | 'info'; message: string }> = ({ type, message }) => {
  const bgColor = type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100';
  const textColor = type === 'warning' ? 'text-yellow-800' : 'bg-blue-800';
  const icon = type === 'warning' ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.22 3.009-1.742 3.009H4.42c-1.522 0-2.492-1.675-1.742-3.009l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.293 2.293a1 1 0 011.414 0l1 1a1 1 0 010 1.414l-11 11a1 1 0 01-.39.242l-5 2a1 1 0 01-1.226-1.226l2-5a1 1 0 01.242-.39l11-11zM16 6l-2-2 9 9-2 2-7-7z" />
    </svg>
  );

  return (
    <div className={`flex items-start p-3 rounded-md ${bgColor} ${textColor}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="ml-3">
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
        case PaymentStatus.Paid:
            return 'bg-green-100 text-green-800';
        case PaymentStatus.Due:
            return 'bg-yellow-100 text-yellow-800';
        case PaymentStatus.Overdue:
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-slate-100 text-slate-800';
    }
};


const BoxDetailModal: React.FC<BoxDetailModalProps> = ({ isOpen, onClose, box, tenant, agent, onSaveDetails, onMarkAsPaid, onShowHistory, onRentBox }) => {
  if (!isOpen) return null;

  const [workToDo, setWorkToDo] = useState(box.workToDo || '');
  const [workAlert, setWorkAlert] = useState(box.workAlert || false);

  const alerts = [];
  if (tenant) {
    if (tenant.unpaidRent > 0) {
        alerts.push(<AlertItem key="rent" type="warning" message={`Loyer impayé: ${tenant.unpaidRent} €`} />);
    }
    if (!tenant.idImageUrl) {
        alerts.push(<AlertItem key="id" type="warning" message="Justificatif d'identité manquant" />);
    }
    if (!tenant.insuranceImageUrl) {
        alerts.push(<AlertItem key="insurance" type="warning" message="Justificatif d'assurance manquant" />);
    }
  }
  if (box.workToDo) {
    alerts.push(<AlertItem key="work" type="info" message={`Travaux à prévoir: ${box.workToDo}`} />);
  }
  
  const handleSaveChanges = () => {
      onSaveDetails({ ...box, workToDo, workAlert });
      onClose();
  };
  
  const handleMarkAsPaid = () => {
    if (tenant) {
        onMarkAsPaid(tenant.id);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Détails du Box #{box.id}</h2>
          <div className="flex items-center">
            <button
                type="button"
                onClick={() => onShowHistory(box)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline mr-4"
            >
                Voir l'historique
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-800">Alertes</h3>
              {alerts}
            </div>
          )}

          {tenant ? (
            <>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-3">Informations du Locataire</h3>
                    <dl>
                    <InfoRow label="Nom" value={`${tenant.firstName} ${tenant.lastName}`} />
                    <InfoRow label="Contact" value={<div><p>{tenant.email}</p><p>{tenant.phone}</p></div>} />
                    <InfoRow label="Adresse" value={`${tenant.address}, ${tenant.postalCode} ${tenant.city}`} />
                    <InfoRow label="Code Porte" value={<span className="font-mono">{tenant.doorCode}</span>} />
                    <InfoRow label="Début de location" value={safeFormatDate(tenant.startDate)} />
                    </dl>
                </div>
                
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-3">Paiements</h3>
                    <dl>
                    <InfoRow label="Statut" value={<span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(tenant.paymentStatus)}`}>{tenant.paymentStatus}</span>} />
                    <InfoRow label="Impayés" value={<span className="font-bold text-red-600">{tenant.unpaidRent.toFixed(2)} €</span>} />
                    <InfoRow label="Dernier Paiement" value={safeFormatDate(tenant.lastPaymentDate)} />
                    <InfoRow label="Prochaine Échéance" value={safeFormatDate(tenant.nextDueDate)} />
                    </dl>
                </div>
            </>
          ) : (
             <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">Ce box est disponible</h3>
                <p className="text-sm text-green-700 mt-1">Vous pouvez le louer dès maintenant.</p>
             </div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-3">Informations du Box</h3>
            <dl>
                <InfoRow label="Taille" value={box.size} />
                <InfoRow label="Prix" value={`${box.price} €/mois`} />
                <InfoRow label="Localisation" value={`${box.side} / ${box.level}`} />
                <InfoRow label="Note" value={box.note || 'Aucune'} />
            </dl>
          </div>
          
          {agent && tenant && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-3">Agent Responsable</h3>
              <dl>
                <InfoRow label="Nom" value={agent.name} />
                <InfoRow label="Contact" value={<div><p>{agent.email}</p><p>{agent.phone}</p></div>} />
              </dl>
            </div>
          )}
          
           <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700">Travaux à prévoir sur le box</h3>
                 <div className="mt-2 space-y-3">
                     <div>
                         <label htmlFor="modalWorkToDo" className="block text-sm font-medium text-gray-700">Description des travaux</label>
                        <input
                            type="text"
                            id="modalWorkToDo"
                            name="workToDo" 
                            value={workToDo} 
                            onChange={(e) => setWorkToDo(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Ex: La porte grince, le volet est bloqué..."
                        />
                     </div>
                     <div className="flex items-center">
                        <input 
                            id="modalWorkAlert"
                            name="workAlert"
                            type="checkbox"
                            checked={workAlert}
                            onChange={(e) => setWorkAlert(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="modalWorkAlert" className="ml-2 block text-sm text-gray-900">Activer une alerte de travaux sur ce box</label>
                     </div>
                 </div>
              </div>

        </div>

        <div className="p-4 border-t flex justify-between items-center bg-gray-50 rounded-b-lg">
          {tenant ? (
            <button type="button" onClick={handleMarkAsPaid} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">
                Marquer comme Payé
            </button>
          ) : (
            <button type="button" onClick={() => onRentBox(box)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">
                Louer ce box
            </button>
          )}
          <div className="space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
               <button type="button" onClick={handleSaveChanges} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Sauvegarder</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoxDetailModal;
