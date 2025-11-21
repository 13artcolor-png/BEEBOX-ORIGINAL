

import React, { useState, useMemo, useEffect } from 'react';
import { Tenant, Box, Agent, Agency, BoxStatus, AdminUser, ExtractedReportData, AnalysisResult } from '../types';
import BoxManagementTable from '../components/BoxManagementTable';
import OccupancyRevenueChart from '../components/OccupancyRevenueChart';
import { analyzeReportImage } from '../services/geminiService';
import { generateBoxesReport, generateTenantsReport } from '../services/pdfGenerator';
import * as pdfjsLib from 'pdfjs-dist';
import { auth } from '../services/firebase';

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
        generateBoxesReport(boxes, tenants);
    };

    const handleDownloadTenants = () => {
        generateTenantsReport(tenants);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Téléchargement de Rapports</h2>
            <p className="text-sm text-gray-500 mb-6">Générez des rapports PDF à partir des données actuelles de l'application.</p>
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={handleDownloadBoxes}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Rapport d'Inventaire des Boxes
                </button>
                <button
                    onClick={handleDownloadTenants}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Rapport des Locataires Actifs
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

type Tab = 'stats' | 'gestion' | 'analyse' | 'admin';

const DataPage: React.FC<DataPageProps> = ({ tenants, boxes, agents, agencies, onUpdateBox, onUpdateBoxCount, adminUser, onUpdateAdminProfile, onSeedDatabase }) => {
    const [activeTab, setActiveTab] = useState<Tab>('stats');

    const occupiedBoxes = boxes.filter(b => b.status === BoxStatus.Occupied).length;
    const totalBoxes = boxes.length;
    const occupancyRate = totalBoxes > 0 ? ((occupiedBoxes / totalBoxes) * 100).toFixed(1) + '%' : 'N/A';

    const currentTenants = tenants.filter(t => !t.endDate);
    const pastTenants = tenants.filter(t => !!t.endDate);

    const estimatedMonthlyRevenue = boxes
        .filter(b => b.status === BoxStatus.Occupied)
        .reduce((sum, box) => sum + box.price, 0);

    const tenantsThisMonth = tenants.filter(t => {
        const startDate = new Date(t.startDate);
        const now = new Date();
        return startDate.getFullYear() === now.getFullYear() && startDate.getMonth() === now.getMonth();
    }).length;

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
        const data: { month: string; occupancy: number; revenue: number }[] = [];
        const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' });
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setDate(1); 
            date.setMonth(date.getMonth() - i);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            let occupiedCount = 0;
            let monthlyRevenue = 0;

            tenants.forEach(tenant => {
                const startDate = new Date(tenant.startDate);
                const endDate = tenant.endDate ? new Date(tenant.endDate) : null;

                if (startDate <= monthEnd && (!endDate || endDate >= monthEnd)) {
                    occupiedCount += tenant.rentedBoxes.length;
                    monthlyRevenue += tenant.rentedBoxes.reduce((acc, box) => acc + box.price, 0);
                }
            });

            data.push({
                month: monthFormatter.format(date),
                occupancy: occupiedCount,
                revenue: monthlyRevenue,
            });
        }
        return data;
    }, [tenants]);

    const tabClasses = (tabName: Tab) => `px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-all ${activeTab === tabName ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Données & Administration</h1>
        <div className="flex space-x-2 p-1 bg-slate-100 rounded-lg">
            <button onClick={() => setActiveTab('stats')} className={tabClasses('stats')}>Statistiques</button>
            <button onClick={() => setActiveTab('analyse')} className={tabClasses('analyse')}>Analyse de Rapport</button>
            <button onClick={() => setActiveTab('gestion')} className={tabClasses('gestion')}>Gestion des Boxes</button>
            <button onClick={() => setActiveTab('admin')} className={tabClasses('admin')}>Administrateur</button>
        </div>
      </div>
      
      {activeTab === 'stats' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Taux d'Occupation" value={occupancyRate} description={`${occupiedBoxes} / ${totalBoxes} boxes`} />
              <StatCard title="Revenu Mensuel Estimé" value={`${estimatedMonthlyRevenue.toFixed(2)} €`} description="Basé sur les locations actuelles" />
              <StatCard title="Locataires Actifs" value={currentTenants.length} description={`${pastTenants.length} locataires passés`} />
              <StatCard title="Nouveaux Locataires ce Mois-ci" value={tenantsThisMonth} description="Entrées enregistrées" />
          </div>

          <ReportDownloader tenants={tenants} boxes={boxes} />

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Évolution sur 12 Mois</h2>
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