

import React, { useState, useMemo, useEffect } from 'react';
import { Tenant, Box, Agent, Agency, BoxStatus, AdminUser, ExtractedReportData, AnalysisResult, PaymentStatus, GeranceRecord, HonorairesRecord } from '../types';
import { useData } from '../contexts';
import BoxManagementTable from '../components/BoxManagementTable';
import OccupancyRevenueChart from '../components/OccupancyRevenueChart';
import { analyzeReportImage } from '../services/geminiService';
import { generateBoxesExcel, generateTenantsExcel } from '../services/excelGenerator';
import * as pdfjsLib from 'pdfjs-dist';
import { auth, db } from '../services/firebase';

interface DataPageProps {
  tenants: Tenant[];
  boxes: Box[];
  agents: Agent[];
  agencies: Agency[];
  onUpdateBox: (box: Box) => void;
  adminUser: AdminUser;
  onUpdateAdminProfile: (admin: AdminUser) => void;
  onSeedDatabase: () => void;
  onUpdateBoxCount: (newCount: number) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-medium text-slate-500 truncate">{title}</h3>
        <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
    </div>
);

const AdminProfileEditor: React.FC<{ admin: AdminUser, onSave: (admin: AdminUser) => void }> = ({ admin, onSave }) => {
    const [formData, setFormData] = useState<AdminUser>(admin);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        setFormData(admin);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
    }, [admin]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                setPasswordError("Les mots de passe ne correspondent pas.");
                return;
            }
            if (newPassword.length < 6) {
                setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
                return;
            }
        }
        
        onSave({ ...formData, password: newPassword });
    };


    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Profil Administrateur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                 <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">Nom d'utilisateur</label>
                    <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                 <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Principal</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                 <div>
                    <label htmlFor="secondaryEmail" className="block text-sm font-medium text-gray-700">Email Secondaire (optionnel)</label>
                    <input type="email" name="secondaryEmail" id="secondaryEmail" value={formData.secondaryEmail || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div className="pt-4 border-t mt-4">
                    <h3 className="text-lg font-medium text-gray-800">Changer le mot de passe</h3>
                    <p className="text-xs text-gray-500 mb-2">Laissez vide pour ne pas modifier le mot de passe actuel.</p>
                     <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                        <input type="password" name="newPassword" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                     <div className="mt-2">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
                        <input type="password" name="confirmPassword" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    {passwordError && <p className="text-sm text-red-600 mt-2">{passwordError}</p>}
                </div>

                <div className="pt-4 flex justify-end">
                    <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
                        Mettre à jour le profil
                    </button>
                </div>
            </form>
        </div>
    );
};

const ReportAnalyzer: React.FC<{ boxes: Box[], tenants: Tenant[], agencies: Agency[] }> = ({ boxes, tenants, agencies }) => {
    const [file, setFile] = useState<File | null>(null);
    const [imageBases64, setImageBases64] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');

    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

    const selectedAgency = useMemo(() => agencies.find(a => a.id === selectedAgencyId), [agencies, selectedAgencyId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);
            setImageBases64(null);
            setError(null);
            setAnalysisResult(null);

            if (uploadedFile.type !== 'application/pdf') {
                setError("Veuillez sélectionner un fichier au format PDF.");
                setFile(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    setIsLoading(true);
                    setLoadingMessage('Conversion du PDF en images...');
                    try {
                        const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        const numPages = pdf.numPages;
                        const bases64: string[] = [];

                        for (let i = 1; i <= numPages; i++) {
                            const page = await pdf.getPage(i);
                            const viewport = page.getViewport({ scale: 2.0 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            if (!context) {
                                throw new Error("Impossible de créer le contexte 2D du canvas.");
                            }
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            await page.render({ canvasContext: context, viewport: viewport }).promise;
                            
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                            bases64.push(dataUrl.split(',')[1]);
                        }
                        
                        setImageBases64(bases64);
                        setError(null);
                    } catch (err) {
                        console.error("Erreur de conversion PDF:", err);
                        setError("Le fichier PDF n'a pas pu être traité. Il est peut-être corrompu ou dans un format non supporté.");
                        setImageBases64(null);
                        setFile(null);
                    } finally {
                        setIsLoading(false);
                        setLoadingMessage('');
                    }
                }
            };
            reader.readAsArrayBuffer(uploadedFile);
        }
    };

    const handleAnalyze = async () => {
        if (!imageBases64 || imageBases64.length === 0) return;
        setIsLoading(true);
        setLoadingMessage("Analyse par l'IA en cours...");
        setError(null);
        setAnalysisResult(null);

        try {
            const extractedData: ExtractedReportData[] = await analyzeReportImage(imageBases64);
            
            const results: AnalysisResult = { matches: [], discrepancies: [] };

            for (const reportItem of extractedData) {
                const boxId = reportItem.boxNumber.replace(/\D/g, '');
                const boxInApp = boxes.find(b => b.id === boxId);

                if (!boxInApp) {
                    results.discrepancies.push({ boxId, reportData: reportItem, appData: { box: null, tenant: null }, reason: "Box non trouvé dans l'application." });
                    continue;
                }

                if (boxInApp.status === BoxStatus.Vacant) {
                    results.discrepancies.push({ boxId, reportData: reportItem, appData: { box: boxInApp, tenant: null }, reason: "Le rapport indique une location mais le box est marqué comme libre." });
                    continue;
                }

                const tenantInApp = tenants.find(t => t.id === boxInApp.currentTenantId);

                if (!tenantInApp) {
                     results.discrepancies.push({ boxId, reportData: reportItem, appData: { box: boxInApp, tenant: null }, reason: "Locataire non trouvé pour ce box." });
                     continue;
                }

                const appTenantName = `${tenantInApp.firstName} ${tenantInApp.lastName}`.toLowerCase();
                const reportTenantName = reportItem.tenantName.toLowerCase();
                const priceDifference = Math.abs(boxInApp.price - reportItem.rentAmount);

                let discrepancyFound = false;
                if (!appTenantName.includes(reportTenantName) && !reportTenantName.includes(appTenantName)) {
                     results.discrepancies.push({ boxId, reportData: reportItem, appData: { box: boxInApp, tenant: tenantInApp }, reason: `Le nom du locataire ne correspond pas (${tenantInApp.lastName} vs ${reportItem.tenantName}).` });
                     discrepancyFound = true;
                }
                if (priceDifference > 1) { // Tolerance of 1 euro for rounding
                     results.discrepancies.push({ boxId, reportData: reportItem, appData: { box: boxInApp, tenant: tenantInApp }, reason: `Le montant du loyer ne correspond pas (${boxInApp.price}€ vs ${reportItem.rentAmount}€).` });
                     discrepancyFound = true;
                }
                
                if (!discrepancyFound) {
                    results.matches.push({ boxId, reportData: reportItem, appData: { box: boxInApp, tenant: tenantInApp } });
                }
            }
            setAnalysisResult(results);

        } catch (e: any) {
            setError(e.message || "Une erreur est survenue lors de l'analyse.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyse de Rapport de Gérance</h2>
            <p className="text-sm text-gray-500 mb-6">Téléversez un rapport au format PDF pour le comparer aux données de l'application.</p>

            <div className="space-y-4 max-w-xl">
                 <div>
                    <label htmlFor="agency-select" className="block text-sm font-medium text-gray-700">1. Sélectionnez une agence</label>
                    <select
                        id="agency-select"
                        value={selectedAgencyId}
                        onChange={(e) => setSelectedAgencyId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option value="" disabled>-- Choisir une agence --</option>
                        {agencies.map(agency => (
                            <option key={agency.id} value={agency.id}>{agency.name}</option>
                        ))}
                    </select>
                </div>

                {selectedAgency && (
                     <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">2. Téléversez le rapport</label>
                         {selectedAgency.reportContactEmail && (
                            <p className="text-xs text-gray-500 mt-1">Veuillez utiliser les rapports envoyés par : <span className="font-mono bg-gray-100 p-1 rounded">{selectedAgency.reportContactEmail}</span></p>
                        )}
                        <div className="mt-2 flex items-center space-x-4">
                            <input id="file-upload" type="file" accept="application/pdf" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        </div>
                    </div>
                )}
               

                <button
                    onClick={handleAnalyze}
                    disabled={!file || isLoading || !selectedAgencyId || !imageBases64}
                    className="w-full px-4 py-2.5 bg-slate-800 text-white font-semibold rounded-md hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? loadingMessage : 'Lancer la Comparaison'}
                </button>
            </div>
            
            {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

            {analysisResult && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Résultats de la comparaison</h3>
                    
                    <div className="mb-6">
                        <h4 className="text-lg font-semibold text-green-700 mb-2">Correspondances ({analysisResult.matches.length})</h4>
                        {analysisResult.matches.length > 0 ? (
                           <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                            {analysisResult.matches.map(m => (
                                <li key={m.boxId} className="p-3">
                                    <span className="font-semibold">Box #{m.reportData.boxNumber}:</span> OK ({m.reportData.tenantName} - {m.reportData.rentAmount}€)
                                </li>
                            ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500">Aucune correspondance parfaite trouvée.</p>}
                    </div>
                    
                     <div>
                        <h4 className="text-lg font-semibold text-red-700 mb-2">Anomalies ({analysisResult.discrepancies.length})</h4>
                         {analysisResult.discrepancies.length > 0 ? (
                             <ul className="divide-y divide-red-200 border border-red-200 rounded-md">
                                {analysisResult.discrepancies.map((d, i) => (
                                    <li key={`${d.boxId}-${i}`} className="p-3 bg-red-50">
                                        <p><span className="font-semibold">Box #{d.reportData.boxNumber}:</span> <span className="text-red-800 font-medium">{d.reason}</span></p>
                                        <p className="text-xs text-gray-600 pl-4">Rapport: {d.reportData.tenantName} - {d.reportData.rentAmount}€ | App: {d.appData.tenant?.lastName || 'N/A'} - {d.appData.box?.price || 'N/A'}€</p>
                                    </li>
                                ))}
                            </ul>
                         ) : <p className="text-sm text-gray-500">Aucune anomalie détectée.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

const ReportDownloader: React.FC<{ tenants: Tenant[], boxes: Box[] }> = ({ tenants, boxes }) => {
    const handleDownloadBoxes = () => {
        generateBoxesExcel(boxes, tenants);
    };

    const handleDownloadTenants = () => {
        generateTenantsExcel(tenants);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Téléchargement de Rapports</h2>
            <p className="text-sm text-gray-500 mb-6">Générez des rapports Excel (.xlsx) à partir des données actuelles de l'application.</p>
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={handleDownloadBoxes}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Inventaire des Boxes (.xlsx)
                </button>
                <button
                    onClick={handleDownloadTenants}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Rapport Locataires (.xlsx)
                </button>
            </div>
        </div>
    );
};


const calculateMonthsDifference = (start: Date, end: Date) => {
    if (end < start) return 0;
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += end.getMonth();
    if (end.getDate() >= start.getDate()) {
        months += 1;
    }
    return months <= 0 ? 1 : months;
}

const BoxParkManager: React.FC<{ currentSize: number, onUpdate: (newSize: number) => void }> = ({ currentSize, onUpdate }) => {
    const [targetSize, setTargetSize] = useState(currentSize);

    useEffect(() => {
        setTargetSize(currentSize);
    }, [currentSize]);

    const handleUpdate = () => {
        if (targetSize > 0) {
            onUpdate(targetSize);
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Ajuster la taille du parc</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
                Définissez le nombre total de boxes. L'application ajoutera ou supprimera les boxes nécessaires.
            </p>
            <div className="flex items-center space-x-4">
                <label htmlFor="box-count" className="text-sm font-medium text-gray-700">Nombre total de boxes :</label>
                <input
                    type="number"
                    id="box-count"
                    value={targetSize}
                    onChange={(e) => setTargetSize(parseInt(e.target.value, 10) || 0)}
                    min="1"
                    className="w-24 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                    onClick={handleUpdate}
                    disabled={targetSize === currentSize}
                    className="px-5 py-2 bg-slate-800 text-white font-semibold rounded-md hover:bg-slate-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    Appliquer
                </button>
            </div>
        </div>
    );
};

// ─── Import CSV ──────────────────────────────────────────────────────────────

type CsvType = 'boxes_list' | 'gerance_report' | 'tenants_list' | 'honoraires_report' | 'doorcode_list' | 'corrections_orpi' | 'unknown';
type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

interface BoxPreviewRow {
  immLot: string;
  codeImmeuble: string;
  boxId: string;
  size: string;
  exists: boolean;
}

interface GerancePreviewRow {
  boxId: string;
  immLot: string;
  codeLocataire: string;
  tenantName: string;
  price: number;
  assurance: number;
  tva: number;
  totalQuittance: number;
  totalRegle: number;
  unpaidRent: number;
  periode: string;
  startDate: string;
  boxExists: boolean;
}

interface TenantPreviewRow {
  codeLocataire: string;
  nomLocataire: string;
  firstName: string;
  lastName: string;
  adresse: string;
  cp: string;
  ville: string;
  activeBoxes: string[];
  earliestStart: string;
  latestEnd: string;
  isActive: boolean;
}

interface HonorairesPreviewRow {
  factureNum: string;
  dateFacture: string;
  bailleur: string;
  nomLocataire: string;
  loyer: number;
  ht: number;
  tva: number;
  ttc: number;
  prestation: string;
  dateEffet: string;
  mandatNum: string;
  fichier: string;
}

interface DoorCodePreviewRow {
  doorCode: string;
  boxId: string;
  nameHint: string;
  currentTenantId: string | null;
  currentTenantName: string;
  boxExists: boolean;
  match: 'found' | 'vacant' | 'unknown';
}

interface CorrectionsPreviewRow {
  codeOrpi: string;
  nomComplet: string;
  boxNum: string;
  boxId: string;
  dateEntree: string;
  dateSortie: string;
  adresse: string;
  cp: string;
  ville: string;
  tenantId: string | null;
  tenantName: string;
  matchStatus: 'found' | 'not_found';
  currentEndDate: string | null;
  action: 'activate' | 'close' | 'update';
}

const CsvImporter: React.FC<{ boxes: Box[], tenants: Tenant[], onUpdateBox: (box: Box) => void }> = ({ boxes, tenants, onUpdateBox }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvType, setCsvType] = useState<CsvType | null>(null);
  const [boxPreview, setBoxPreview] = useState<BoxPreviewRow[]>([]);
  const [gerancePreview, setGerancePreview] = useState<GerancePreviewRow[]>([]);
  const [geranceMode, setGeranceMode] = useState<'brut' | 'comparaison' | 'occupancy' | 'historique'>('occupancy');
  const [tenantPreview, setTenantPreview] = useState<TenantPreviewRow[]>([]);
  const [honorairesPreview, setHonorairesPreview] = useState<HonorairesPreviewRow[]>([]);
  const [doorCodePreview, setDoorCodePreview] = useState<DoorCodePreviewRow[]>([]);
  const [correctionsPreview, setCorrectionsPreview] = useState<CorrectionsPreviewRow[]>([]);
  const [step, setStep] = useState<ImportStep>('upload');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);

  const parseCSV = (text: string) => {
    const cleaned = text.replace(/^\uFEFF/, ''); // strip BOM
    const lines = cleaned.split('\n').filter(l => l.trim());
    if (lines.length === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] };
    const headers = lines[0].split(';').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(';');
      return headers.reduce((obj, h, i) => { obj[h] = (values[i] || '').trim(); return obj; }, {} as Record<string, string>);
    });
    return { headers, rows };
  };

  const detectType = (headers: string[]): CsvType => {
    if (headers.includes('Imm-Lot') && headers.includes('Désignation')) return 'boxes_list';
    if (headers.includes('Code Locataire') && headers.includes('Date Entrée') && headers.includes('Box')) return 'tenants_list';
    if (headers.some(h => h.includes('Facture N°')) && headers.some(h => h.includes('TTC (€)'))) return 'honoraires_report';
    if (headers.includes('Code Porte') && headers.includes('Box N°')) return 'doorcode_list';
    if (headers.includes('Code ORPI') && headers.includes('Date Entree')) return 'corrections_orpi';
    if (headers.some(h => h.includes('Box N°')) && headers.some(h => h.includes('Nom Locataire'))) return 'gerance_report';
    return 'unknown';
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) { alert('Veuillez sélectionner un fichier .csv'); return; }
    setFileName(file.name);
    setStep('preview');
    setResults(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      const type = detectType(headers);
      setCsvType(type);

      if (type === 'boxes_list') {
        const data: BoxPreviewRow[] = rows
          .filter(row => row['Imm-Lot'] && row['Imm-Lot'].includes('-'))
          .map(row => {
            const parts = row['Imm-Lot'].split('-');
            const codeImmeuble = parts[0];
            const lot = parts[1] || '';
            const boxId = lot ? String(parseInt(lot, 10)) : '';
            const designation = row['Désignation'] || '';
            const sizeMatch = designation.match(/(\d+(?:\.\d+)?)\s*M[²2]/i);
            const size = sizeMatch ? `${sizeMatch[1]} M²` : '';
            return { immLot: lot, codeImmeuble, boxId, size, exists: boxes.some(b => b.id === boxId) };
          });
        setBoxPreview(data);
      }

      if (type === 'tenants_list') {
        const parseFrDate = (d: string): string => {
          if (!d) return '';
          const parts = d.split('/');
          return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
        };
        const today = new Date();
        const tenantMap = new Map<string, TenantPreviewRow>();
        rows.filter(row => row['Code Locataire'] && row['Nom Locataire']).forEach(row => {
          const code = row['Code Locataire'].trim();
          const nom = row['Nom Locataire'].trim();
          const adresse = row['Adresse'].trim();
          const cp = row['CP'].trim();
          const ville = row['Ville'].trim();
          const boxId = row['Box'].trim();
          const startISO = parseFrDate(row['Date Entrée'].trim());
          const endRaw = (row['Date Sortie'] || '').trim();
          const endISO = parseFrDate(endRaw);
          const endDateObj = endISO ? new Date(endISO) : null;
          const isBoxActive = !endDateObj || endDateObj > today;
          if (!tenantMap.has(code)) {
            let lastName = nom;
            let firstName = '';
            if (!nom.includes(' - ')) {
              const spaceIdx = nom.indexOf(' ');
              if (spaceIdx > 0) { lastName = nom.substring(0, spaceIdx); firstName = nom.substring(spaceIdx + 1); }
            }
            tenantMap.set(code, { codeLocataire: code, nomLocataire: nom, firstName, lastName, adresse, cp, ville, activeBoxes: isBoxActive ? [boxId] : [], earliestStart: startISO, latestEnd: endISO, isActive: isBoxActive });
          } else {
            const ex = tenantMap.get(code)!;
            if (isBoxActive && !ex.activeBoxes.includes(boxId)) ex.activeBoxes.push(boxId);
            if (isBoxActive) ex.isActive = true;
            if (startISO && (!ex.earliestStart || startISO < ex.earliestStart)) ex.earliestStart = startISO;
            if (!isBoxActive && endISO && endISO > ex.latestEnd) ex.latestEnd = endISO;
          }
        });
        setTenantPreview(Array.from(tenantMap.values()));
      }

      if (type === 'honoraires_report') {
        const parseAmt = (v: string) => parseFloat((v || '0').replace(',', '.')) || 0;
        const data: HonorairesPreviewRow[] = rows
          .filter(row => row['Facture N°'])
          .map(row => ({
            factureNum:   row['Facture N°'] || '',
            dateFacture:  row['Date Facture'] || '',
            bailleur:     row['Bailleur'] || '',
            nomLocataire: row['Nom Locataire'] || '',
            loyer:        parseAmt(row['Loyer (€)']),
            ht:           parseAmt(row['HT (€)']),
            tva:          parseAmt(row['TVA (€)']),
            ttc:          parseAmt(row['TTC (€)']),
            prestation:   row['Prestation'] || '',
            dateEffet:    row['Date Effet'] || '',
            mandatNum:    row['Mandat N°'] || '',
            fichier:      row['Fichier'] || '',
          }));
        setHonorairesPreview(data);
      }

      if (type === 'gerance_report') {
        const data: GerancePreviewRow[] = rows
          .filter(row => row['Box N°'])
          .map(row => {
            const boxId = row['Box N°'].replace(/\D/g, '');
            const immLot = row['Code Lot'] || '';
            const codeLocataire = row['Code Locataire'] || '';
            const tenantName = row['Nom Locataire'] || '';
            const priceRaw = (row['Loyer (€)'] || '0').replace(',', '.');
            const price = parseFloat(priceRaw) || 0;
            const assuranceRaw = (row['Assurance (€)'] || '0').replace(',', '.');
            const assurance = parseFloat(assuranceRaw) || 0;
            const tvaRaw = (row['TVA (€)'] || '0').replace(',', '.');
            const tva = parseFloat(tvaRaw) || 0;
            const totalQuittanceRaw = (row['Total Quittancé (€)'] || '0').replace(',', '.');
            const totalQuittance = parseFloat(totalQuittanceRaw) || 0;
            const totalRegleRaw = (row['Total Réglé (€)'] || '0').replace(',', '.');
            const totalRegle = parseFloat(totalRegleRaw) || 0;
            const soldeRaw = (row['Solde (€)'] || '0').replace(',', '.');
            const unpaidRent = parseFloat(soldeRaw) || 0;
            const periodeRaw = row['Période'] || '';
            const dateMatch = periodeRaw.match(/(\d{2}\/\d{2}\/\d{4})/);
            const startDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : '';
            return { boxId, immLot, codeLocataire, tenantName, price, assurance, tva, totalQuittance, totalRegle, unpaidRent, periode: periodeRaw, startDate, boxExists: boxes.some(b => b.id === boxId) };
          });
        setGerancePreview(data);
      }

      if (type === 'doorcode_list') {
        const data: DoorCodePreviewRow[] = rows
          .filter(row => row['Code Porte'] && row['Box N°'])
          .map(row => {
            const doorCode = row['Code Porte'].trim();
            const boxId = row['Box N°'].trim();
            const nameHint = row['Nom Locataire'] || '';
            const box = boxes.find(b => b.id === boxId);
            const currentTenantId = box?.currentTenantId || null;
            const tenant = currentTenantId ? tenants.find(t => t.id === currentTenantId) : null;
            const currentTenantName = tenant ? `${tenant.firstName} ${tenant.lastName}`.trim() : '';
            const match: 'found' | 'vacant' | 'unknown' = !box ? 'unknown' : !currentTenantId ? 'vacant' : 'found';
            return { doorCode, boxId, nameHint, currentTenantId, currentTenantName, boxExists: !!box, match };
          });
        setDoorCodePreview(data);
      }

      if (type === 'corrections_orpi') {
        const data: CorrectionsPreviewRow[] = rows
          .filter(row => row['Code ORPI'] && row['Box'])
          .map(row => {
            const codeOrpi = row['Code ORPI'].trim();
            const boxNum = row['Box'].trim();
            const boxId = `box-${boxNum}`;
            const nomComplet = row['Nom Complet'] || '';
            const dateEntree = row['Date Entree'] || '';
            const dateSortie = row['Date Sortie'] || '';
            const adresse = row['Adresse'] || '';
            const cp = row['CP'] || '';
            const ville = row['Ville'] || '';
            // Correspondance 1: codeLocataire exact
            let tenant = tenants.find(t => t.codeLocataire === codeOrpi);
            // Correspondance 2 (fallback): box actuelle occupée par ce locataire (box = source de vérité)
            if (!tenant) {
              const box = boxes.find(b => b.id === boxId);
              if (box?.currentTenantId) tenant = tenants.find(t => t.id === box.currentTenantId);
            }
            // Correspondance 3 (fallback): nom de famille (premier mot du Nom Complet)
            if (!tenant) {
              const firstWord = nomComplet.split(/[\s-]/)[0].toUpperCase();
              if (firstWord.length > 2) tenant = tenants.find(t => t.lastName.toUpperCase().startsWith(firstWord));
            }
            const tenantId = tenant?.id || null;
            const tenantName = tenant ? `${tenant.lastName} ${tenant.firstName}`.trim() : '';
            const action: 'activate' | 'close' | 'update' = !dateSortie
              ? (tenant?.endDate ? 'activate' : 'update')
              : 'close';
            return { codeOrpi, nomComplet, boxNum, boxId, dateEntree, dateSortie, adresse, cp, ville, tenantId, tenantName, matchStatus: tenantId ? 'found' : 'not_found', currentEndDate: tenant?.endDate || null, action };
          });
        setCorrectionsPreview(data);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImportBoxes = async () => {
    if (boxPreview.length === 0) return;
    setStep('importing');
    let success = 0;
    const errors: string[] = [];
    for (let i = 0; i < boxPreview.length; i++) {
      const item = boxPreview[i];
      setProgress(Math.round(((i + 1) / boxPreview.length) * 100));
      if (!item.exists) { errors.push(`Box #${item.boxId} (${item.immLot}) : introuvable.`); continue; }
      const box = boxes.find(b => b.id === item.boxId);
      if (!box) { errors.push(`Box #${item.boxId} : erreur interne.`); continue; }
      const updates: Partial<Box> = { immLot: item.immLot, codeImmeuble: item.codeImmeuble };
      if (item.size) updates.size = item.size;
      try {
        await onUpdateBox({ ...box, ...updates });
        success++;
      } catch (err: any) {
        errors.push(`Box #${item.boxId} : ${err.message}`);
      }
      await new Promise(res => setTimeout(res, 80));
    }
    setResults({ success, errors });
    setStep('done');
    setProgress(0);
  };

  const handleImportGerance = async () => {
    if (gerancePreview.length === 0) return;
    setStep('importing');
    let success = 0;
    const errors: string[] = [];

    if (geranceMode === 'brut') {
      // Mode brut : sauvegarde les données brutes dans la collection geranceRecords
      const batch = db.batch();
      for (const item of gerancePreview) {
        const docId = `${(fileName || 'import').replace('.csv', '').replace(/[^a-zA-Z0-9_-]/g, '_')}_lot${item.immLot || item.boxId}`;
        const ref = db.collection('geranceRecords').doc(docId);
        batch.set(ref, {
          boxId: item.boxId,
          codeLot: item.immLot,
          codeLocataire: item.codeLocataire,
          nomLocataire: item.tenantName,
          loyer: item.price,
          assurance: item.assurance,
          tva: item.tva,
          totalQuittance: item.totalQuittance,
          totalRegle: item.totalRegle,
          solde: item.unpaidRent,
          periode: item.periode,
          fichier: fileName || '',
          importedAt: new Date().toISOString(),
        });
        success++;
      }
      try {
        await batch.commit();
        setProgress(100);
      } catch (err: any) {
        errors.push(`Erreur batch Firestore : ${err.message}`);
        success = 0;
      }
    } else {
      // Mode comparaison : mise à jour des soldes locataires existants
      for (let i = 0; i < gerancePreview.length; i++) {
        const item = gerancePreview[i];
        setProgress(Math.round(((i + 1) / gerancePreview.length) * 100));
        let tenant = tenants.find(t => t.codeLocataire === item.codeLocataire);
        if (!tenant && item.boxExists) {
          const box = boxes.find(b => b.id === item.boxId);
          if (box?.currentTenantId) tenant = tenants.find(t => t.id === box.currentTenantId);
        }
        if (tenant) {
          try {
            const newStatus = item.unpaidRent > 0 ? PaymentStatus.Overdue : PaymentStatus.Paid;
            await db.collection('tenants').doc(tenant.id).update({ unpaidRent: item.unpaidRent, paymentStatus: newStatus });
            success++;
          } catch (err: any) {
            errors.push(`Box #${item.boxId} (${item.tenantName}) : ${err.message}`);
          }
        } else {
          errors.push(`Box #${item.boxId} (${item.tenantName}) : locataire introuvable dans Beebox`);
        }
        await new Promise(res => setTimeout(res, 50));
      }
    }

    setResults({ success, errors });
    setStep('done');
    setProgress(0);
  };

  const handleImportOccupancy = async () => {
    if (gerancePreview.length === 0) return;
    setStep('importing');
    let success = 0;
    const errors: string[] = [];

    const parseName = (full: string) => {
      const cleaned = full.replace(/^(Madame|Monsieur|M\.|Mme\.?)\s*/i, '').trim();
      const words = cleaned.split(/\s+/);
      const lastNames = words.filter(w => w.length > 1 && w === w.toUpperCase());
      const firstNames = words.filter(w => w.length <= 1 || w !== w.toUpperCase());
      return {
        firstName: firstNames.join(' ').trim(),
        lastName: (lastNames.join(' ').trim()) || cleaned,
      };
    };

    // Traiter par lots de 200 lignes (limite Firestore: 500 ops/batch)
    const BATCH_SIZE = 200;
    for (let chunk = 0; chunk < gerancePreview.length; chunk += BATCH_SIZE) {
      const slice = gerancePreview.slice(chunk, chunk + BATCH_SIZE);
      const batch = db.batch();

      for (const item of slice) {
        const boxRef = db.collection('boxes').doc(item.boxId);

        if (item.tenantName && item.codeLocataire) {
          // Box occupée : créer/mettre à jour locataire et box
          const tenantDocId = `tenant_${item.codeLocataire}`;
          const tenantRef = db.collection('tenants').doc(tenantDocId);
          const { firstName, lastName } = parseName(item.tenantName);

          // Conserver le startDate original si le locataire existe déjà (ne pas l'écraser avec la date de periode du CSV)
          const existingTenant = tenants.find(t => t.codeLocataire === item.codeLocataire);
          const preservedStartDate = existingTenant?.startDate || item.startDate || '';

          batch.set(tenantRef, {
            id: tenantDocId,
            firstName,
            lastName,
            address: '', postalCode: '', city: '', phone: '', email: '',
            idNumber: '', idType: "Carte d'identité", insuranceInfo: '',
            doorCode: '', codeLocataire: item.codeLocataire, agentId: '',
            rentedBoxes: [{ boxId: item.boxId, price: item.price }],
            assuranceMontant: item.assurance,
            startDate: preservedStartDate,
            endDate: null, potentialEndDate: '', info: '',
            unpaidRent: item.unpaidRent,
            paymentStatus: item.unpaidRent > 0 ? PaymentStatus.Overdue : PaymentStatus.Due,
          }, { merge: true });

          batch.update(boxRef, {
            status: BoxStatus.Occupied,
            currentTenantId: tenantDocId,
            price: item.price,
          });
        } else {
          // Box libre
          batch.update(boxRef, {
            status: BoxStatus.Vacant,
            currentTenantId: null,
          });
        }
        success++;
      }

      try {
        await batch.commit();
        setProgress(Math.round(((chunk + slice.length) / gerancePreview.length) * 100));
      } catch (err: any) {
        errors.push(`Erreur batch (lignes ${chunk + 1}-${chunk + slice.length}) : ${err.message}`);
      }
    }

    setResults({ success, errors });
    setStep('done');
    setProgress(0);
  };

  const handleImportHistorique = async () => {
    if (gerancePreview.length === 0) return;
    setStep('importing');
    let success = 0;
    const errors: string[] = [];

    const parseName = (full: string) => {
      const cleaned = full.replace(/^(Madame|Monsieur|M\.|Mme\.?)\s*/i, '').trim();
      const words = cleaned.split(/\s+/);
      const lastNames = words.filter(w => w.length > 1 && w === w.toUpperCase());
      const firstNames = words.filter(w => w.length <= 1 || w !== w.toUpperCase());
      return {
        firstName: firstNames.join(' ').trim(),
        lastName: (lastNames.join(' ').trim()) || cleaned,
      };
    };

    // Determiner la periode la plus recente du fichier importé
    const allPeriods = gerancePreview.map(r => r.startDate).filter(Boolean).sort();
    const latestPeriod = allPeriods[allPeriods.length - 1] || '';

    // Regrouper par codeLocataire pour construire un locataire unique par code
    type TenantHisto = {
      firstName: string; lastName: string;
      startDate: string; lastPeriod: string; lastEndDate: string;
      boxes: string[]; price: number; assurance: number; unpaidRent: number;
    };
    const tenantMap = new Map<string, TenantHisto>();
    const boxHistoryMap = new Map<string, Set<string>>();

    for (const item of gerancePreview) {
      if (!item.codeLocataire || !item.tenantName) continue;
      const tenantDocId = `tenant_${item.codeLocataire}`;
      const { firstName, lastName } = parseName(item.tenantName);

      // Extraire la date de FIN de periode (ex: "01/01/2023 - 31/01/2023" → "2023-01-31")
      const periodeEndMatch = item.periode.match(/(\d{2}\/\d{2}\/\d{4})\s*$/);
      const periodEnd = periodeEndMatch
        ? periodeEndMatch[1].split('/').reverse().join('-')
        : item.startDate;

      if (!tenantMap.has(item.codeLocataire)) {
        tenantMap.set(item.codeLocataire, {
          firstName, lastName,
          startDate: item.startDate,
          lastPeriod: item.startDate,
          lastEndDate: periodEnd,
          boxes: item.boxId ? [item.boxId] : [],
          price: item.price,
          assurance: item.assurance,
          unpaidRent: item.unpaidRent,
        });
      } else {
        const ex = tenantMap.get(item.codeLocataire)!;
        if (item.startDate && item.startDate < ex.startDate) ex.startDate = item.startDate;
        if (item.startDate && item.startDate > ex.lastPeriod) {
          ex.lastPeriod = item.startDate;
          ex.lastEndDate = periodEnd;
          ex.price = item.price;
          ex.assurance = item.assurance;
          ex.unpaidRent = item.unpaidRent;
        }
        if (item.boxId && !ex.boxes.includes(item.boxId)) ex.boxes.push(item.boxId);
      }

      // Construire la map d'historique par box
      if (item.boxId) {
        if (!boxHistoryMap.has(item.boxId)) boxHistoryMap.set(item.boxId, new Set());
        boxHistoryMap.get(item.boxId)!.add(tenantDocId);
      }
    }

    const tenantEntries = Array.from(tenantMap.entries());
    const BATCH_SIZE = 200;
    const totalOps = tenantEntries.length + boxHistoryMap.size;

    // Ecriture des locataires historiques en batches
    for (let i = 0; i < tenantEntries.length; i += BATCH_SIZE) {
      const slice = tenantEntries.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const [code, data] of slice) {
        const tenantDocId = `tenant_${code}`;
        const tenantRef = db.collection('tenants').doc(tenantDocId);
        // Si le locataire apparait dans la periode la plus recente du CSV → encore actif
        const isActive = data.lastPeriod === latestPeriod;

        batch.set(tenantRef, {
          id: tenantDocId,
          firstName: data.firstName,
          lastName: data.lastName,
          address: '', postalCode: '', city: '', phone: '', email: '',
          idNumber: '', idType: "Carte d'identité", insuranceInfo: '',
          doorCode: '', codeLocataire: code, agentId: '',
          rentedBoxes: data.boxes.map(boxId => ({ boxId, price: data.price })),
          assuranceMontant: data.assurance,
          startDate: data.startDate,
          endDate: isActive ? null : data.lastEndDate,
          potentialEndDate: '', info: '',
          unpaidRent: data.unpaidRent,
          paymentStatus: data.unpaidRent > 0 ? PaymentStatus.Overdue : (isActive ? PaymentStatus.Due : PaymentStatus.Paid),
        }, { merge: true });
        success++;
      }

      try {
        await batch.commit();
      } catch (err: any) {
        errors.push(`Erreur batch locataires (${i + 1}-${i + slice.length}) : ${err.message}`);
      }
      setProgress(Math.round(((i + slice.length) / totalOps) * 100));
    }

    // Mise a jour de tenantHistory des boxes (sans écraser l'occupation actuelle)
    const boxEntries = Array.from(boxHistoryMap.entries());
    for (let i = 0; i < boxEntries.length; i += BATCH_SIZE) {
      const slice = boxEntries.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const [boxId, tenantIds] of slice) {
        const boxRef = db.collection('boxes').doc(boxId);
        const currentBox = boxes.find(b => b.id === boxId);
        const currentHistory = currentBox?.tenantHistory || [];
        const newHistory = Array.from(new Set([...currentHistory, ...Array.from(tenantIds)]));
        batch.update(boxRef, { tenantHistory: newHistory });
      }

      try {
        await batch.commit();
      } catch (err: any) {
        errors.push(`Erreur batch historique boxes : ${err.message}`);
      }
      setProgress(Math.round(((tenantEntries.length + i + slice.length) / totalOps) * 100));
    }

    setResults({ success, errors });
    setStep('done');
    setProgress(0);
  };

  const handleImportDoorCodes = async () => {
    const toImport = doorCodePreview.filter(r => r.match === 'found' && r.currentTenantId);
    if (toImport.length === 0) return;
    setStep('importing');
    let success = 0;
    const errors: string[] = [];

    // Dédoublonner : un même locataire peut apparaitre sur plusieurs lignes (multi-boxes)
    const tenantDoorMap = new Map<string, string>();
    for (const item of toImport) {
      tenantDoorMap.set(item.currentTenantId!, item.doorCode);
    }

    const entries = Array.from(tenantDoorMap.entries());
    const batch = db.batch();
    for (const [tenantId, doorCode] of entries) {
      const ref = db.collection('tenants').doc(tenantId);
      batch.update(ref, { doorCode });
      success++;
    }
    try {
      await batch.commit();
      setProgress(100);
    } catch (err: any) {
      errors.push(`Erreur batch : ${err.message}`);
      success = 0;
    }
    setResults({ success, errors });
    setStep('done');
    setProgress(0);
  };

  const handleImportCorrections = async () => {
    const found = correctionsPreview.filter(r => r.matchStatus === 'found' && r.tenantId);
    if (found.length === 0) return;
    setStep('importing');
    let success = 0;
    const errors: string[] = [];

    // Grouper par tenantId pour déterminer startDate / endDate globaux du locataire
    const tenantGroups = new Map<string, { startDate: string; endDate: string | null; adresse: string; cp: string; ville: string }>();
    for (const item of found) {
      const tid = item.tenantId!;
      const existing = tenantGroups.get(tid);
      if (!existing) {
        tenantGroups.set(tid, { startDate: item.dateEntree, endDate: item.dateSortie || null, adresse: item.adresse, cp: item.cp, ville: item.ville });
      } else {
        if (item.dateEntree && (!existing.startDate || item.dateEntree < existing.startDate)) existing.startDate = item.dateEntree;
        if (!item.dateSortie) existing.endDate = null;
        else if (existing.endDate !== null && item.dateSortie > existing.endDate) existing.endDate = item.dateSortie;
      }
    }

    const batch = db.batch();
    // Mise à jour des locataires
    for (const [tenantId, group] of tenantGroups) {
      const ref = db.collection('tenants').doc(tenantId);
      const upd: any = { startDate: group.startDate, endDate: group.endDate };
      if (group.adresse) { upd.address = group.adresse; upd.postalCode = group.cp; upd.city = group.ville; }
      batch.update(ref, upd);
      success++;
    }
    // Mise à jour des boxes
    for (const item of found) {
      const box = boxes.find(b => b.id === item.boxId);
      if (!box) continue;
      const boxRef = db.collection('boxes').doc(item.boxId);
      if (!item.dateSortie) {
        batch.update(boxRef, { status: BoxStatus.Occupied, currentTenantId: item.tenantId });
      } else if (box.currentTenantId === item.tenantId) {
        batch.update(boxRef, { status: BoxStatus.Free, currentTenantId: null });
      }
    }
    try {
      await batch.commit();
      setProgress(100);
    } catch (err: any) {
      errors.push(`Erreur batch : ${err.message}`);
      success = 0;
    }
    setResults({ success, errors });
    setStep('done');
    setProgress(0);
  };

  const handleImportTenants = async () => {
    if (tenantPreview.length === 0) return;
    setStep('importing');
    let success = 0;
    const errors: string[] = [];
    const batch = db.batch();
    for (const item of tenantPreview) {
      const docId = `tenant_${item.codeLocataire}`;
      const ref = db.collection('tenants').doc(docId);
      batch.set(ref, {
        id: docId,
        firstName: item.firstName,
        lastName: item.lastName,
        address: item.adresse,
        postalCode: item.cp,
        city: item.ville,
        phone: '',
        email: '',
        idNumber: '',
        idType: "Carte d'identité",
        insuranceInfo: '',
        doorCode: '',
        codeLocataire: item.codeLocataire,
        agentId: '',
        rentedBoxes: item.activeBoxes.map(boxId => ({ boxId, price: 0 })),
        startDate: item.earliestStart,
        endDate: item.isActive ? null : (item.latestEnd || null),
        potentialEndDate: '',
        info: '',
        unpaidRent: 0,
        paymentStatus: item.isActive ? PaymentStatus.Due : PaymentStatus.Paid,
      });
      success++;
    }
    try {
      await batch.commit();
      setProgress(100);
    } catch (err: any) {
      errors.push(`Erreur batch Firestore : ${err.message}`);
      success = 0;
    }
    setResults({ success, errors });
    setStep('done');
    setProgress(0);
  };

  const handleImportHonoraires = async () => {
    if (honorairesPreview.length === 0) return;
    setStep('importing');
    let success = 0;
    const errors: string[] = [];
    const batch = db.batch();
    for (const item of honorairesPreview) {
      const docId = `hon_${item.factureNum.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const ref = db.collection('honorairesRecords').doc(docId);
      batch.set(ref, {
        factureNum:   item.factureNum,
        dateFacture:  item.dateFacture,
        bailleur:     item.bailleur,
        nomLocataire: item.nomLocataire,
        loyer:        item.loyer,
        ht:           item.ht,
        tva:          item.tva,
        ttc:          item.ttc,
        prestation:   item.prestation,
        dateEffet:    item.dateEffet,
        mandatNum:    item.mandatNum,
        fichier:      item.fichier,
        importedAt:   new Date().toISOString(),
      });
      success++;
    }
    try {
      await batch.commit();
      setProgress(100);
    } catch (err: any) {
      errors.push(`Erreur batch Firestore : ${err.message}`);
      success = 0;
    }
    setResults({ success, errors });
    setStep('done');
    setProgress(0);
  };

  const handleReset = () => {
    setStep('upload');
    setFileName(null);
    setCsvType(null);
    setBoxPreview([]);
    setGerancePreview([]);
    setHonorairesPreview([]);
    setTenantPreview([]);
    setDoorCodePreview([]);
    setResults(null);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Import CSV</h2>
        <p className="text-sm text-gray-500 mb-6">Le type de fichier est détecté automatiquement depuis les en-têtes.</p>

        {step === 'upload' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
          >
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2">Glissez votre fichier CSV ici</p>
            <p className="text-sm text-gray-500 mb-4">ou</p>
            <label className="cursor-pointer px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
              Choisir un fichier
              <input type="file" accept=".csv" onChange={handleFileInput} className="sr-only" />
            </label>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-12">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-gray-700 font-medium">Import en cours... {progress}%</p>
            <p className="text-sm text-gray-500 mt-1">Mise à jour Firestore</p>
          </div>
        )}

        {(step === 'preview' || step === 'done') && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Fichier : </span>
                <span className="text-sm text-gray-500 font-mono">{fileName}</span>
              </div>
              <button onClick={handleReset} className="text-sm text-blue-600 hover:underline">Changer de fichier</button>
            </div>

            {csvType === 'boxes_list' && (
              <>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <span className="text-blue-700 font-semibold text-sm">Liste des boxes détectée</span>
                  <span className="text-blue-500 text-sm">— {boxPreview.length} lignes | {boxPreview.filter(r => r.exists).length} boxes trouvés | {boxPreview.filter(r => !r.exists).length} introuvables</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6 max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Box ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Imm-Lot</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code Imm.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Taille</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {boxPreview.map((item, i) => (
                        <tr key={i} className={item.exists ? 'bg-white' : 'bg-red-50'}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-800">#{item.boxId}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.immLot}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.codeImmeuble}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.size || '—'}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.exists ? <span className="text-green-600 font-medium">Trouvé</span> : <span className="text-red-600 font-medium">Introuvable</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {step === 'preview' && (
                  <button onClick={handleImportBoxes} className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors">
                    Importer {boxPreview.filter(r => r.exists).length} boxes
                  </button>
                )}
              </>
            )}

            {csvType === 'tenants_list' && (
              <>
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <span className="text-green-700 font-semibold text-sm">Liste de locataires détectée</span>
                  <span className="text-green-600 text-sm">— {tenantPreview.length} locataire(s) uniques | {tenantPreview.filter(r => r.isActive).length} actifs | {tenantPreview.filter(r => !r.isActive).length} clôturés</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6 max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nom</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ville</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Box actif(s)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entrée</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tenantPreview.map((item, i) => (
                        <tr key={i} className={item.isActive ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 text-sm font-mono text-gray-500">{item.codeLocataire}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-800">{item.nomLocataire}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.cp} {item.ville}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.activeBoxes.length > 0 ? item.activeBoxes.map(b => `#${b}`).join(', ') : '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.earliestStart}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.isActive ? <span className="text-green-600 font-medium">Actif</span> : <span className="text-gray-400 font-medium">Clôturé</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {step === 'preview' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-green-800 font-medium">{tenantPreview.length} locataire(s) à créer dans Firestore.</p>
                      <p className="text-sm text-green-700 mt-1">Chaque locataire sera identifié par son <span className="font-mono font-semibold">codeLocataire</span>. Les doublons seront écrasés.</p>
                    </div>
                    <button onClick={handleImportTenants} className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors whitespace-nowrap">
                      Importer {tenantPreview.length} locataires
                    </button>
                  </div>
                )}
              </>
            )}

            {csvType === 'honoraires_report' && (
              <>
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
                  <span className="text-purple-700 font-semibold text-sm">Honoraires ORPI détectés</span>
                  <span className="text-purple-500 text-sm">— {honorairesPreview.length} facture(s) | Total TTC : {honorairesPreview.reduce((s, r) => s + r.ttc, 0).toFixed(2)} €</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6 max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Facture N°</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Locataire</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bailleur</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Loyer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">HT</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {honorairesPreview.map((item, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-4 py-2 text-sm font-mono text-gray-700">{item.factureNum}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.dateFacture}</td>
                          <td className="px-4 py-2 text-sm text-gray-800 font-medium">{item.nomLocataire}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.bailleur}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.loyer.toFixed(2)} €</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.ht.toFixed(2)} €</td>
                          <td className="px-4 py-2 text-sm font-semibold text-purple-700">{item.ttc.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {step === 'preview' && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-purple-800 font-medium">{honorairesPreview.length} facture(s) à enregistrer dans la base.</p>
                      <p className="text-sm text-purple-700 mt-1">Les données seront sauvegardées dans la collection <span className="font-mono font-semibold">honorairesRecords</span>. Les doublons (même N° facture) seront écrasés.</p>
                    </div>
                    <button onClick={handleImportHonoraires} className="px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors whitespace-nowrap">
                      Importer {honorairesPreview.length} factures
                    </button>
                  </div>
                )}
              </>
            )}

            {csvType === 'gerance_report' && (
              <>
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-700 font-semibold text-sm">Compte Rendu de Gérance détecté</span>
                    <span className="text-amber-600 text-sm">— {gerancePreview.length} lignes | mode {geranceMode}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setGeranceMode('occupancy')} className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${geranceMode === 'occupancy' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Sync boxes/locataires</button>
                    <button onClick={() => setGeranceMode('historique')} className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${geranceMode === 'historique' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Historique 2023-2025</button>
                    <button onClick={() => setGeranceMode('comparaison')} className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${geranceMode === 'comparaison' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Soldes</button>
                    <button onClick={() => setGeranceMode('brut')} className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${geranceMode === 'brut' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Import brut</button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6 max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Box</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code Lot</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Locataire</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Loyer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Solde</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Box connu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {gerancePreview.map((item, i) => (
                        <tr key={i} className={item.boxExists ? 'bg-white' : 'bg-yellow-50'}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-800">#{item.boxId}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.immLot}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.tenantName}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.price.toFixed(2)} €</td>
                          <td className={`px-4 py-2 text-sm font-medium ${item.unpaidRent > 0 ? 'text-red-600' : 'text-green-600'}`}>{item.unpaidRent.toFixed(2)} €</td>
                          <td className="px-4 py-2 text-sm">
                            {item.boxExists ? <span className="text-green-600 font-medium">Oui</span> : <span className="text-yellow-600 font-medium">Non</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {geranceMode === 'occupancy' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-emerald-800 font-medium">
                        {gerancePreview.filter(r => r.tenantName).length} boxes occupées, {gerancePreview.filter(r => !r.tenantName).length} boxes libres.
                      </p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Met a jour le statut Occupe/Libre de chaque box et cree les locataires dans Firestore. Utiliser avec le CSV du mois le plus recent.
                      </p>
                    </div>
                    <button onClick={handleImportOccupancy} className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap">
                      Synchroniser les boxes
                    </button>
                  </div>
                )}
                {geranceMode === 'brut' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">{gerancePreview.length} ligne(s) à enregistrer dans la base.</p>
                      <p className="text-sm text-blue-700 mt-1">Les données seront sauvegardées dans la collection <span className="font-mono font-semibold">geranceRecords</span> sans modifier les locataires.</p>
                    </div>
                    <button onClick={handleImportGerance} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap">
                      Enregistrer les données brutes
                    </button>
                  </div>
                )}
                {geranceMode === 'comparaison' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-amber-800 font-medium">{gerancePreview.filter(r => r.unpaidRent > 0).length} locataire(s) avec solde impayé détecté(s).</p>
                      <p className="text-sm text-amber-700 mt-1">Met à jour les soldes et statuts de paiement des locataires existants dans Beebox.</p>
                    </div>
                    <button onClick={handleImportGerance} className="px-6 py-2.5 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-700 transition-colors whitespace-nowrap">
                      Mettre à jour les soldes
                    </button>
                  </div>
                )}
                {geranceMode === 'historique' && step === 'preview' && (
                  <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-violet-800 font-medium">
                        Import historique — {new Set(gerancePreview.filter(r => r.codeLocataire).map(r => r.codeLocataire)).size} locataires uniques sur {gerancePreview.length} lignes.
                      </p>
                      <p className="text-sm text-violet-700 mt-1">
                        Cree les locataires passes avec date de sortie et enrichit l'historique des boxes. N'ecrase pas l'occupation actuelle. Utiliser avec full_gerance.csv ou les CSV 2023-2025.
                      </p>
                    </div>
                    <button onClick={handleImportHistorique} className="px-6 py-2.5 bg-violet-600 text-white font-semibold rounded-md hover:bg-violet-700 transition-colors whitespace-nowrap">
                      Importer l'historique
                    </button>
                  </div>
                )}
              </>
            )}

            {csvType === 'doorcode_list' && (
              <>
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                  <span className="text-slate-700 font-semibold text-sm">Codes de porte détectés</span>
                  <span className="text-slate-500 text-sm">
                    — {doorCodePreview.filter(r => r.match === 'found').length} locataires trouvés
                    | {doorCodePreview.filter(r => r.match === 'vacant').length} boxes libres
                    | {doorCodePreview.filter(r => r.match === 'unknown').length} boxes inconnus
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6 max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Box</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code Porte (CSV)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Indice (CSV)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Locataire actuel (Beebox)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {doorCodePreview.map((item, i) => (
                        <tr key={i} className={item.match === 'found' ? 'bg-white' : item.match === 'vacant' ? 'bg-yellow-50' : 'bg-red-50'}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-800">#{item.boxId}</td>
                          <td className="px-4 py-2 text-sm font-mono font-semibold text-gray-800">{item.doorCode}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 italic">{item.nameHint}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 font-medium">{item.currentTenantName || '—'}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.match === 'found' && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Locataire trouvé</span>}
                            {item.match === 'vacant' && <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">Box libre</span>}
                            {item.match === 'unknown' && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Box inconnu</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {step === 'preview' && doorCodePreview.filter(r => r.match === 'found').length > 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-800 font-medium">
                        {new Set(doorCodePreview.filter(r => r.match === 'found').map(r => r.currentTenantId)).size} locataire(s) recevront leur code de porte.
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        Seules les lignes avec un locataire trouvé sont importées. Les boxes libres ou inconnus sont ignorés.
                      </p>
                    </div>
                    <button onClick={handleImportDoorCodes} className="px-6 py-2.5 bg-slate-700 text-white font-semibold rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap">
                      Appliquer les codes de porte
                    </button>
                  </div>
                )}
              </>
            )}

            {csvType === 'corrections_orpi' && (
              <>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center gap-3">
                  <span className="text-blue-800 font-semibold text-sm">Corrections Orchestra ORPI</span>
                  <span className="text-blue-600 text-sm">
                    — {correctionsPreview.filter(r => r.matchStatus === 'found' && r.action === 'activate').length} à réactiver
                    | {correctionsPreview.filter(r => r.matchStatus === 'found' && r.action === 'close').length} à clôturer
                    | {correctionsPreview.filter(r => r.matchStatus === 'found' && r.action === 'update').length} à mettre à jour
                    | {correctionsPreview.filter(r => r.matchStatus === 'not_found').length} non trouvés
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6 max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code ORPI</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nom Orchestra</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Box</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entrée</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sortie</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Locataire Beebox</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {correctionsPreview.map((item, i) => (
                        <tr key={i} className={item.matchStatus === 'not_found' ? 'bg-red-50' : item.action === 'activate' ? 'bg-green-50' : item.action === 'close' ? 'bg-orange-50' : 'bg-white'}>
                          <td className="px-3 py-2 text-xs font-mono text-gray-600">{item.codeOrpi}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{item.nomComplet}</td>
                          <td className="px-3 py-2 text-xs font-semibold text-gray-800">#{item.boxNum}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">{item.dateEntree}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">{item.dateSortie || <span className="text-green-600 font-semibold">Actif</span>}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{item.tenantName || <span className="text-red-500 italic">Non trouvé</span>}</td>
                          <td className="px-3 py-2 text-xs">
                            {item.action === 'activate' && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Réactiver</span>}
                            {item.action === 'close' && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">Clôturer</span>}
                            {item.action === 'update' && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Mettre à jour</span>}
                            {item.matchStatus === 'not_found' && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Ignoré</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {step === 'preview' && correctionsPreview.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        {correctionsPreview.filter(r => r.matchStatus === 'found').length} enregistrement(s) trouvés et seront corrigés.
                        {correctionsPreview.filter(r => r.matchStatus === 'not_found').length > 0 && (
                          <span className="text-orange-600 ml-2">({correctionsPreview.filter(r => r.matchStatus === 'not_found').length} non trouvés, ignorés)</span>
                        )}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Les lignes "Non trouvé" (code ORPI absent de Beebox) sont ignorées.
                      </p>
                    </div>
                    <button
                      onClick={handleImportCorrections}
                      disabled={correctionsPreview.filter(r => r.matchStatus === 'found').length === 0}
                      className="px-6 py-2.5 bg-blue-700 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Appliquer les corrections
                    </button>
                  </div>
                )}
              </>
            )}

            {csvType === 'unknown' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-800">Format non reconnu</p>
                <p className="text-sm text-red-700 mt-1">Les en-têtes ne correspondent à aucun format connu. Vérifiez que le séparateur est un point-virgule (;).</p>
              </div>
            )}

            {step === 'done' && results && (
              <div className="mt-4 space-y-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-800">
                    {csvType === 'tenants_list'
                      ? `Import terminé — ${results.success} locataire(s) créés dans Firestore.`
                      : csvType === 'gerance_report' && geranceMode === 'brut'
                      ? `Import brut terminé — ${results.success} enregistrement(s) sauvegardés dans geranceRecords.`
                      : csvType === 'gerance_report' && geranceMode === 'occupancy'
                      ? `Synchronisation terminée — ${results.success} box(es) et locataires mis à jour.`
                      : csvType === 'gerance_report' && geranceMode === 'historique'
                      ? `Historique importé — ${results.success} locataire(s) créés/mis à jour, historique des boxes enrichi.`
                      : csvType === 'honoraires_report'
                      ? `Import terminé — ${results.success} facture(s) sauvegardée(s) dans honorairesRecords.`
                      : csvType === 'doorcode_list'
                      ? `Codes de porte appliqués — ${results.success} locataire(s) mis à jour.`
                      : csvType === 'corrections_orpi'
                      ? `Corrections appliquées — ${results.success} locataire(s) corrigés.`
                      : `Import terminé — ${results.success} box(es) mis à jour.`}
                  </p>
                </div>
                {results.errors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-semibold text-red-800">Erreurs ({results.errors.length})</p>
                    <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                      {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
                <button onClick={handleReset} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Importer un autre fichier</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-700 mb-3">Formats reconnus</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <p className="font-medium text-gray-800 text-sm mb-1">Liste des boxes</p>
            <p className="text-xs text-gray-500">En-têtes : <span className="font-mono">Imm-Lot ; Désignation ; Entrée le ; ...</span></p>
            <p className="text-xs text-blue-700 mt-2 font-medium">Mise à jour : Imm-Lot, Code Immeuble, Taille</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
            <p className="font-medium text-gray-800 text-sm mb-1">Compte Rendu de Gérance</p>
            <p className="text-xs text-gray-500">En-têtes : <span className="font-mono">Immeuble ; Box N° ; Nom Locataire ; Loyer (€) ; ...</span></p>
            <p className="text-xs text-amber-700 mt-2 font-medium">Mode brut (geranceRecords) ou comparaison (soldes locataires)</p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <p className="font-medium text-gray-800 text-sm mb-1">Liste de Locataires</p>
            <p className="text-xs text-gray-500">En-têtes : <span className="font-mono">Code Locataire ; Nom Locataire ; Adresse ; CP ; Ville ; Box ; Date Entrée ; Date Sortie</span></p>
            <p className="text-xs text-green-700 mt-2 font-medium">Création des locataires dans Firestore (groupés par Code Locataire)</p>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
            <p className="font-medium text-gray-800 text-sm mb-1">Honoraires ORPI</p>
            <p className="text-xs text-gray-500">En-têtes : <span className="font-mono">Facture N° ; Date Facture ; Bailleur ; Nom Locataire ; Loyer (€) ; HT (€) ; TVA (€) ; TTC (€) ; ...</span></p>
            <p className="text-xs text-purple-700 mt-2 font-medium">Sauvegarde dans la collection honorairesRecords (dédoublonnage par N° facture)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

type Tab = 'stats' | 'gestion' | 'analyse' | 'admin' | 'import';

// Extrait YYYY-MM depuis un nom de fichier type "gerance_2024_01.csv" ou depuis dateFacture "DD/MM/YYYY"
const extractYearMonth = (fichier: string): string => {
    const m = fichier.match(/(\d{4})[_-](\d{2})/);
    return m ? `${m[1]}-${m[2]}` : '';
};
const parseDateFacture = (d: string): string => {
    const parts = d.split('/');
    return parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}` : '';
};

const DataPage: React.FC<DataPageProps> = ({ tenants, boxes, agents, agencies, onUpdateBox, onUpdateBoxCount, adminUser, onUpdateAdminProfile, onSeedDatabase }) => {
    const [activeTab, setActiveTab] = useState<Tab>('stats');
    const { geranceRecords, honorairesRecords } = useData();

    const occupiedBoxes = boxes.filter(b => b.status === BoxStatus.Occupied).length;
    const totalBoxes = boxes.length;
    const occupancyRate = totalBoxes > 0 ? ((occupiedBoxes / totalBoxes) * 100).toFixed(1) + '%' : 'N/A';

    // Locataires actifs = locataires distincts dans des boxes actuellement occupées (source de vérité = boxes)
    const activeTenantIds = new Set(
        boxes.filter(b => b.status === BoxStatus.Occupied && b.currentTenantId).map(b => b.currentTenantId!)
    );
    const currentTenants = tenants.filter(t => activeTenantIds.has(t.id));
    const activeTenantsCount = activeTenantIds.size; // inclut ceux pas encore dans tenants[]
    const pastTenants = tenants.filter(t => !!t.endDate);

    const estimatedMonthlyRevenue = boxes
        .filter(b => b.status === BoxStatus.Occupied)
        .reduce((sum, box) => sum + box.price, 0);

    const tenantsThisMonth = tenants.filter(t => {
        const startDate = new Date(t.startDate);
        const now = new Date();
        return startDate.getFullYear() === now.getFullYear() && startDate.getMonth() === now.getMonth();
    }).length;

    // Stats financières depuis geranceRecords et honorairesRecords
    const lastGerancePeriod = useMemo(() => {
        const periods = geranceRecords.map(r => extractYearMonth(r.fichier)).filter(Boolean).sort();
        return periods.length > 0 ? periods[periods.length - 1] : null;
    }, [geranceRecords]);

    const geranceLastPeriod = useMemo(() =>
        geranceRecords.filter(r => extractYearMonth(r.fichier) === lastGerancePeriod),
        [geranceRecords, lastGerancePeriod]);

    const totalLoyersEncaisses = geranceLastPeriod.reduce((s, r) => s + (r.totalRegle || 0), 0);
    const totalImpayesGlobal = geranceRecords.reduce((s, r) => s + Math.max(0, r.solde || 0), 0);

    const lastHonPeriod = useMemo(() => {
        const periods = honorairesRecords.map(r => parseDateFacture(r.dateFacture)).filter(Boolean).sort();
        return periods.length > 0 ? periods[periods.length - 1] : null;
    }, [honorairesRecords]);

    const honLastPeriod = useMemo(() =>
        honorairesRecords.filter(r => parseDateFacture(r.dateFacture) === lastHonPeriod),
        [honorairesRecords, lastHonPeriod]);

    const totalHonorairesHTT = honLastPeriod.reduce((s, r) => s + (r.ttc || 0), 0);
    const netProprietaire = totalLoyersEncaisses - totalHonorairesHTT;

    const vacanceBoxes = boxes.filter(b => b.status !== BoxStatus.Occupied).length;
    const avgBoxPrice = boxes.length > 0
        ? boxes.filter(b => b.price > 0).reduce((s, b) => s + b.price, 0) / Math.max(1, boxes.filter(b => b.price > 0).length)
        : 0;
    const vacanceValeur = vacanceBoxes * avgBoxPrice;

    const agentPerformance = agents.map(agent => {
        const agentTenants = tenants.filter(t => t.agentId === agent.id);
        
        let totalGrossRent = 0;
        let totalFees = 0;

        const agency = agencies.find(ag => ag.id === agent.agencyId);
        
        agentTenants.forEach(tenant => {
            const start = new Date(tenant.startDate);
            const end = tenant.endDate ? new Date(tenant.endDate) : new Date();
            const monthsRented = calculateMonthsDifference(start, end);

            const totalMonthlyPrice = tenant.rentedBoxes.reduce((acc, rentedBox) => {
                return acc + rentedBox.price;
            }, 0);

            const tenantGrossRent = monthsRented * totalMonthlyPrice;
            totalGrossRent += tenantGrossRent;

            if(agency){
                const managementFee = tenantGrossRent * (agency.managementFee / 100);
                totalFees += agency.entryFee + managementFee;
            }
        });

        const totalNetRent = totalGrossRent - totalFees;

        return { 
            name: agent.name, 
            tenantCount: agentTenants.length,
            totalGrossRent,
            totalFees,
            totalNetRent,
        };
    }).sort((a,b) => b.totalGrossRent - a.totalGrossRent);

    const popularBoxes = boxes
        .map(box => ({ id: box.id, historyCount: box.tenantHistory.length }))
        .sort((a,b) => b.historyCount - a.historyCount)
        .slice(0, 5);
        
    const boxProfitability = useMemo(() => {
        const profitabilityMap = new Map<string, number>();
        boxes.forEach(box => {
            let totalRevenue = 0;
            box.tenantHistory.forEach(tenantId => {
                const tenant = tenants.find(t => t.id === tenantId);
                if (tenant) {
                    const rentedBoxInfo = tenant.rentedBoxes.find(rb => rb.boxId === box.id);
                    if (rentedBoxInfo) {
                        const price = rentedBoxInfo.price;
                        const start = new Date(tenant.startDate);
                        const end = tenant.endDate ? new Date(tenant.endDate) : new Date();
                        const monthsRented = calculateMonthsDifference(start, end);
                        totalRevenue += monthsRented * price;
                    }
                }
            });
            profitabilityMap.set(box.id, totalRevenue);
        });
        return profitabilityMap;
    }, [boxes, tenants]);

     const chartData = useMemo(() => {
        // Index honoraires par YYYY-MM (depuis dateFacture DD/MM/YYYY)
        const honByMonth = new Map<string, number>();
        honorairesRecords.forEach(r => {
            const ym = parseDateFacture(r.dateFacture);
            if (ym) honByMonth.set(ym, (honByMonth.get(ym) ?? 0) + (r.ttc || 0));
        });

        const data: { month: string; occupancy: number; revenue: number; honoraires: number }[] = [];
        const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' });

        const cursor = new Date(2023, 0, 1);
        const now = new Date();
        const endLimit = new Date(now.getFullYear(), now.getMonth(), 1);

        while (cursor <= endLimit) {
            const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
            const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
            const isCurrentMonth = cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth();

            let occupiedCount = 0;
            let monthlyRevenue = 0;

            if (isCurrentMonth) {
                // Mois courant : utiliser l'état réel des boxes (source de vérité, pas les locataires)
                const occupiedBoxes = boxes.filter(b => b.status === BoxStatus.Occupied);
                occupiedCount = occupiedBoxes.length;
                monthlyRevenue = occupiedBoxes.reduce((sum, b) => sum + b.price, 0);
            } else {
                tenants.forEach(tenant => {
                    const tStart = new Date(tenant.startDate);
                    const tEnd = tenant.endDate ? new Date(tenant.endDate) : null;
                    // Présent ce mois si : entré avant la fin du mois ET (pas sorti OU sorti après le début du mois)
                    if (!isNaN(tStart.getTime()) && tStart <= monthEnd && (!tEnd || tEnd >= monthStart)) {
                        occupiedCount += tenant.rentedBoxes.length;
                        monthlyRevenue += tenant.rentedBoxes.reduce((acc, box) => acc + box.price, 0);
                    }
                });
            }

            const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
            data.push({
                month: monthFormatter.format(cursor),
                occupancy: occupiedCount,
                revenue: monthlyRevenue,
                honoraires: honByMonth.get(ym) ?? 0,
            });

            cursor.setMonth(cursor.getMonth() + 1);
        }
        return data;
    }, [tenants, boxes, honorairesRecords]);

    const tabClasses = (tabName: Tab) => `px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-all ${activeTab === tabName ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Données & Administration</h1>
        <div className="flex space-x-2 p-1 bg-slate-100 rounded-lg">
            <button onClick={() => setActiveTab('stats')} className={tabClasses('stats')}>Statistiques</button>
            <button onClick={() => setActiveTab('analyse')} className={tabClasses('analyse')}>Analyse de Rapport</button>
            <button onClick={() => setActiveTab('gestion')} className={tabClasses('gestion')}>Gestion des Boxes</button>
            <button onClick={() => setActiveTab('import')} className={tabClasses('import')}>Import CSV</button>
            <button onClick={() => setActiveTab('admin')} className={tabClasses('admin')}>Administrateur</button>
        </div>
      </div>
      
      {activeTab === 'stats' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Taux d'Occupation" value={occupancyRate} description={`${occupiedBoxes} / ${totalBoxes} boxes`} />
              <StatCard title="Revenu Mensuel Estimé" value={`${estimatedMonthlyRevenue.toFixed(2)} €`} description="Basé sur les locations actuelles" />
              <StatCard title="Locataires Actifs" value={activeTenantsCount} description={`${pastTenants.length} locataires passés`} />
              <StatCard title="Nouveaux Locataires ce Mois-ci" value={tenantsThisMonth} description="Entrées enregistrées" />
          </div>

          {/* Stats financières depuis les données importées */}
          {geranceRecords.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Loyers encaissés (dernier relevé)"
                value={`${totalLoyersEncaisses.toFixed(2)} €`}
                description={lastGerancePeriod ? `Période ${lastGerancePeriod}` : 'Gérance importée'}
              />
              <StatCard
                title="Honoraires agence (dernier mois)"
                value={`${totalHonorairesHTT.toFixed(2)} €`}
                description={lastHonPeriod ? `Mois ${lastHonPeriod}` : honorairesRecords.length === 0 ? 'Aucun honoraire importé' : 'Honoraires importés'}
              />
              <StatCard
                title="Net propriétaire"
                value={`${netProprietaire.toFixed(2)} €`}
                description="Loyers encaissés − honoraires agence"
              />
              <StatCard
                title="Vacance locative"
                value={`${vacanceValeur.toFixed(0)} € / mois`}
                description={`${vacanceBoxes} box${vacanceBoxes > 1 ? 'es' : ''} libre${vacanceBoxes > 1 ? 's' : ''} × loyer moyen ${avgBoxPrice.toFixed(0)} €`}
              />
            </div>
          )}

          <ReportDownloader tenants={tenants} boxes={boxes} />

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Évolution depuis 2023</h2>
            <OccupancyRevenueChart data={chartData} />
          </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">Performance des Agents (Historique Complet)</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agent</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Loyers Bruts Totaux</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Frais Totaux Perçus</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Loyers Nets Totaux</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {agentPerformance.map(agent => (
                                <tr key={agent.name}>
                                    <td className="px-4 py-3 whitespace-nowrap"><div className="font-medium text-slate-900">{agent.name}</div><div className="text-sm text-slate-500">{agent.tenantCount} locataire(s)</div></td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 font-semibold">{agent.totalGrossRent.toFixed(2)} €</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{agent.totalFees.toFixed(2)} €</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-bold">{agent.totalNetRent.toFixed(2)} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">Boxes les Plus Populaires</h2>
                   <p className="text-sm text-slate-500 mb-4">Basé sur l'historique de location.</p>
                  <ul className="divide-y divide-slate-200">
                      {popularBoxes.map(box => (
                          <li key={box.id} className="py-3 flex justify-between items-center">
                               <span className="font-medium text-slate-800">Box #{box.id}</span>
                               <span className="text-slate-600">{box.historyCount} location(s)</span>
                          </li>
                      ))}
                  </ul>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'analyse' && (
          <ReportAnalyzer boxes={boxes} tenants={tenants} agencies={agencies} />
      )}

      {activeTab === 'gestion' && (
        <>
            <BoxParkManager currentSize={boxes.length} onUpdate={onUpdateBoxCount} />
            <BoxManagementTable boxes={boxes} onUpdateBox={onUpdateBox} profitabilityMap={boxProfitability} />
        </>
      )}
      
      {activeTab === 'import' && (
        <CsvImporter boxes={boxes} tenants={tenants} onUpdateBox={onUpdateBox} />
      )}

      {activeTab === 'admin' && (
        <div className="space-y-8">
            <AdminProfileEditor admin={adminUser} onSave={onUpdateAdminProfile} />
            <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-red-800 mb-4">Zone de Danger</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Cette action est irréversible. Elle supprimera toutes les données existantes (boxes, locataires, agences, agents) et les remplacera par les données de démonstration initiales.
                </p>
                <button 
                    onClick={onSeedDatabase} 
                    className="w-full px-4 py-2.5 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                >
                    Réinitialiser la Base de Données
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default DataPage;