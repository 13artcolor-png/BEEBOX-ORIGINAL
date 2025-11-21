

import React, { useState, useEffect } from 'react';
import { Tenant, IdType } from '../types';

const FileField: React.FC<{ label: string, name: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, fileName?: string }> = ({ label, name, onChange, fileName }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
                 <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                    <label htmlFor={name} className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Télécharger un fichier</span>
                        <input id={name} name={name} type="file" className="sr-only" onChange={onChange} />
                    </label>
                    <p className="pl-1">ou glissez-déposez</p>
                </div>
                {fileName ? <p className="text-xs text-green-600">{fileName}</p> : <p className="text-xs text-gray-500">PNG, JPG, PDF</p>}
            </div>
        </div>
    </div>
);


interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tenant: Tenant, files: { idImage: File | null, insuranceImage: File | null }) => void;
  tenantToEdit: Tenant;
}

const EditTenantModal: React.FC<EditTenantModalProps> = ({ isOpen, onClose, onSave, tenantToEdit }) => {
  const [formData, setFormData] = useState<Tenant>(tenantToEdit);
  const [doorCodeError, setDoorCodeError] = useState('');
  const [idImage, setIdImage] = useState<File | null>(null);
  const [insuranceImage, setInsuranceImage] = useState<File | null>(null);


  useEffect(() => {
    if (isOpen) {
      setFormData(tenantToEdit);
      setDoorCodeError('');
      setIdImage(null);
      setInsuranceImage(null);
    }
  }, [tenantToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'doorCode') {
        if (value.length > 8 || !/^\d*$/.test(value)) return; 
        if (value.length > 0 && value.length < 8) {
            setDoorCodeError('Le code doit contenir 8 chiffres.');
        } else {
            setDoorCodeError('');
        }
    }
    if (name === 'phone') {
        if (value.length > 10 || !/^\d*$/.test(value)) return;
    }
     if (name === 'postalCode') {
        if (value.length > 5 || !/^\d*$/.test(value)) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'id' | 'insurance') => {
    if (e.target.files && e.target.files[0]) {
        if(fileType === 'id') setIdImage(e.target.files[0]);
        else setInsuranceImage(e.target.files[0]);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Veuillez remplir les champs obligatoires (Nom, Prénom, Email).");
      return;
    }
    if (formData.doorCode.length > 0 && formData.doorCode.length !== 8) {
      setDoorCodeError('Le code doit contenir exactement 8 chiffres.');
      return;
    }
    onSave(formData, { idImage, insuranceImage });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Modifier le Locataire: {formData.firstName} {formData.lastName}</h2>
        </div>
        <form id="edit-tenant-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Informations du locataire</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InputField label="Prénom" name="firstName" value={formData.firstName} onChange={handleChange} required />
            <InputField label="Nom" name="lastName" value={formData.lastName} onChange={handleChange} required />
            <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <InputField label="Téléphone (10 chiffres)" name="phone" value={formData.phone} onChange={handleChange} />
            <div className="lg:col-span-3">
              <InputField label="Adresse" name="address" value={formData.address} onChange={handleChange} />
            </div>
            <InputField label="Code Postal (5 chiffres)" name="postalCode" value={formData.postalCode} onChange={handleChange} />
            <InputField label="Ville" name="city" value={formData.city} onChange={handleChange} />
            <InputField label="Code Porte (8 chiffres)" name="doorCode" value={formData.doorCode} onChange={handleChange} error={doorCodeError} />
             <div>
                <label htmlFor="idType" className="block text-sm font-medium text-gray-700">Type de justificatif</label>
                <select name="idType" id="idType" value={formData.idType} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                   {Object.values(IdType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
             </div>
            <InputField label="N° Justificatif" name="idNumber" value={formData.idNumber} onChange={handleChange} />
             <div className="lg:col-span-3">
                <InputField label="Assurance (Compagnie & N° Contrat)" name="insuranceInfo" value={formData.insuranceInfo} onChange={handleChange} />
             </div>
            <InputField label="Date de sortie potentielle" name="potentialEndDate" type="date" value={formData.potentialEndDate} onChange={handleChange} />
             <div className="lg:col-span-3">
                 <label htmlFor="info" className="block text-sm font-medium text-gray-700">Informations particulières</label>
                <textarea 
                    id="info"
                    name="info" 
                    value={formData.info} 
                    onChange={handleChange}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
             </div>
             <div className="lg:col-span-3 mt-4 pt-4 border-t">
                <FileField label="Justificatif d'identité (Téléverser un nouveau)" name="idFile" onChange={(e) => handleFileChange(e, 'id')} fileName={idImage?.name} />
                {formData.idImageUrl && !idImage && <p className="text-xs text-green-700 mt-1">Un justificatif est déjà enregistré.</p>}
            </div>
            <div className="lg:col-span-3">
                <FileField label="Justificatif d'assurance (Téléverser un nouveau)" name="insuranceFile" onChange={(e) => handleFileChange(e, 'insurance')} fileName={insuranceImage?.name}/>
                {formData.insuranceImageUrl && !insuranceImage && <p className="text-xs text-green-700 mt-1">Un justificatif est déjà enregistré.</p>}
            </div>
          </div>
        </form>
        <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
          <button type="submit" form="edit-tenant-form" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Enregistrer les modifications</button>
        </div>
      </div>
    </div>
  );
};

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; type?: string; required?: boolean; error?: string }> = 
({ label, name, value, onChange, type = 'text', required = false, error }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}{required && ' *'}</label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className={`mt-1 block w-full px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export default EditTenantModal;
