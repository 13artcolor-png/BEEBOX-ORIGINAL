

import React, { useState, useEffect } from 'react';
import { Agent, Agency } from '../types';

interface AgentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Omit<Agent, 'id'> | Agent) => void;
  agentToEdit: Agent | null;
  agencies: Agency[];
}

const AgentEditorModal: React.FC<AgentEditorModalProps> = ({ isOpen, onClose, onSave, agentToEdit, agencies }) => {
  const [agentData, setAgentData] = useState({
    name: '',
    agencyId: '',
    personalCode: '',
    username: '',
    photoUrl: '',
    email: '',
    phone: '',
    doorCode: '',
    password: '',
  });
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [doorCodeError, setDoorCodeError] = useState('');


  useEffect(() => {
    if (agentToEdit) {
      setAgentData({
        name: agentToEdit.name,
        agencyId: agentToEdit.agencyId,
        personalCode: agentToEdit.personalCode,
        username: agentToEdit.username,
        photoUrl: agentToEdit.photoUrl || '',
        email: agentToEdit.email,
        phone: agentToEdit.phone,
        doorCode: agentToEdit.doorCode,
        password: '', // Password is for reset only, not displayed
      });
      setPhotoPreview(agentToEdit.photoUrl);
    } else {
      setAgentData({
        name: '',
        agencyId: agencies[0]?.id || '',
        personalCode: `AGENT${Math.floor(1000 + Math.random() * 9000)}`,
        username: '',
        photoUrl: '',
        email: '',
        phone: '',
        doorCode: '',
        password: '',
      });
      setPhotoPreview(undefined);
    }
    setDoorCodeError('');
  }, [agentToEdit, isOpen, agencies]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'doorCode') {
        if (value.length > 8 || !/^\d*$/.test(value)) return;
        if (value.length > 0 && value.length < 8) {
            setDoorCodeError('Le code doit contenir 8 chiffres.');
        } else {
            setDoorCodeError('');
        }
    }
    setAgentData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      setAgentData(p => ({ ...p, photoUrl: fileUrl }));
      setPhotoPreview(fileUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(agentData.doorCode && agentData.doorCode.length !== 8){
        setDoorCodeError('Le code doit contenir exactement 8 chiffres.');
        return;
    }

    if (!agentToEdit && (!agentData.password || agentData.password.length < 6)) {
        alert("Veuillez définir un mot de passe initial d'au moins 6 caractères pour le nouvel agent.");
        return;
    }
    
    if (agentToEdit && agentData.password && agentData.password.length < 6) {
        alert("Le nouveau mot de passe doit contenir au moins 6 caractères.");
        return;
    }

    if (agentToEdit) {
      onSave({ ...agentToEdit, ...agentData });
    } else {
      onSave(agentData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {agentToEdit ? "Modifier l'Agent" : "Ajouter un Nouvel Agent"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nom complet" name="name" value={agentData.name} onChange={handleChange} required />
            <InputField label="Code Personnel" name="personalCode" value={agentData.personalCode} onChange={handleChange} required />
            <InputField label="Email (pour la connexion)" name="email" type="email" value={agentData.email} onChange={handleChange} required />
            <InputField label="Téléphone" name="phone" value={agentData.phone} onChange={handleChange} />
            <InputField label="Nom d'utilisateur (affiché)" name="username" value={agentData.username} onChange={handleChange} required />
            <InputField label="Code Porte (8 chiffres)" name="doorCode" value={agentData.doorCode} onChange={handleChange} error={doorCodeError} />
          </div>
          
           <div>
             <label htmlFor="agencyId" className="block text-sm font-medium text-gray-700">Agence</label>
             <select
                id="agencyId"
                name="agencyId"
                value={agentData.agencyId}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
             >
                {agencies.map(agency => (
                    <option key={agency.id} value={agency.id}>{agency.name}</option>
                ))}
             </select>
          </div>
           <div className="pt-4 border-t">
               <InputField 
                    label="Mot de passe" 
                    name="password" 
                    type="password"
                    value={agentData.password} 
                    onChange={handleChange} 
                    required={!agentToEdit}
                    placeholder={agentToEdit ? "Laisser vide pour ne pas changer" : "Mot de passe initial (min. 6 caractères)"}
                />
            </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Photo</label>
            <div className="mt-1 flex items-center space-x-4">
              <img src={photoPreview || 'https://via.placeholder.com/80'} alt="photo preview" className="w-20 h-20 object-cover rounded-full bg-gray-100" />
              <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
            </div>
          </div>
        </form>
        <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
          <button type="submit" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; type?: string; required?: boolean; placeholder?: string, error?: string }> = 
({ label, name, value, onChange, type = 'text', required = false, placeholder='', error }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}{required && ' *'}</label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={`mt-1 block w-full px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export default AgentEditorModal;