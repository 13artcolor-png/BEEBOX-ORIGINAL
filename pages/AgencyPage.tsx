

import React, { useState } from 'react';
import { Agent, Agency } from '../types';
import AgencyEditorModal from '../components/AgencyEditorModal';
import AgentEditorModal from '../components/AgentEditorModal';

interface AgencyPageProps {
  agents: Agent[];
  agencies: Agency[];
  onAddAgent: (agent: Omit<Agent, 'id' | 'password'>) => void;
  onUpdateAgent: (agent: Agent) => void;
  onAddAgency: (agency: Omit<Agency, 'id'>) => void;
  onUpdateAgency: (agency: Agency) => void;
  onDeleteAgency: (agencyId: string) => void;
  onDeleteAgent: (agentId: string) => void;
}

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
  </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);


const AgencyPage: React.FC<AgencyPageProps> = ({ agents, agencies, onAddAgent, onUpdateAgent, onAddAgency, onUpdateAgency, onDeleteAgency, onDeleteAgent }) => {
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const bgColors = ['bg-white', 'bg-sky-50', 'bg-emerald-50', 'bg-fuchsia-50', 'bg-amber-50', 'bg-rose-50'];

  const handleOpenAgencyModal = (agency: Agency | null = null) => {
    setEditingAgency(agency);
    setIsAgencyModalOpen(true);
  };
  
  const handleOpenAgentModal = (agent: Agent | null = null) => {
    setEditingAgent(agent);
    setIsAgentModalOpen(true);
  };

  const handleSaveAgency = (agencyData: Omit<Agency, 'id'> | Agency) => {
    if ('id' in agencyData) {
      onUpdateAgency(agencyData);
    } else {
      onAddAgency(agencyData);
    }
    setIsAgencyModalOpen(false);
  };
  
  const handleSaveAgent = (agentData: Omit<Agent, 'id' | 'password'> | Agent) => {
    if ('id' in agentData) {
      onUpdateAgent(agentData as Agent);
    } else {
      onAddAgent(agentData as Omit<Agent, 'id' | 'password'>);
    }
    setIsAgentModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Gestion des Agences et Agents</h1>
        <div className="space-x-3">
            <button onClick={() => handleOpenAgencyModal()} className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 font-medium transition-colors transform hover:-translate-y-0.5 shadow hover:shadow-md">
                Ajouter Agence
            </button>
             <button onClick={() => handleOpenAgentModal()} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors transform hover:-translate-y-0.5 shadow hover:shadow-md">
                Ajouter Agent
            </button>
        </div>
      </div>
      
      <div className="space-y-8">
        {agencies.map((agency, index) => (
          <div key={agency.id} className={`p-6 rounded-xl shadow-sm border border-slate-200 ${bgColors[index % bgColors.length]}`}>
            <div className="flex items-start gap-6">
              <img src={agency.logoUrl || 'https://via.placeholder.com/80'} alt={`${agency.name} logo`} className="w-20 h-20 object-contain rounded-md bg-slate-100 p-1" />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{agency.name}</h2>
                        <div className="flex flex-col gap-1 mt-2 text-sm text-slate-600">
                          <div className="flex gap-8">
                            <p><strong>Frais de gestion:</strong> {agency.managementFee}%</p>
                            <p><strong>Frais d'entrée:</strong> {agency.entryFee} €</p>
                          </div>
                          {agency.reportContactEmail && (
                             <p><strong>Email rapports:</strong> <span className="font-mono text-xs">{agency.reportContactEmail}</span></p>
                          )}
                        </div>
                    </div>
                     <div className="flex space-x-3">
                        <button onClick={() => handleOpenAgencyModal(agency)} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 p-1 rounded-md hover:bg-slate-100 transition-colors">
                            <EditIcon /> Modifier
                        </button>
                         <button onClick={() => onDeleteAgency(agency.id)} className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 p-1 rounded-md hover:bg-red-50 transition-colors">
                            <DeleteIcon /> Supprimer
                         </button>
                    </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Agents de cette agence</h3>
              <ul className="divide-y divide-slate-200">
                {agents.filter(a => a.agencyId === agency.id).map(agent => (
                  <li key={agent.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={agent.photoUrl || 'https://via.placeholder.com/40'} alt={agent.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <span className="text-slate-800 font-medium">{agent.name}</span>
                        <p className="text-xs text-slate-500">Code: {agent.personalCode}</p>
                      </div>
                    </div>
                     <div className="flex space-x-3">
                        <button onClick={() => handleOpenAgentModal(agent)} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 p-1 rounded-md hover:bg-slate-100 transition-colors">
                            <EditIcon /> Modifier
                        </button>
                         <button onClick={() => onDeleteAgent(agent.id)} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 p-1 rounded-md hover:bg-red-50 transition-colors">
                            <DeleteIcon /> Supprimer
                         </button>
                     </div>
                  </li>
                ))}
                 {agents.filter(a => a.agencyId === agency.id).length === 0 && (
                    <p className="text-sm text-slate-500 italic py-2">Aucun agent assigné.</p>
                 )}
              </ul>
            </div>
          </div>
        ))}
      </div>
      
      {isAgencyModalOpen && (
        <AgencyEditorModal
            isOpen={isAgencyModalOpen}
            onClose={() => setIsAgencyModalOpen(false)}
            onSave={handleSaveAgency}
            agencyToEdit={editingAgency}
        />
      )}
      
      {isAgentModalOpen && (
        <AgentEditorModal
            isOpen={isAgentModalOpen}
            onClose={() => setIsAgentModalOpen(false)}
            onSave={handleSaveAgent}
            agentToEdit={editingAgent}
            agencies={agencies}
        />
      )}
    </div>
  );
};

export default AgencyPage;