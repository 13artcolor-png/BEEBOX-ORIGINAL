
import React from 'react';
import { Box, Tenant, BoxStatus, UserRole, Agent } from '../types';

const WarningIcon: React.FC<{ message: string }> = ({ message }) => (
  <div className="relative group">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.22 3.009-1.742 3.009H4.42c-1.522 0-2.492-1.675-1.742-3.009l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
    <div className="absolute bottom-full z-10 mb-2 w-max px-2 py-1 text-xs text-white bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      {message}
    </div>
  </div>
);

const WorkIcon: React.FC<{ message: string }> = ({ message }) => (
    <div className="relative group">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 2.293a1 1 0 011.414 0l1 1a1 1 0 010 1.414l-11 11a1 1 0 01-.39.242l-5 2a1 1 0 01-1.226-1.226l2-5a1 1 0 01.242-.39l11-11zM16 6l-2-2 9 9-2 2-7-7z" />
        </svg>
        <div className="absolute bottom-full z-10 mb-2 w-max px-2 py-1 text-xs text-white bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {message}
        </div>
    </div>
);


interface BoxTileProps {
  box: Box;
  tenant: Tenant | undefined;
  agents: Agent[];
  onClick: (box: Box) => void;
  onInitiateRelease: (boxId: string) => void;
  onShowHistory: (box: Box) => void;
  currentUserRole: UserRole;
  currentAgentId: string | null;
}

const safeFormatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR');
};

const BoxTile: React.FC<BoxTileProps> = ({ box, tenant, agents, onClick, onInitiateRelease, onShowHistory, currentUserRole, currentAgentId }) => {
  const isOccupied = box.status === BoxStatus.Occupied;
  const canRelease = isOccupied && (currentUserRole === UserRole.Admin || currentAgentId === tenant?.agentId);
  
  const rentingAgent = isOccupied ? agents.find(a => a.id === box.rentedByAgentId) : undefined;

  const tenantAlerts = [];
  if (isOccupied && tenant) {
    if (tenant.unpaidRent > 0) {
      tenantAlerts.push({ key: 'rent', message: `Loyer impayé: ${tenant.unpaidRent}€` });
    }
    if (!tenant.idImageUrl) {
      tenantAlerts.push({ key: 'id', message: "Justificatif d'identité manquant" });
    }
    if (!tenant.insuranceImageUrl) {
      tenantAlerts.push({ key: 'insurance', message: 'Justificatif d\'assurance manquant' });
    }
  }

  return (
    <div 
      className={`rounded-xl border border-slate-200 ${isOccupied ? 'bg-red-50' : 'bg-white'} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between`}
    >
      <div 
        className="p-4 cursor-pointer"
        onClick={() => onClick(box)}
        role="button"
        tabIndex={0}
        aria-label={`Box ${box.id}, Status: ${isOccupied ? 'Occupé' : 'Libre'}`}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-slate-800">Box #{box.id}</h3>
          <div className="flex items-center gap-2">
            {box.workAlert && <WorkIcon message={box.workToDo || 'Travaux à prévoir'} />}
            {tenantAlerts.map(alert => <WarningIcon key={alert.key} message={alert.message} />)}
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isOccupied ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {isOccupied ? 'Occupé' : 'Libre'}
            </span>
          </div>
        </div>
        <div className="text-sm text-slate-500 space-y-1.5">
          <p><strong>Taille:</strong> {box.size}</p>
          <p><strong>Prix:</strong> {box.price} €/mois</p>
          <p><strong>Côté:</strong> {box.side}</p>
          <p><strong>Niveau:</strong> {box.level}</p>
        </div>
      </div>
      
      {isOccupied && tenant && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-4 rounded-b-xl space-y-2">
          <div>
            <h4 className="text-sm font-semibold mb-1 text-slate-800">Locataire Actuel</h4>
            <p className="text-sm text-slate-700">{tenant.firstName} {tenant.lastName}</p>
            <p className="text-xs text-slate-500">Entrée le: {safeFormatDate(tenant.startDate)}</p>
          </div>
           {rentingAgent && (
             <p className="text-xs text-slate-500 italic">Loué par: {rentingAgent.name}</p>
           )}
           {canRelease && (
            <button
                onClick={(e) => { e.stopPropagation(); onInitiateRelease(box.id); }}
                className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-300 rounded-md hover:bg-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
            >
                Libérer le Box
            </button>
           )}
        </div>
      )}
    </div>
  );
};

export default BoxTile;
