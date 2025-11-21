
import React, { useState, useEffect } from 'react';
import { Agency } from '../types';

interface AgencyEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agency: Omit<Agency, 'id'> | Agency) => void;
  agencyToEdit: Agency | null;
}

const AgencyEditorModal: React.FC<AgencyEditorModalProps> = ({ isOpen, onClose, onSave, agencyToEdit }) => {
  const [agencyData, setAgencyData] = useState({
    name: '',
    managementFee: 0,
    entryFee: 0,
    logoUrl: '',
    email: '',
    phone: '',
    reportContactEmail: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (agencyToEdit) {
      setAgencyData({
        name: agencyToEdit.name,
        managementFee: agencyToEdit.managementFee,
        entryFee: agencyToEdit.entryFee,
        logoUrl: agencyToEdit.logoUrl || '',
        email: agencyToEdit.email,
        phone: agencyToEdit.phone,
        reportContactEmail: agencyToEdit.reportContactEmail || '',
      });
      setLogoPreview(agencyToEdit.logoUrl);
    } else {
      setAgencyData({ name: '', managementFee: 0, entryFee: 0, logoUrl: '', email: '', phone: '', reportContactEmail: '' });
      setLogoPreview(undefined);
    }
  }, [agencyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setAgencyData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      setAgencyData(p => ({ ...p, logoUrl: fileUrl }));
      setLogoPreview(fileUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (agencyToEdit) {
      onSave({ ...agencyToEdit, ...agencyData });
    } else {
      onSave(agencyData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {agencyToEdit ? "Modifier l'Agence" : "Ajouter une Nouvelle Agence"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
          <InputField label="Nom de l'agence" name="name" value={agencyData.name} onChange={handleChange} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Email" name="email" type="email" value={agencyData.email} onChange={handleChange} />
            <InputField label="Téléphone" name="phone" value={agencyData.phone} onChange={handleChange} />
          </div>
          <InputField label="Email pour les rapports" name="reportContactEmail" type="email" value={agencyData.reportContactEmail} onChange={handleChange} placeholder="orchestra@egide.net"/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Frais de gestion (%)" name="managementFee" type="number" value={agencyData.managementFee.toString()} onChange={handleChange} />
            <InputField label="Frais d'entrée (€)" name="entryFee" type="number" value={agencyData.entryFee.toString()} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            <div className="mt-1 flex items-center space-x-4">
              <img src={logoPreview || 'https://via.placeholder.com/80'} alt="logo preview" className="w-20 h-20 object-contain rounded-md bg-gray-100 p-1" />
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

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean, placeholder?: string }> = 
({ label, name, value, onChange, type = 'text', required = false, placeholder='' }) => (
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
      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    />
  </div>
);

export default AgencyEditorModal;
