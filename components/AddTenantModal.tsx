
import React, { useState } from 'react';
import { Box, Tenant, IdType, BoxStatus } from '../types';

interface AddTenantModalProps {
  box: Box | null;
  allBoxes: Box[];
  agentId: string;
  onClose: () => void;
  onSave: (tenantData: Omit<Tenant, 'id' | 'rentedBoxes' | 'unpaidRent' | 'paymentStatus'>, boxId: string, workData: { workToDo: string; workAlert: boolean }) => void;
  onShowHistory: (box: Box) => void;
}

const AddTenantModal: React.FC<AddTenantModalProps> = ({ box, allBoxes, agentId, onClose, onSave, onShowHistory }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    idNumber: '',
    idType: IdType.CarteIdentite,
    insuranceInfo: '',
    doorCode: '',
    startDate: new Date().toISOString().split('T')[0],
    potentialEndDate: '',
    info: '',
  });

  const [selectedBoxId, setSelectedBoxId] = useState<string>(box?.id || '');
  
  const vacantBoxes = allBoxes.filter(b => b.status === BoxStatus.Vacant);
  const currentBoxDetails = box || allBoxes.find(b => b.id === selectedBoxId);


  const [workData, setWorkData] = useState({
    workToDo: currentBoxDetails?.workToDo || '',
    workAlert: currentBoxDetails?.workAlert || false,
  });

  const [idImage, setIdImage] = useState<File | null>(null);
  const [insuranceImage, setInsuranceImage] = useState<File | null>(null);
  const [doorCodeError, setDoorCodeError] = useState('');

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

  const handleWorkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setWorkData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'id' | 'insurance') => {
    if (e.target.files && e.target.files[0]) {
        if(fileType === 'id') setIdImage(e.target.files[0]);
        else setInsuranceImage(e.target.files[0]);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoxId) {
        alert("Veuillez sélectionner un box pour le locataire.");
        return;
    }
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Veuillez remplir les champs obligatoires (Nom, Prénom, Email).");
      return;
    }
    if (formData.doorCode.length > 0 && formData.doorCode.length !== 8) {
      setDoorCodeError('Le code doit contenir exactement 8 chiffres.');
      return;
    }

    // NOTE: La sauvegarde d'images en base64 directement dans Firestore peut échouer
    // si le fichier est trop grand (limite de 1Mo par document).
    // La méthode correcte est d'uploader le fichier sur Firebase Storage
    // et de ne sauvegarder que l'URL de téléchargement ici.
    // Cette partie est temporairement désactivée pour permettre la création de locataires.
    const idImageUrl = undefined;
    const insuranceImageUrl = undefined;
    
    /*
    // Implémentation future correcte (nécessite la configuration de Firebase Storage)
    const uploadFile = async (file: File): Promise<string> => {
        // ... logique d'upload vers Firebase Storage ...
        // return downloadURL;
    }
    const idImageUrl = idImage ? await uploadFile(idImage) : undefined;
    const insuranceImageUrl = insuranceImage ? await uploadFile(insuranceImage) : undefined;
    */

    onSave({
      ...formData,
      agentId: agentId,
      endDate: null,
      idImageUrl,
      insuranceImageUrl,
    }, selectedBoxId, workData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
           <div>
              <h2 className="text-xl font-bold text-gray-800">Ajouter un Locataire {currentBoxDetails && `au Box #${currentBoxDetails.id}`}</h2>
              {currentBoxDetails && <p className="text-sm text-gray-500">{currentBoxDetails.size} - {currentBoxDetails.price}€/mois - {currentBoxDetails.side} / {currentBoxDetails.level}</p>}
           </div>
           {currentBoxDetails && (
                <button
                    type="button"
                    onClick={() => onShowHistory(currentBoxDetails)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                    Voir l'historique du box
                </button>
            )}
        </div>
        <form id="add-tenant-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6">
          
          {!box && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <label htmlFor="box-select" className="block text-sm font-medium text-gray-700">1. Sélectionner un box disponible *</label>
              <select 
                id="box-select"
                value={selectedBoxId}
                onChange={(e) => setSelectedBoxId(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="" disabled>-- Choisir un box --</option>
                {vacantBoxes.map(b => (
                  <option key={b.id} value={b.id}>
                    Box #{b.id} ({b.size}, {b.price}€, {b.side}, {b.level})
                  </option>
                ))}
              </select>
            </div>
           )}

          { (box || selectedBoxId) && (
            <>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">{box ? 'Informations du locataire' : '2. Informations du locataire'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Tenant fields... */}
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
                    <FileField label="Justificatif d'identité" name="idFile" onChange={(e) => handleFileChange(e, 'id')} fileName={idImage?.name} />
                 </div>
                 <div className="lg:col-span-2">
                    <InputField label="Assurance (Compagnie & N° Contrat)" name="insuranceInfo" value={formData.insuranceInfo} onChange={handleChange} />
                 </div>
                 <div>
                    <FileField label="Justificatif d'assurance" name="insuranceFile" onChange={(e) => handleFileChange(e, 'insurance')} fileName={insuranceImage?.name}/>
                 </div>
                <InputField label="Date d'entrée" name="startDate" type="date" value={formData.startDate} onChange={handleChange} />
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
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700">Travaux à prévoir sur le box</h3>
                 <div className="mt-2 space-y-3">
                     <div>
                         <label htmlFor="workToDo" className="block text-sm font-medium text-gray-700">Description des travaux</label>
                        <input
                            type="text"
                            id="workToDo"
                            name="workToDo" 
                            value={workData.workToDo} 
                            onChange={handleWorkChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Ex: La porte grince, le volet est bloqué..."
                        />
                     </div>
                     <div className="flex items-center">
                        <input 
                            id="workAlert"
                            name="workAlert"
                            type="checkbox"
                            checked={workData.workAlert}
                            onChange={handleWorkChange}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="workAlert" className="ml-2 block text-sm text-gray-900">Activer une alerte de travaux sur ce box</label>
                     </div>
                 </div>
              </div>
            </>
          )}
        </form>
        <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
          <button type="submit" form="add-tenant-form" disabled={!selectedBoxId} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">Enregistrer</button>
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
                {fileName ? <p className="text-xs text-green-600">{fileName}</p> : <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu'à 10MB</p>}
            </div>
        </div>
    </div>
);


export default AddTenantModal;
