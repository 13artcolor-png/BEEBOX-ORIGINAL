import React, { useState, useMemo } from 'react';
import { useData } from '../contexts';
import { useBoxes } from '../contexts';
import { useTenants } from '../contexts';
import { BoxStatus, GeranceRecord, HonorairesRecord } from '../types';
import { generateBilanExcel } from '../services/excelGenerator';

// Extrait YYYY-MM depuis un nom de fichier type "gerance_2024_01.csv"
const fichierToYM = (fichier: string): string => {
    const m = fichier.match(/(\d{4})[_-](\d{2})/);
    return m ? `${m[1]}-${m[2]}` : '';
};
// Extrait YYYY-MM depuis dateFacture DD/MM/YYYY
const dateFactureToYM = (d: string): string => {
    const parts = d.split('/');
    return parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}` : '';
};
const ymToLabel = (ym: string): string => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

const FinancesPage: React.FC = () => {
    const { geranceRecords, honorairesRecords } = useData();
    const { boxes } = useBoxes();
    const { tenants } = useTenants();

    // --- Périodes disponibles ---
    const gerancePeriods = useMemo(() => {
        const set = new Set(geranceRecords.map(r => fichierToYM(r.fichier)).filter(Boolean));
        return Array.from(set).sort();
    }, [geranceRecords]);

    const honPeriods = useMemo(() => {
        const set = new Set(honorairesRecords.map(r => dateFactureToYM(r.dateFacture)).filter(Boolean));
        return Array.from(set).sort();
    }, [honorairesRecords]);

    const allPeriods = useMemo(() => {
        const set = new Set([...gerancePeriods, ...honPeriods]);
        return Array.from(set).sort();
    }, [gerancePeriods, honPeriods]);

    const [selectedPeriod, setSelectedPeriod] = useState<string>(() =>
        allPeriods.length > 0 ? allPeriods[allPeriods.length - 1] : ''
    );
    const [honFilter, setHonFilter] = useState('');

    // --- Bloc 1 : Vue mensuelle ---
    const gerancePeriod = useMemo(() =>
        geranceRecords.filter(r => fichierToYM(r.fichier) === selectedPeriod),
        [geranceRecords, selectedPeriod]);

    const honPeriod = useMemo(() =>
        honorairesRecords.filter(r => dateFactureToYM(r.dateFacture) === selectedPeriod),
        [honorairesRecords, selectedPeriod]);

    const totalQuittance = gerancePeriod.reduce((s, r) => s + (r.totalQuittance || 0), 0);
    const totalRegle = gerancePeriod.reduce((s, r) => s + (r.totalRegle || 0), 0);
    const totalImpayesMois = gerancePeriod.reduce((s, r) => s + Math.max(0, r.solde || 0), 0);
    const honHT = honPeriod.reduce((s, r) => s + (r.ht || 0), 0);
    const honTVA = honPeriod.reduce((s, r) => s + (r.tva || 0), 0);
    const honTTC = honPeriod.reduce((s, r) => s + (r.ttc || 0), 0);
    const netMois = totalRegle - honTTC;

    // --- Bloc 2 : Vue annuelle ---
    const annualData = useMemo(() => {
        const byYear = new Map<string, { loyers: number; hon: number; impayés: number }>();
        geranceRecords.forEach(r => {
            const ym = fichierToYM(r.fichier);
            const year = ym.slice(0, 4);
            if (!year) return;
            const cur = byYear.get(year) || { loyers: 0, hon: 0, impayés: 0 };
            cur.loyers += r.totalRegle || 0;
            cur.impayés += Math.max(0, r.solde || 0);
            byYear.set(year, cur);
        });
        honorairesRecords.forEach(r => {
            const ym = dateFactureToYM(r.dateFacture);
            const year = ym.slice(0, 4);
            if (!year) return;
            const cur = byYear.get(year) || { loyers: 0, hon: 0, impayés: 0 };
            cur.hon += r.ttc || 0;
            byYear.set(year, cur);
        });
        return Array.from(byYear.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [geranceRecords, honorairesRecords]);

    // --- Bloc 3 : Tableau honoraires filtré ---
    const filteredHon = useMemo(() => {
        const f = honFilter.toLowerCase();
        return honorairesRecords
            .filter(r => !f || r.nomLocataire.toLowerCase().includes(f) || r.prestation.toLowerCase().includes(f) || r.dateFacture.includes(f))
            .sort((a, b) => b.dateFacture.localeCompare(a.dateFacture));
    }, [honorairesRecords, honFilter]);

    // --- Bloc 4 : Impayés ---
    const impayesActifs = useMemo(() => {
        return tenants
            .filter(t => !t.endDate && t.unpaidRent > 0)
            .map(t => {
                const daysLate = t.nextDueDate
                    ? Math.floor((Date.now() - new Date(t.nextDueDate).getTime()) / 86400000)
                    : 0;
                return { ...t, daysLate };
            })
            .sort((a, b) => b.unpaidRent - a.unpaidRent);
    }, [tenants]);

    const totalImpayesGlobal = useMemo(() =>
        geranceRecords.reduce((s, r) => s + Math.max(0, r.solde || 0), 0),
        [geranceRecords]);

    const cardClass = "bg-white p-5 rounded-xl shadow-sm border border-slate-200";
    const labelClass = "text-sm font-medium text-slate-500";
    const valueClass = "text-2xl font-bold text-slate-900 mt-1";

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <h1 className="text-3xl font-bold text-slate-900">Finances</h1>

            {geranceRecords.length === 0 && honorairesRecords.length === 0 && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                    Aucune donnée financière importée. Importez les fichiers de gérance et d'honoraires dans l'onglet "Données & Admin" pour afficher les statistiques.
                </div>
            )}

            {/* BLOC 1 — Vue mensuelle */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Vue mensuelle</h2>
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white"
                    >
                        {allPeriods.map(p => (
                            <option key={p} value={p}>{ymToLabel(p)}</option>
                        ))}
                    </select>
                </div>
                {selectedPeriod ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className={cardClass}>
                            <p className={labelClass}>Loyers quittancés</p>
                            <p className={valueClass}>{totalQuittance.toFixed(2)} €</p>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Loyers encaissés</p>
                            <p className={`${valueClass} text-emerald-700`}>{totalRegle.toFixed(2)} €</p>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Impayés du mois</p>
                            <p className={`${valueClass} ${totalImpayesMois > 0 ? 'text-red-600' : 'text-slate-900'}`}>{totalImpayesMois.toFixed(2)} €</p>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Honoraires HT</p>
                            <p className={valueClass}>{honHT.toFixed(2)} €</p>
                            <p className="text-xs text-slate-400 mt-1">TVA : {honTVA.toFixed(2)} €</p>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Honoraires TTC</p>
                            <p className={`${valueClass} text-orange-600`}>{honTTC.toFixed(2)} €</p>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Net propriétaire</p>
                            <p className={`${valueClass} ${netMois >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{netMois.toFixed(2)} €</p>
                            <p className="text-xs text-slate-400 mt-1">Encaissé − honoraires TTC</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm">Aucune période disponible.</p>
                )}
            </div>

            {/* BLOC 2 — Vue annuelle */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Bilan annuel</h2>
                    <button
                        onClick={() => generateBilanExcel(geranceRecords, honorairesRecords, tenants, boxes)}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Exporter bilan Excel
                    </button>
                </div>
                {annualData.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Année</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Loyers encaissés</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Honoraires agence</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Net propriétaire</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Impayés</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {annualData.map(([year, data]) => {
                                    const net = data.loyers - data.hon;
                                    return (
                                        <tr key={year} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm font-bold text-slate-800">{year}</td>
                                            <td className="px-4 py-3 text-sm text-right text-emerald-700 font-semibold">{data.loyers.toFixed(2)} €</td>
                                            <td className="px-4 py-3 text-sm text-right text-orange-600 font-semibold">{data.hon.toFixed(2)} €</td>
                                            <td className={`px-4 py-3 text-sm text-right font-bold ${net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{net.toFixed(2)} €</td>
                                            <td className={`px-4 py-3 text-sm text-right ${data.impayés > 0 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{data.impayés.toFixed(2)} €</td>
                                        </tr>
                                    );
                                })}
                                {/* Total */}
                                {annualData.length > 1 && (() => {
                                    const totLoyers = annualData.reduce((s, [, d]) => s + d.loyers, 0);
                                    const totHon = annualData.reduce((s, [, d]) => s + d.hon, 0);
                                    const totImp = annualData.reduce((s, [, d]) => s + d.impayés, 0);
                                    return (
                                        <tr className="bg-slate-100 border-t-2 border-slate-300">
                                            <td className="px-4 py-3 text-sm font-bold text-slate-800">TOTAL</td>
                                            <td className="px-4 py-3 text-sm text-right text-emerald-700 font-bold">{totLoyers.toFixed(2)} €</td>
                                            <td className="px-4 py-3 text-sm text-right text-orange-600 font-bold">{totHon.toFixed(2)} €</td>
                                            <td className={`px-4 py-3 text-sm text-right font-bold ${(totLoyers - totHon) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{(totLoyers - totHon).toFixed(2)} €</td>
                                            <td className="px-4 py-3 text-sm text-right text-red-500 font-bold">{totImp.toFixed(2)} €</td>
                                        </tr>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm">Aucune donnée annuelle disponible.</p>
                )}
            </div>

            {/* BLOC 3 — Tableau honoraires */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Factures honoraires ({honorairesRecords.length})</h2>
                    <input
                        type="text"
                        placeholder="Filtrer par locataire, prestation, date..."
                        value={honFilter}
                        onChange={e => setHonFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm w-72"
                    />
                </div>
                {filteredHon.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-96 overflow-y-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">N° Facture</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Locataire</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Prestation</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">HT (€)</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">TVA (€)</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">TTC (€)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredHon.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-xs font-mono text-slate-600">{r.factureNum}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600">{r.dateFacture}</td>
                                        <td className="px-3 py-2 text-xs text-slate-800 font-medium">{r.nomLocataire}</td>
                                        <td className="px-3 py-2 text-xs text-slate-500 italic">{r.prestation}</td>
                                        <td className="px-3 py-2 text-xs text-right text-slate-700">{r.ht.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-xs text-right text-slate-500">{r.tva.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-xs text-right text-orange-600 font-semibold">{r.ttc.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200 sticky bottom-0">
                                <tr>
                                    <td colSpan={4} className="px-3 py-2 text-xs font-bold text-slate-700 uppercase">Total ({filteredHon.length} factures)</td>
                                    <td className="px-3 py-2 text-xs text-right font-bold text-slate-700">{filteredHon.reduce((s, r) => s + r.ht, 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-xs text-right font-bold text-slate-500">{filteredHon.reduce((s, r) => s + r.tva, 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-xs text-right font-bold text-orange-600">{filteredHon.reduce((s, r) => s + r.ttc, 0).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm">Aucune facture correspondante.</p>
                )}
            </div>

            {/* BLOC 4 — Impayés actifs */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Impayés locataires actifs</h2>
                    <div className="flex gap-4 text-sm">
                        <span className="text-red-600 font-bold">{impayesActifs.length} locataire(s) en retard</span>
                        <span className="text-slate-500">Total gérance : <strong className="text-red-600">{totalImpayesGlobal.toFixed(2)} €</strong></span>
                    </div>
                </div>
                {impayesActifs.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Locataire</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Boxes</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Déficit (€)</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Jours de retard</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {impayesActifs.map(t => (
                                    <tr key={t.id} className="hover:bg-red-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{t.lastName} {t.firstName}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{t.rentedBoxes.map(rb => `#${rb.boxId.replace('box-', '')}`).join(', ')}</td>
                                        <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">{t.unpaidRent.toFixed(2)} €</td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            {t.daysLate > 0 ? (
                                                <span className="text-red-500 font-semibold">{t.daysLate} jours</span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">{t.paymentStatus}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-emerald-600 font-medium text-sm">Aucun impayé parmi les locataires actifs.</p>
                )}
            </div>
        </div>
    );
};

export default FinancesPage;
