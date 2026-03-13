import React, { useState, useMemo } from 'react';
import { useData } from '../contexts';
import { useBoxes } from '../contexts';
import { useTenants } from '../contexts';
import { BoxStatus, GeranceRecord, HonorairesRecord, ErreurAgence, RdgRecord } from '../types';
import { generateBilanExcel } from '../services/excelGenerator';

// Extrait YYYY-MM depuis un nom de fichier type "gerance_2024_01.csv"
const fichierToYM = (fichier: string): string => {
    const m = fichier.match(/(\d{4})[_-](\d{2})/);
    return m ? `${m[1]}-${m[2]}` : '';
};
// Extrait YYYY-MM depuis une période DD/MM/YYYY (ex: "01/09/2023")
const periodeToYM = (periode: string): string => {
    if (!periode) return '';
    const parts = periode.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}`;
    return '';
};
// Retourne YYYY-MM depuis un GeranceRecord (fichier en priorité, sinon periode)
const geranceRecordYM = (r: { fichier: string; periode: string }): string =>
    fichierToYM(r.fichier) || periodeToYM(r.periode);
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

// Analyse croisée RDG (Gerance total.xlsx) vs honoraires Excel — source : analyse 2026-03-12
// CATÉGORIE 1 — Dans le RDG (ORPI a prélevé les 50€) mais sans facture formelle → défaveur
const HONORAIRES_PRELEVES_SANS_FACTURE = [
    { box: '6',  code: '50344', nom: 'LATHURAZ OLIVIER',    entree: '22/10/2023', sortie: '09/03/2024', rdg: 'HONO LOC BOX 5 LATHURAZ (nov 2023)'  },
    { box: '7',  code: '50553', nom: 'GERARD ZIADATH',      entree: '16/11/2023', sortie: '28/03/2024', rdg: 'HONO LOC BOX 7 - GERARD (jan 2024)'  },
    { box: '16', code: '50350', nom: 'BARREYRE CHARLOTTE',  entree: '08/11/2023', sortie: 'en cours',   rdg: 'HONO LOC BOX 16 - BARREYRE (jan 2024)' },
    { box: '17', code: '50342', nom: 'RIGOBERT THOMAS',     entree: '12/10/2023', sortie: '29/09/2024', rdg: 'HONO LOC BOX 17 RIGOBERT (nov 2023)'  },
    { box: '24', code: '50607', nom: 'DELANCHY STEPHANIE',  entree: '18/12/2023', sortie: '20/05/2024', rdg: 'HONO LOC BOX 24 - DELANCHY (jan 2024)' },
    { box: '33', code: '50554', nom: 'MOREAU MARC',         entree: '22/11/2023', sortie: '29/11/2025', rdg: 'HONO LOC BOX 33 - MOREAU (jan 2024)'  },
    { box: '39', code: '50603', nom: 'IDELOT DOMINIQUE',    entree: '21/12/2023', sortie: 'en cours',   rdg: 'HONO LOC BOX 39 - IDELOT (jan 2024)'  },
    { box: '40', code: '50603', nom: 'IDELOT DOMINIQUE',    entree: '21/12/2023', sortie: '30/07/2025', rdg: 'HONO LOC BOX 40 - IDELOT (jan 2024)'  },
];

// CATÉGORIE 2 — Ni dans le RDG, ni facture → faveur (ORPI n'a jamais facturé ni prélevé)
const HONORAIRES_JAMAIS_FACTURES = [
    { box: '8',  code: '50820', nom: 'BAUDOIN CELINE',      entree: '29/12/2024', sortie: 'en cours'   },
    { box: '10', code: '51009', nom: 'VARLET BEZU SYLVIE',  entree: '09/11/2025', sortie: 'en cours'   },
    { box: '15', code: '50713', nom: 'LEFEVRE GERALD',      entree: '30/06/2024', sortie: '30/08/2024' },
    { box: '19', code: '50993', nom: 'PRODHOMME WENDY',     entree: '22/10/2025', sortie: 'en cours'   },
    { box: '27', code: '50712', nom: 'DUFRAINE CLARA',      entree: '26/06/2024', sortie: '30/01/2026' },
    { box: '28', code: '50711', nom: 'SAINSEAUX DIDIER',    entree: '26/06/2024', sortie: '09/12/2025' },
];

const FinancesPage: React.FC = () => {
    const { geranceRecords, honorairesRecords, erreurAgences, rdgRecords } = useData();
    const { boxes } = useBoxes();
    const { tenants } = useTenants();

    // --- Périodes disponibles ---
    const gerancePeriods = useMemo(() => {
        const set = new Set(geranceRecords.map(r => geranceRecordYM(r)).filter(Boolean));
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

    // Sections pliables
    const [open, setOpen] = useState<Record<string, boolean>>({
        kpi: true, bilanAnnuel: true, bilanLocataires: true, impayes: true,
        honoraires: false, retards: true, erreurs: true, assurances: true,
        contrats: true, irl: false, croisement: true,
    });
    const toggle = (k: string) => setOpen(prev => ({ ...prev, [k]: !prev[k] }));
    const chevron = (k: string) => (
        <span className={`ml-auto text-slate-400 transition-transform duration-200 ${open[k] ? 'rotate-180' : ''}`} style={{ display: 'inline-block' }}>▼</span>
    );

    // --- Bloc 1 : Vue mensuelle ---
    const gerancePeriod = useMemo(() =>
        geranceRecords.filter(r => geranceRecordYM(r) === selectedPeriod),
        [geranceRecords, selectedPeriod]);

    const honPeriod = useMemo(() =>
        honorairesRecords.filter(r => dateFactureToYM(r.dateFacture) === selectedPeriod),
        [honorairesRecords, selectedPeriod]);

    // Quittancé réel = loyer + assurance + TVA du mois uniquement (exclut la dette historique cumulée)
    const totalQuittance = gerancePeriod.reduce((s, r) => s + (r.loyer || 0) + (r.assurance || 0) + (r.tva || 0), 0);
    const totalRegle = gerancePeriod.reduce((s, r) => s + (r.totalRegle || 0), 0);
    // Impayé réel du mois = ce qui était dû ce mois - ce qui a été réglé (ignore la dette cumulée ORPI)
    const totalImpayesMois = gerancePeriod.reduce((s, r) => s + Math.max(0, (r.loyer || 0) + (r.assurance || 0) + (r.tva || 0) - (r.totalRegle || 0)), 0);
    const honHT = honPeriod.reduce((s, r) => s + (r.ht || 0), 0);
    const honTVA = honPeriod.reduce((s, r) => s + (r.tva || 0), 0);
    const honTTC = honPeriod.reduce((s, r) => s + (r.ttc || 0), 0);

    // Honoraires gérance mensuel = 7% HT × totalRegle → TTC = × 1.20
    const honGeranceMois = totalRegle * 0.07 * 1.20;
    const netMoisReel = totalRegle - honGeranceMois - honTTC;

    // --- Bloc 2 : Vue annuelle — données source : rdgRecords (Excel ORPI réel) ---
    type MonthRow = { quittances: number; regle: number; honGerance: number; honEntree: number; virement: number; impayés: number };
    type YearRow  = { quittances: number; regle: number; honGerance: number; honEntree: number; virement: number; impayés: number; months: Map<string, MonthRow> };

    const annualData = useMemo(() => {
        const byYear = new Map<string, YearRow>();
        const emptyYear = (): YearRow => ({ quittances: 0, regle: 0, honGerance: 0, honEntree: 0, virement: 0, impayés: 0, months: new Map() });
        const emptyMonth = (): MonthRow => ({ quittances: 0, regle: 0, honGerance: 0, honEntree: 0, virement: 0, impayés: 0 });

        rdgRecords.forEach((r: RdgRecord) => {
            const ym   = r.mois;   // YYYY-MM
            const year = r.annee;  // YYYY
            if (!year || !ym) return;

            const q   = r.quittance_total   || 0;
            const re  = r.regle_total       || 0;
            const hg  = r.honoraires_gerance || 0;
            const he  = r.honoraires_entree  || 0;
            const vir = r.virement          || 0;
            const im  = Math.max(0, q - re);

            const yr = byYear.get(year) || emptyYear();
            yr.quittances += q; yr.regle += re; yr.honGerance += hg; yr.honEntree += he; yr.virement += vir; yr.impayés += im;

            const mo = yr.months.get(ym) || emptyMonth();
            mo.quittances += q; mo.regle += re; mo.honGerance += hg; mo.honEntree += he; mo.virement += vir; mo.impayés += im;
            yr.months.set(ym, mo);
            byYear.set(year, yr);
        });

        return Array.from(byYear.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([year, d]) => ({
                year,
                ...d,
                months: Array.from(d.months.entries()).sort((a, b) => a[0].localeCompare(b[0])),
            }));
    }, [rdgRecords]);

    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
    const toggleYear = (year: string) => setExpandedYears(prev => {
        const next = new Set(prev);
        next.has(year) ? next.delete(year) : next.add(year);
        return next;
    });

    // --- Bloc 3 : Tableau honoraires filtré ---
    const filteredHon = useMemo(() => {
        const f = honFilter.toLowerCase();
        return honorairesRecords
            .filter(r => !f || r.nomLocataire.toLowerCase().includes(f) || r.prestation.toLowerCase().includes(f) || r.dateFacture.includes(f))
            .sort((a, b) => b.dateFacture.localeCompare(a.dateFacture));
    }, [honorairesRecords, honFilter]);

    // --- Bloc 4 : Impayés — triés par numéro de box ---
    const impayesActifs = useMemo(() => {
        return tenants
            .filter(t => !t.endDate && (t.unpaidRent > 0 || t.paymentStatus === 'En retard'))
            .map(t => {
                const daysLate = t.nextDueDate
                    ? Math.floor((Date.now() - new Date(t.nextDueDate).getTime()) / 86400000)
                    : 0;
                // Numéro du premier box pour tri numérique
                const firstBoxNum = parseInt(t.rentedBoxes?.[0]?.boxId?.replace('box-', '') || '0', 10) || 0;
                return { ...t, daysLate, firstBoxNum };
            })
            .sort((a, b) => a.firstBoxNum - b.firstBoxNum);
    }, [tenants]);

    // Impayés réels cumulés = somme des mensualités non réglées (pas les soldes cumulés ORPI)
    const totalImpayesGlobal = useMemo(() =>
        geranceRecords.reduce((s, r) => s + Math.max(0, (r.loyer || 0) + (r.assurance || 0) + (r.tva || 0) - (r.totalRegle || 0)), 0),
        [geranceRecords]);

    // Erreurs ORPI — totaux
    const totalErreursMensuel = erreurAgences.reduce((s, e) => s + (e.ecartMensuel || e.impactMensuel || 0), 0);
    const totalErreursAnnuel  = erreurAgences.reduce((s, e) => s + (e.ecartAnnuel  || e.impactAnnuel  || 0), 0);

    // --- BLOC 5 : Assurances expirant dans 60 jours ---
    const assurancesExpirant = useMemo(() => {
        const now = Date.now();
        return tenants
            .filter(t => !t.endDate && t.insuranceExpiryDate)
            .map(t => {
                const daysLeft = Math.floor((new Date(t.insuranceExpiryDate!).getTime() - now) / 86400000);
                return { ...t, daysLeft };
            })
            .filter(t => t.daysLeft <= 60)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [tenants]);

    // --- BLOC 5 : Contrats expirant dans 60 jours ---
    const contratsExpirant = useMemo(() => {
        const now = Date.now();
        return tenants
            .filter(t => !t.endDate && t.potentialEndDate)
            .map(t => {
                const endMs = new Date(t.potentialEndDate!).getTime();
                const daysLeft = Math.floor((endMs - now) / 86400000);
                return { ...t, daysLeft };
            })
            .filter(t => t.daysLeft <= 60)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [tenants]);

    // --- BLOC 5 : Boxes disponibles (vacantes maintenant ou bientôt) ---
    const boxesDisponibles = useMemo(() => {
        // Boxes actuellement vacantes
        const vacantesNow = boxes.filter(b => b.status === BoxStatus.Vacant);
        // Boxes occupées dont le locataire a un contrat qui expire dans 60 jours
        const bientotLibres = contratsExpirant
            .flatMap(t => t.rentedBoxes.map(rb => {
                const box = boxes.find(b => b.id === rb.boxId);
                return box ? { box, tenant: t, daysLeft: t.daysLeft } : null;
            }))
            .filter(Boolean) as { box: typeof boxes[0]; tenant: typeof contratsExpirant[0]; daysLeft: number }[];
        return { vacantesNow, bientotLibres };
    }, [boxes, contratsExpirant]);

    // --- BLOC 8 : Bilan financier par locataire actif ---
    const bilanLocataires = useMemo(() => {
        return tenants
            .filter(t => !t.endDate)
            .map(t => {
                // Records ORPI pour les boxes de ce locataire :
                // - loyer > 0 (exclut les dettes fantômes DIEUSEUL)
                // - geranceRecordYM >= startDate du locataire (exclut les dettes des anciens locataires)
                const boxIds = t.rentedBoxes.map(rb => rb.boxId.replace('box-', ''));
                const tenantStartYM = t.startDate ? t.startDate.substring(0, 7) : '0000-00';
                const records = geranceRecords.filter(r =>
                    boxIds.includes(r.boxId) &&
                    r.loyer > 0 &&
                    geranceRecordYM(r) >= tenantStartYM
                );
                const totalQuittance = records.reduce((s, r) => s + (r.loyer || 0) + (r.assurance || 0) + (r.tva || 0), 0);
                const totalRegle = records.reduce((s, r) => s + (r.totalRegle || 0), 0);
                const balance = totalRegle - totalQuittance; // négatif = impayé cumulé
                const nbPeriodes = new Set(records.map(r => geranceRecordYM(r))).size;
                const loyerMensuel = t.rentedBoxes.reduce((s, rb) => s + rb.price, 0);
                // Dette déclarée manuellement dans BeeBox (ex: dette historique Box 12 CHALENDAR)
                const detteDeclaree = t.unpaidRent || 0;
                return { tenant: t, totalQuittance, totalRegle, balance, nbPeriodes, loyerMensuel, detteDeclaree };
            })
            .sort((a, b) => (a.balance - a.detteDeclaree) - (b.balance - b.detteDeclaree)); // tri par situation globale
    }, [tenants, geranceRecords]);

    // --- BLOC 9 : Impayés cumulés — tous locataires ORPI (actifs + anciens) ---
    const impayes = useMemo(() => {
        // Groupe tous les geranceRecords par boxId + nomLocataire
        const map = new Map<string, GeranceRecord[]>();
        for (const r of geranceRecords) {
            const nom = r.nomLocataire || r.codeLocataire || '';
            if (!nom) continue;
            const key = `${r.boxId}|||${nom}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(r);
        }
        const result: { nom: string; boxId: string; solde: number; nbPeriodes: number }[] = [];
        for (const [key, records] of map) {
            const sepIdx = key.indexOf('|||');
            const boxId = key.substring(0, sepIdx);
            const nom = key.substring(sepIdx + 3);
            // Prendre le solde du record le plus récent (= dette cumulée à date)
            const sorted = [...records].sort((a, b) => geranceRecordYM(b).localeCompare(geranceRecordYM(a)));
            const latestSolde = sorted[0].solde;
            if (latestSolde > 0.5) {
                result.push({ nom, boxId, solde: latestSolde, nbPeriodes: records.length });
            }
        }
        return result.sort((a, b) => b.solde - a.solde);
    }, [geranceRecords]);

    // --- BLOC 7 : Calculateur IRL ---
    const [irlLoyer, setIrlLoyer] = useState('');
    const [irlAncien, setIrlAncien] = useState('');
    const [irlNouveau, setIrlNouveau] = useState('');
    const irlResult = useMemo(() => {
        const loyer = parseFloat(irlLoyer);
        const ancien = parseFloat(irlAncien);
        const nouveau = parseFloat(irlNouveau);
        if (!loyer || !ancien || !nouveau || ancien === 0) return null;
        const nouveauLoyer = (loyer * nouveau) / ancien;
        return {
            nouveauLoyer,
            variation: nouveauLoyer - loyer,
            variationPct: ((nouveau - ancien) / ancien) * 100,
        };
    }, [irlLoyer, irlAncien, irlNouveau]);

    // --- CROISEMENTS : 5 contrôles de cohérence ---

    // Croisement 1 — Prix box BeeBox vs loyer quittancé ORPI (mois sélectionné)
    const crossCheckPrix = useMemo(() => {
        if (!selectedPeriod) return [];
        const result: { tenantName: string; boxId: string; prixBeebox: number; prixOrpi: number; ecart: number; ok: boolean }[] = [];
        for (const t of tenants.filter(t => !t.endDate)) {
            for (const rb of t.rentedBoxes) {
                const boxNum = rb.boxId.replace('box-', '');
                const orpiRecord = gerancePeriod.find(r => r.boxId === boxNum && r.loyer > 0);
                if (!orpiRecord) continue;
                // Exclure les proratas (locataire entré dans le mois sélectionné — 1ère mensualité partielle)
                const tenantStartYM = t.startDate ? t.startDate.substring(0, 7) : '';
                if (tenantStartYM === selectedPeriod) continue;
                const ecart = orpiRecord.loyer - rb.price;
                result.push({ tenantName: `${t.lastName} ${t.firstName}`.trim(), boxId: boxNum, prixBeebox: rb.price, prixOrpi: orpiRecord.loyer, ecart, ok: Math.abs(ecart) < 1 });
            }
        }
        return result.sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
    }, [tenants, gerancePeriod, selectedPeriod]);

    // Croisement 2 — Honoraires gérance 7% attendu vs prélevé réel (RDG)
    const crossCheckHonoraires = useMemo(() => {
        const rdg = rdgRecords.find(r => r.mois === selectedPeriod);
        if (!rdg) return null;
        // ORPI base les 7% sur les loyers purs uniquement (hors assurances et TVA)
        const loyersPurs = gerancePeriod.reduce((s, r) => s + (r.loyer || 0), 0);
        const assurancesTotal = gerancePeriod.reduce((s, r) => s + (r.assurance || 0), 0);
        const tvaTotal = gerancePeriod.reduce((s, r) => s + (r.tva || 0), 0);
        const attenduHT = loyersPurs * 0.07;
        const reelHT = rdg.honoraires_gerance;
        const ecart = reelHT - attenduHT;
        return { attenduHT, reelHT, loyersPurs, assurancesTotal, tvaTotal, quittanceTotal: rdg.quittance_total, regleTotal: rdg.regle_total, ecart, ok: Math.abs(ecart) < 2 };
    }, [rdgRecords, selectedPeriod, gerancePeriod]);

    // Croisement 3 — Virement réel vs (Réglé − Honoraires gérance − Honoraires entrée)
    const crossCheckVirement = useMemo(() => {
        const rdg = rdgRecords.find(r => r.mois === selectedPeriod);
        if (!rdg) return null;
        const virementCalcule = rdg.regle_total - rdg.honoraires_gerance - rdg.honoraires_entree;
        const ecart = rdg.virement - virementCalcule;
        return { virementReel: rdg.virement, virementCalcule, regleTotal: rdg.regle_total, honGerance: rdg.honoraires_gerance, honEntree: rdg.honoraires_entree, ecart, ok: Math.abs(ecart) < 2 };
    }, [rdgRecords, selectedPeriod]);

    // Croisement 4 — Solde ORPI cumulé vs unpaidRent BeeBox (locataires actifs)
    const crossCheckImpayes = useMemo(() => {
        const result: { tenantName: string; boxId: string; soldOrpi: number; detteBeebox: number; ecart: number }[] = [];
        for (const t of tenants.filter(t => !t.endDate)) {
            for (const rb of t.rentedBoxes) {
                const boxNum = rb.boxId.replace('box-', '');
                const boxRecords = geranceRecords.filter(r => r.boxId === boxNum && r.loyer > 0);
                if (boxRecords.length === 0) continue;
                const sorted = [...boxRecords].sort((a, b) => geranceRecordYM(b).localeCompare(geranceRecordYM(a)));
                const latestSolde = sorted[0].solde || 0;
                const detteBeebox = t.unpaidRent || 0;
                const ecart = latestSolde - detteBeebox;
                if (latestSolde > 0.5 || detteBeebox > 0.5) {
                    result.push({ tenantName: `${t.lastName} ${t.firstName}`.trim(), boxId: boxNum, soldOrpi: latestSolde, detteBeebox, ecart });
                }
            }
        }
        return result.sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
    }, [tenants, geranceRecords]);

    // Croisement 5 — Boxes occupés BeeBox vs présents dans le CRG du mois
    const crossCheckOccupation = useMemo(() => {
        if (!selectedPeriod || gerancePeriod.length === 0) return null;
        const periodStart = new Date(selectedPeriod + '-01');
        const orpiBoxes = new Set(gerancePeriod.filter(r => r.loyer > 0).map(r => r.boxId));
        // Locataire actif pendant la période = pas de endDate, OU endDate après le début du mois sélectionné
        const beeboxBoxes = new Set(tenants.filter(t => !t.endDate || new Date(t.endDate) >= periodStart).flatMap(t => t.rentedBoxes.map(rb => rb.boxId.replace('box-', ''))));
        const inOrpiNotBeebox = ([...orpiBoxes] as string[]).filter(b => !beeboxBoxes.has(b)).sort((a, b) => parseInt(a) - parseInt(b));
        const inBeeboxNotOrpi = ([...beeboxBoxes] as string[]).filter(b => !orpiBoxes.has(b)).sort((a, b) => parseInt(a) - parseInt(b));
        return { orpiCount: orpiBoxes.size, beeboxCount: beeboxBoxes.size, inOrpiNotBeebox, inBeeboxNotOrpi, ok: inOrpiNotBeebox.length === 0 && inBeeboxNotOrpi.length === 0 };
    }, [gerancePeriod, tenants, selectedPeriod]);

    const cardClass = "bg-white p-5 rounded-xl shadow-sm border border-slate-200";
    const labelClass = "text-sm font-medium text-slate-500";
    const valueClass = "text-2xl font-bold text-slate-900 mt-1";

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">

            {/* En-tête + sélecteur période */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-900">Finances</h1>
                <select
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white shadow-sm"
                >
                    {allPeriods.map(p => (
                        <option key={p} value={p}>{ymToLabel(p)}</option>
                    ))}
                </select>
            </div>

            {geranceRecords.length === 0 && honorairesRecords.length === 0 && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                    Aucune donnée financière importée. Importez les fichiers de gérance et d'honoraires dans l'onglet "Données & Admin" pour afficher les statistiques.
                </div>
            )}

            {/* ── LIGNE TOP : Vue mensuelle + Bilan annuel côte à côte ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

            {selectedPeriod && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center cursor-pointer select-none mb-5" onClick={() => toggle('kpi')}>
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex-1">
                            Vue mensuelle — {ymToLabel(selectedPeriod)}
                        </h2>
                        {chevron('kpi')}
                    </div>
                    {open.kpi && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className={cardClass}>
                            <p className={labelClass}>Loyers quittancés</p>
                            <p className={valueClass}>{totalQuittance.toFixed(2)} €</p>
                            <p className="text-xs text-slate-400 mt-1">{gerancePeriod.filter(r => r.loyer > 0).length} boxes</p>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Loyers encaissés</p>
                            <p className={`${valueClass} text-emerald-700`}>{totalRegle.toFixed(2)} €</p>
                            <div className="mt-2 space-y-0.5">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Ont payé</span>
                                    <span className="font-medium text-emerald-600">{gerancePeriod.filter(r => r.loyer > 0 && (r.loyer + (r.assurance||0) + (r.tva||0) - (r.totalRegle||0)) <= 0.5 && r.totalRegle > 0).length} boxes</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>N'ont pas payé</span>
                                    <span className="font-medium text-red-500">{gerancePeriod.filter(r => r.loyer > 0 && (r.loyer + (r.assurance||0) + (r.tva||0) - (r.totalRegle||0)) > 0.5).length} boxes</span>
                                </div>
                            </div>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Impayés du mois</p>
                            <p className={`${valueClass} ${(totalQuittance - totalRegle) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                {(totalQuittance - totalRegle).toFixed(2)} €
                            </p>
                            <div className="mt-2 space-y-0.5">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Impayés bruts</span>
                                    <span className="font-medium text-red-500">{totalImpayesMois.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Trop-perçus</span>
                                    <span className="font-medium text-emerald-600">{Math.max(0, totalRegle - totalQuittance + totalImpayesMois).toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Frais agence</p>
                            <p className={`${valueClass} text-orange-600`}>{(honTTC + honGeranceMois).toFixed(2)} €</p>
                            <div className="mt-2 space-y-0.5">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Frais de visite</span>
                                    <span className="font-medium">{honTTC.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Hon. gérance 7%</span>
                                    <span className="font-medium">{honGeranceMois.toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Net propriétaire</p>
                            <p className={`${valueClass} ${netMoisReel >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{netMoisReel.toFixed(2)} €</p>
                            <p className="text-xs text-slate-400 mt-1">Encaissé − gérance − entrée</p>
                        </div>
                        <div className={cardClass}>
                            <p className={labelClass}>Manque à gagner</p>
                            <p className={`${valueClass} text-slate-400`}>
                                {boxesDisponibles.vacantesNow.reduce((s, b) => s + b.price, 0).toFixed(2)} €
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                {boxesDisponibles.vacantesNow.length} box{boxesDisponibles.vacantesNow.length > 1 ? 'es' : ''} vacant{boxesDisponibles.vacantesNow.length > 1 ? 'es' : 'e'}
                            </p>
                        </div>
                    </div>}
                </div>
            )}

            {/* Bilan annuel — colonne droite du top grid */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 cursor-pointer select-none flex-1" onClick={() => toggle('bilanAnnuel')}>
                                <h2 className="text-xl font-bold text-slate-800">Bilan annuel</h2>
                                {chevron('bilanAnnuel')}
                            </div>
                            <button
                                onClick={() => generateBilanExcel(geranceRecords, honorairesRecords, tenants, boxes)}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                Exporter Excel
                            </button>
                        </div>
                        {open.bilanAnnuel && annualData.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-8"></th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Période</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Quittancés</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-emerald-600 uppercase">Réglé</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-violet-600 uppercase">Entrée</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-amber-600 uppercase">Gérance</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-orange-600 uppercase">Hon. TTC</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Virement</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-red-500 uppercase">Impayés</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {annualData.map(row => {
                                            const hon      = row.honGerance + row.honEntree;
                                            const expanded = expandedYears.has(row.year);
                                            return (
                                                <>
                                                    <tr key={row.year}
                                                        className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer select-none"
                                                        onClick={() => toggleYear(row.year)}>
                                                        <td className="px-3 py-3 text-center text-slate-400 text-sm">{expanded ? '▼' : '▶'}</td>
                                                        <td className="px-3 py-3 text-sm font-bold text-slate-800">{row.year}</td>
                                                        <td className="px-3 py-3 text-sm text-right text-slate-500 font-medium">{row.quittances.toFixed(0)} €</td>
                                                        <td className="px-3 py-3 text-sm text-right text-emerald-700 font-semibold">{row.regle.toFixed(0)} €</td>
                                                        <td className="px-3 py-3 text-sm text-right text-violet-600 font-semibold">{row.honEntree.toFixed(0)} €</td>
                                                        <td className="px-3 py-3 text-sm text-right text-amber-600 font-semibold">{row.honGerance.toFixed(0)} €</td>
                                                        <td className="px-3 py-3 text-sm text-right text-orange-600 font-bold">{hon.toFixed(0)} €</td>
                                                        <td className="px-3 py-3 text-sm text-right font-bold text-emerald-700">{row.virement.toFixed(0)} €</td>
                                                        <td className={`px-3 py-3 text-sm text-right ${row.impayés > 0 ? 'text-red-500 font-semibold' : 'text-slate-300'}`}>{row.impayés.toFixed(0)} €</td>
                                                    </tr>
                                                    {expanded && row.months.map(([ym, mo]) => {
                                                        const mHon = mo.honGerance + mo.honEntree;
                                                        return (
                                                            <tr key={ym} className="border-t border-slate-100 bg-slate-50">
                                                                <td className="px-3 py-2"></td>
                                                                <td className="px-3 py-2 text-xs text-slate-500 pl-8">{ymToLabel(ym)}</td>
                                                                <td className="px-3 py-2 text-xs text-right text-slate-400">{mo.quittances.toFixed(0)} €</td>
                                                                <td className="px-3 py-2 text-xs text-right text-emerald-600">{mo.regle.toFixed(0)} €</td>
                                                                <td className="px-3 py-2 text-xs text-right text-violet-500">{mo.honEntree.toFixed(0)} €</td>
                                                                <td className="px-3 py-2 text-xs text-right text-amber-500">{mo.honGerance.toFixed(0)} €</td>
                                                                <td className="px-3 py-2 text-xs text-right text-orange-500 font-medium">{mHon.toFixed(0)} €</td>
                                                                <td className="px-3 py-2 text-xs text-right font-medium text-emerald-600">{mo.virement.toFixed(0)} €</td>
                                                                <td className={`px-3 py-2 text-xs text-right ${mo.impayés > 0 ? 'text-red-400' : 'text-slate-300'}`}>{mo.impayés.toFixed(0)} €</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </>
                                            );
                                        })}
                                        {annualData.length > 1 && (() => {
                                            const tQ   = annualData.reduce((s, d) => s + d.quittances, 0);
                                            const tR   = annualData.reduce((s, d) => s + d.regle, 0);
                                            const tHe  = annualData.reduce((s, d) => s + d.honEntree, 0);
                                            const tHg  = annualData.reduce((s, d) => s + d.honGerance, 0);
                                            const tHon = tHe + tHg;
                                            const tImp = annualData.reduce((s, d) => s + d.impayés, 0);
                                            const tVir = annualData.reduce((s, d) => s + d.virement, 0);
                                            return (
                                                <tr className="bg-slate-100 border-t-2 border-slate-400">
                                                    <td className="px-3 py-3"></td>
                                                    <td className="px-3 py-3 text-sm font-bold text-slate-800">TOTAL</td>
                                                    <td className="px-3 py-3 text-sm text-right text-slate-600 font-bold">{tQ.toFixed(0)} €</td>
                                                    <td className="px-3 py-3 text-sm text-right text-emerald-700 font-bold">{tR.toFixed(0)} €</td>
                                                    <td className="px-3 py-3 text-sm text-right text-violet-600 font-bold">{tHe.toFixed(0)} €</td>
                                                    <td className="px-3 py-3 text-sm text-right text-amber-600 font-bold">{tHg.toFixed(0)} €</td>
                                                    <td className="px-3 py-3 text-sm text-right text-orange-600 font-bold">{tHon.toFixed(0)} €</td>
                                                    <td className="px-3 py-3 text-sm text-right font-bold text-emerald-700">{tVir.toFixed(0)} €</td>
                                                    <td className="px-3 py-3 text-sm text-right text-red-500 font-bold">{tImp.toFixed(0)} €</td>
                                                </tr>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        ) : open.bilanAnnuel ? (
                            <p className="text-slate-500 text-sm">Aucune donnée annuelle disponible.</p>
                        ) : null}
                    </div>

            </div>{/* fin top grid Vue mensuelle + Bilan annuel */}

            {/* ── SECTIONS EN COLONNES SANS TROU (CSS columns) ── */}
            <div className="columns-1 xl:columns-2 gap-6">

                    {/* Bilan financier par locataire actif */}
                    {bilanLocataires.length > 0 && geranceRecords.length > 0 && (
                        <div className="break-inside-avoid mb-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center cursor-pointer select-none mb-1" onClick={() => toggle('bilanLocataires')}>
                                <h2 className="text-xl font-bold text-slate-800 flex-1">Bilan par locataire actif</h2>
                                {chevron('bilanLocataires')}
                            </div>
                            {open.bilanLocataires && <p className="text-sm text-slate-500 mb-4">Cumul depuis l'entrée du locataire. Loyers &gt; 0 uniquement (hors dettes fantômes).</p>}
                            {open.bilanLocataires && <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Locataire</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Box</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Loyer/m</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Quittancé</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Réglé</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Balance ORPI</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-purple-600 uppercase">Dette héritée</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Mois</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {bilanLocataires.map(({ tenant: t, totalQuittance, totalRegle, balance, nbPeriodes, loyerMensuel, detteDeclaree }) => (
                                            <tr key={t.id} className={`hover:bg-slate-50 ${(balance - detteDeclaree) < -10 ? 'bg-red-50' : balance > 0 && detteDeclaree === 0 ? 'bg-green-50' : ''}`}>
                                                <td className="px-3 py-3 text-sm font-semibold text-slate-800">{t.lastName} {t.firstName}</td>
                                                <td className="px-3 py-3 text-sm text-slate-600">
                                                    {t.rentedBoxes.map(rb => `#${rb.boxId.replace('box-', '')}`).join(', ')}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-right text-slate-600">{loyerMensuel.toFixed(0)} €</td>
                                                <td className="px-3 py-3 text-sm text-right text-slate-600">{totalQuittance.toFixed(2)} €</td>
                                                <td className="px-3 py-3 text-sm text-right text-slate-600">{totalRegle.toFixed(2)} €</td>
                                                <td className="px-3 py-3 text-sm text-right font-bold">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${balance < -10 ? 'bg-red-100 text-red-700' : balance > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {balance >= 0 ? '+' : ''}{balance.toFixed(2)} €
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-right">
                                                    {detteDeclaree > 0
                                                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-bold">−{detteDeclaree.toFixed(2)} €</span>
                                                        : <span className="text-slate-300">—</span>
                                                    }
                                                </td>
                                                <td className="px-3 py-3 text-sm text-right text-slate-400">{nbPeriodes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50">
                                        <tr>
                                            <td colSpan={3} className="px-3 py-2 text-xs font-bold text-slate-600 uppercase">Total</td>
                                            <td className="px-3 py-2 text-sm text-right font-bold text-slate-700">{bilanLocataires.reduce((s, b) => s + b.totalQuittance, 0).toFixed(2)} €</td>
                                            <td className="px-3 py-2 text-sm text-right font-bold text-slate-700">{bilanLocataires.reduce((s, b) => s + b.totalRegle, 0).toFixed(2)} €</td>
                                            <td className="px-3 py-2 text-sm text-right font-bold">
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${bilanLocataires.reduce((s, b) => s + b.balance, 0) < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {(() => { const t = bilanLocataires.reduce((s, b) => s + b.balance, 0); return (t >= 0 ? '+' : '') + t.toFixed(2) + ' €'; })()}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-sm text-right font-bold">
                                                {(() => { const d = bilanLocataires.reduce((s, b) => s + b.detteDeclaree, 0); return d > 0 ? <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">−{d.toFixed(2)} €</span> : null; })()}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>}
                        </div>
                    )}

                    {/* Impayés cumulés — tous locataires ORPI (actifs + anciens) */}
                    {impayes.length > 0 && geranceRecords.length > 0 && (
                        <div className="break-inside-avoid mb-6 bg-white p-6 rounded-xl shadow-sm border border-orange-200">
                            <div className="flex items-center cursor-pointer select-none mb-1" onClick={() => toggle('impayes')}>
                                <h2 className="text-xl font-bold text-slate-800 flex-1">Impayés cumulés — tous locataires ORPI</h2>
                                {chevron('impayes')}
                            </div>
                            {open.impayes && <p className="text-sm text-slate-500 mb-4">Solde dû au dernier relevé importé. Inclut les anciens locataires et les dettes persistantes.</p>}
                            {open.impayes && <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-orange-50">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Locataire (ORPI)</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Box</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Solde dû</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Mois</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {impayes.map(({ nom, boxId, solde, nbPeriodes }) => (
                                            <tr key={`${boxId}-${nom}`} className="hover:bg-orange-50">
                                                <td className="px-3 py-3 text-sm font-semibold text-slate-800">{nom}</td>
                                                <td className="px-3 py-3 text-sm text-slate-600">#{boxId}</td>
                                                <td className="px-3 py-3 text-sm text-right font-bold">
                                                    <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                                                        {solde.toFixed(2)} €
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-right text-slate-400">{nbPeriodes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50">
                                        <tr>
                                            <td colSpan={2} className="px-3 py-2 text-xs font-bold text-slate-600 uppercase">Total impayés</td>
                                            <td className="px-3 py-2 text-sm text-right font-bold">
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                                                    {impayes.reduce((s, e) => s + e.solde, 0).toFixed(2)} €
                                                </span>
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>}
                        </div>
                    )}

                    {/* Factures honoraires */}
                    <div className="break-inside-avoid mb-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2 cursor-pointer select-none flex-1" onClick={() => toggle('honoraires')}>
                                <h2 className="text-xl font-bold text-slate-800">Honoraires ({honorairesRecords.length})</h2>
                                {chevron('honoraires')}
                            </div>
                            <input
                                type="text"
                                placeholder="Filtrer par locataire, prestation, date..."
                                value={honFilter}
                                onChange={e => setHonFilter(e.target.value)}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-sm w-full sm:w-64"
                            />
                        </div>
                        {open.honoraires && filteredHon.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-80 overflow-y-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">N° Fact.</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Locataire</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Prestation</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">HT</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">TTC</th>
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
                                                <td className="px-3 py-2 text-xs text-right text-orange-600 font-semibold">{r.ttc.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 sticky bottom-0">
                                        <tr>
                                            <td colSpan={4} className="px-3 py-2 text-xs font-bold text-slate-700 uppercase">Total ({filteredHon.length})</td>
                                            <td className="px-3 py-2 text-xs text-right font-bold text-slate-700">{filteredHon.reduce((s, r) => s + r.ht, 0).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-xs text-right font-bold text-orange-600">{filteredHon.reduce((s, r) => s + r.ttc, 0).toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : open.honoraires ? (
                            <p className="text-slate-500 text-sm">Aucune facture correspondante.</p>
                        ) : null}
                    </div>

                    {/* Loyers en retard */}
                    <div className="break-inside-avoid mb-6 bg-white p-6 rounded-xl shadow-sm border border-red-200">
                        <div className="flex items-center justify-between mb-4 cursor-pointer select-none" onClick={() => toggle('retards')}>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Loyers en retard</h2>
                                <p className="text-sm text-slate-500 mt-1">Locataires actifs avec retard de paiement</p>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="text-center px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                                    <p className="text-xs text-red-500 font-medium uppercase">En retard</p>
                                    <p className="text-2xl font-bold text-red-700">{impayesActifs.length}</p>
                                </div>
                                <div className="text-center px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                                    <p className="text-xs text-red-500 font-medium uppercase">Total</p>
                                    <p className="text-2xl font-bold text-red-700">{impayesActifs.reduce((s, t) => s + t.unpaidRent, 0).toFixed(0)} €</p>
                                </div>
                                {chevron('retards')}
                            </div>
                        </div>
                        {open.retards && impayesActifs.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-red-50">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Box</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Locataire</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Loyer/m</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-red-600 uppercase">Retard</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Jours</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {impayesActifs.map(t => (
                                            <tr key={t.id} className="hover:bg-red-50">
                                                <td className="px-3 py-3 text-sm font-bold text-slate-800">
                                                    {t.rentedBoxes.map(rb => `#${rb.boxId.replace('box-', '')}`).join(', ')}
                                                </td>
                                                <td className="px-3 py-3 text-sm font-semibold text-slate-800">{t.lastName} {t.firstName}</td>
                                                <td className="px-3 py-3 text-sm text-right text-slate-600">
                                                    {t.rentedBoxes.reduce((s, rb) => s + rb.price, 0).toFixed(0)} €
                                                </td>
                                                <td className="px-3 py-3 text-sm text-right font-bold text-red-600">
                                                    {t.unpaidRent > 0 ? `${t.unpaidRent.toFixed(2)} €` : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-right">
                                                    {t.daysLate > 0
                                                        ? <span className="text-red-500 font-semibold">{t.daysLate}j</span>
                                                        : <span className="text-slate-400">—</span>}
                                                </td>
                                                <td className="px-3 py-3 text-sm">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.paymentStatus === 'En retard' ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'}`}>
                                                        {t.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-red-50 border-t-2 border-red-200">
                                        <tr>
                                            <td colSpan={3} className="px-3 py-2 text-xs font-bold text-slate-700 uppercase">Total ({impayesActifs.length})</td>
                                            <td className="px-3 py-2 text-sm text-right font-bold text-red-600">
                                                {impayesActifs.reduce((s, t) => s + t.unpaidRent, 0).toFixed(2)} €
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : open.retards ? (
                            <p className="text-emerald-600 font-medium text-sm">Aucun locataire en retard de paiement.</p>
                        ) : null}
                    </div>

                    {/* Erreurs ORPI documentées */}
                    {erreurAgences.length > 0 && (
                        <div className="break-inside-avoid mb-6 bg-white p-6 rounded-xl shadow-sm border-2 border-red-300">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 cursor-pointer select-none" onClick={() => toggle('erreurs')}>
                                <div>
                                    <h2 className="text-xl font-bold text-red-700">Erreurs ORPI documentées</h2>
                                    <p className="text-sm text-slate-500 mt-1">{erreurAgences.length} anomalie(s) — à corriger par l'agence</p>
                                </div>
                                <div className="flex gap-3 items-center">
                                    <div className="text-center px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-xs text-red-500 font-medium uppercase">Manque/mois</p>
                                        <p className="text-2xl font-bold text-red-700">{totalErreursMensuel.toFixed(0)} €</p>
                                    </div>
                                    <div className="text-center px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-xs text-red-500 font-medium uppercase">Manque/an</p>
                                        <p className="text-2xl font-bold text-red-700">{totalErreursAnnuel.toFixed(0)} €</p>
                                    </div>
                                    {chevron('erreurs')}
                                </div>
                            </div>
                            {open.erreurs && <div className="space-y-3">
                                {erreurAgences.map((e, i) => (
                                    <div key={i} className={`p-4 rounded-lg border-l-4 ${e.statut === 'ACTIF' ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50'}`}>
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.type === 'DETTE_FANTOME' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {e.type === 'DETTE_FANTOME' ? 'DETTE FANTÔME' : 'TARIF ERRONÉ'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">Box {e.boxesImpactees}</span>
                                                    <span className="text-xs text-slate-400">{e.dateDetectee}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-800">{e.titre}</p>
                                                <p className="text-xs text-slate-600 mt-1">{e.description}</p>
                                                <p className="text-xs text-red-600 font-medium mt-2">Action : {e.actionRequise}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-lg font-bold text-red-700">−{(e.ecartMensuel || e.impactMensuel || 0).toFixed(0)} €/mois</p>
                                                <p className="text-xs text-red-500">−{(e.ecartAnnuel || e.impactAnnuel || 0).toFixed(0)} €/an</p>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.statut === 'ACTIF' ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'}`}>
                                                    {e.statut}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>}
                        </div>
                    )}

                    {/* Assurances expirant */}
                    {assurancesExpirant.length > 0 && (
                        <div className="break-inside-avoid mb-6 bg-white p-6 rounded-xl shadow-sm border border-orange-200">
                            <div className="flex items-center cursor-pointer select-none mb-4" onClick={() => toggle('assurances')}>
                                <h2 className="text-xl font-bold text-orange-700 flex-1">
                                    Assurances expirant bientôt
                                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">{assurancesExpirant.length}</span>
                                </h2>
                                {chevron('assurances')}
                            </div>
                            {open.assurances && <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-orange-50">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Locataire</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Box</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Expiration</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-orange-600 uppercase">Jours</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {assurancesExpirant.map(t => (
                                            <tr key={t.id} className={t.daysLeft <= 0 ? 'bg-red-50' : t.daysLeft <= 14 ? 'bg-orange-50' : ''}>
                                                <td className="px-3 py-3 text-sm font-semibold text-slate-800">{t.lastName} {t.firstName}</td>
                                                <td className="px-3 py-3 text-sm text-slate-600">
                                                    {t.rentedBoxes.map(rb => `#${rb.boxId.replace('box-', '')}`).join(', ')}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-slate-600">
                                                    {new Date(t.insuranceExpiryDate!).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <span className={`font-bold px-2 py-1 rounded-full text-xs ${t.daysLeft <= 0 ? 'bg-red-200 text-red-800' : t.daysLeft <= 14 ? 'bg-orange-200 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {t.daysLeft <= 0 ? 'Expirée' : `${t.daysLeft} j`}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>}
                        </div>
                    )}


                    {/* Calculateur IRL */}
                    <div className="break-inside-avoid mb-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center cursor-pointer select-none mb-4" onClick={() => toggle('irl')}>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-slate-800">Calculateur IRL — Révision de loyer</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Indice de Référence des Loyers (INSEE).
                                    <a href="https://www.insee.fr/fr/statistiques/serie/001515333" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">Consulter les indices INSEE</a>
                                </p>
                            </div>
                            {chevron('irl')}
                        </div>
                        {open.irl && <><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Loyer actuel (€)</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={irlLoyer} onChange={e => setIrlLoyer(e.target.value)}
                                    placeholder="ex : 158.00"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">IRL de référence (ancien)</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={irlAncien} onChange={e => setIrlAncien(e.target.value)}
                                    placeholder="ex : 143.46"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Nouvel IRL (dernier publié)</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={irlNouveau} onChange={e => setIrlNouveau(e.target.value)}
                                    placeholder="ex : 146.21"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        </div>
                        {irlResult ? (
                            <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-center">
                                    <p className="text-xs font-medium text-slate-500 uppercase">Nouveau loyer</p>
                                    <p className="text-2xl font-bold text-blue-700 mt-1">{irlResult.nouveauLoyer.toFixed(2)} €</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-medium text-slate-500 uppercase">Variation</p>
                                    <p className={`text-2xl font-bold mt-1 ${irlResult.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {irlResult.variation >= 0 ? '+' : ''}{irlResult.variation.toFixed(2)} €
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-medium text-slate-500 uppercase">Hausse IRL</p>
                                    <p className={`text-2xl font-bold mt-1 ${irlResult.variationPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {irlResult.variationPct >= 0 ? '+' : ''}{irlResult.variationPct.toFixed(2)} %
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Renseignez les 3 valeurs pour calculer la révision.</p>
                        )}</>}
                    </div>

            </div>{/* fin colonnes sans trou */}

            {/* ══════════════════════════════════════
                CONTRÔLE CROISÉ — PLEINE LARGEUR
            ══════════════════════════════════════ */}
            {(geranceRecords.length > 0 || rdgRecords.length > 0) && selectedPeriod && (
                <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-6 cursor-pointer select-none" onClick={() => toggle('croisement')}>
                        <div>
                            <h2 className="text-xl font-bold text-blue-800">Contrôle croisé — {ymToLabel(selectedPeriod)}</h2>
                            <p className="text-sm text-slate-500 mt-1">Vérification automatique de la cohérence entre les données BeeBox et les relevés ORPI</p>
                        </div>
                        {chevron('croisement')}
                    </div>

                    {open.croisement && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

                        {/* Check 1 — Occupation (déplacé en premier) */}
                        {crossCheckOccupation && (
                            <div className={`p-4 rounded-xl border ${crossCheckOccupation.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-base font-bold w-6 h-6 flex items-center justify-center rounded-full ${crossCheckOccupation.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                        {crossCheckOccupation.ok ? '✓' : '✗'}
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-700">Occupation BeeBox vs CRG</h3>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500">Boxes dans ORPI ce mois</span><span className="font-bold">{crossCheckOccupation.orpiCount}</span></div>
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500">Boxes occupés BeeBox</span><span className="font-bold">{crossCheckOccupation.beeboxCount}</span></div>
                                    {crossCheckOccupation.inOrpiNotBeebox.length > 0 && (
                                        <div className="p-2 bg-red-100 rounded">
                                            <p className="font-bold text-red-700 mb-1">Dans ORPI mais absent BeeBox :</p>
                                            <p className="text-red-600">{crossCheckOccupation.inOrpiNotBeebox.map(b => `#${b}`).join(', ')}</p>
                                        </div>
                                    )}
                                    {crossCheckOccupation.inBeeboxNotOrpi.length > 0 && (
                                        <div className="p-2 bg-orange-100 rounded">
                                            <p className="font-bold text-orange-700 mb-1">Dans BeeBox mais absent ORPI :</p>
                                            <p className="text-orange-600">{crossCheckOccupation.inBeeboxNotOrpi.map(b => `#${b}`).join(', ')}</p>
                                        </div>
                                    )}
                                    {crossCheckOccupation.ok && <p className="text-xs text-green-600 font-medium p-2 bg-green-100 rounded text-center">Occupation cohérente</p>}
                                </div>
                            </div>
                        )}

                        {/* Check 2 — Honoraires */}
                        {crossCheckHonoraires ? (
                            <div className={`p-4 rounded-xl border ${crossCheckHonoraires.ok ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-base font-bold w-6 h-6 flex items-center justify-center rounded-full ${crossCheckHonoraires.ok ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                                        {crossCheckHonoraires.ok ? '✓' : '!'}
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-700">Honoraires gérance (7%)</h3>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500">Quittancé total</span><span className="font-bold">{crossCheckHonoraires.quittanceTotal.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100"><span className="text-slate-500">dont loyers purs</span><span className="font-bold text-blue-700">{crossCheckHonoraires.loyersPurs.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-purple-50 rounded border border-purple-100"><span className="text-slate-500">dont assurances</span><span className="font-bold text-purple-600">{crossCheckHonoraires.assurancesTotal.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-slate-50 rounded border border-slate-100"><span className="text-slate-500">dont TVA</span><span className="font-bold text-slate-500">{crossCheckHonoraires.tvaTotal.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-white rounded border-t border-slate-200"><span className="text-slate-600 font-medium">Base honoraires (loyers purs)</span><span className="font-bold">{crossCheckHonoraires.loyersPurs.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500">7% attendu (HT)</span><span className="font-bold">{crossCheckHonoraires.attenduHT.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500">Prélevé réel (HT)</span><span className="font-bold">{crossCheckHonoraires.reelHT.toFixed(2)} €</span></div>
                                    <div className={`flex justify-between p-2 rounded font-bold ${crossCheckHonoraires.ok ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        <span>Écart</span>
                                        <span>{crossCheckHonoraires.ecart >= 0 ? '+' : ''}{crossCheckHonoraires.ecart.toFixed(2)} €</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                <h3 className="text-sm font-bold text-slate-400">Honoraires gérance</h3>
                                <p className="text-xs text-slate-400 mt-2 italic">Pas de données RDG pour ce mois</p>
                            </div>
                        )}

                        {/* Check 3 — Virement */}
                        {crossCheckVirement ? (
                            <div className={`p-4 rounded-xl border ${crossCheckVirement.ok ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-base font-bold w-6 h-6 flex items-center justify-center rounded-full ${crossCheckVirement.ok ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                                        {crossCheckVirement.ok ? '✓' : '!'}
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-700">Virement réel vs calculé</h3>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500">Réglé</span><span className="font-bold">{crossCheckVirement.regleTotal.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500">− Hon. gérance</span><span className="font-bold text-orange-600">−{crossCheckVirement.honGerance.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500">− Hon. entrée</span><span className="font-bold text-orange-600">−{crossCheckVirement.honEntree.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-white rounded border-t border-slate-200"><span className="text-slate-500 font-medium">= Calculé</span><span className="font-bold text-slate-700">{crossCheckVirement.virementCalcule.toFixed(2)} €</span></div>
                                    <div className="flex justify-between p-2 bg-white rounded"><span className="text-slate-500 font-medium">Virement réel</span><span className="font-bold text-emerald-700">{crossCheckVirement.virementReel.toFixed(2)} €</span></div>
                                    <div className={`flex justify-between p-2 rounded font-bold ${crossCheckVirement.ok ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        <span>Écart</span>
                                        <span>{crossCheckVirement.ecart >= 0 ? '+' : ''}{crossCheckVirement.ecart.toFixed(2)} €</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                <h3 className="text-sm font-bold text-slate-400">Virement ORPI</h3>
                                <p className="text-xs text-slate-400 mt-2 italic">Pas de données RDG pour ce mois</p>
                            </div>
                        )}

                        {/* Check 4 — Dettes ORPI vs BeeBox */}
                        {(() => {
                            const nbEcarts = crossCheckImpayes.filter(c => Math.abs(c.ecart) > 0.5).length;
                            return (
                                <div className={`p-4 rounded-xl border ${nbEcarts === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`text-base font-bold w-6 h-6 flex items-center justify-center rounded-full ${nbEcarts === 0 ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                                            {nbEcarts === 0 ? '✓' : '!'}
                                        </span>
                                        <h3 className="text-sm font-bold text-slate-700">Dettes ORPI vs BeeBox</h3>
                                        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${nbEcarts === 0 ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'}`}>
                                            {nbEcarts} écart(s)
                                        </span>
                                    </div>
                                    {crossCheckImpayes.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">Aucune dette active</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {crossCheckImpayes.map((c, i) => (
                                                <div key={i} className={`text-xs p-2 rounded ${Math.abs(c.ecart) > 0.5 ? 'bg-orange-100' : 'bg-white'}`}>
                                                    <div className="font-medium text-slate-700 mb-1">#{c.boxId} — {c.tenantName}</div>
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-slate-500">ORPI : <span className="font-bold text-slate-700">{c.soldOrpi.toFixed(2)} €</span></span>
                                                        <span className="text-slate-500">BeeBox : <span className="font-bold text-slate-700">{c.detteBeebox.toFixed(2)} €</span></span>
                                                        {Math.abs(c.ecart) > 0.5 && <span className="text-orange-700 font-bold">Δ {c.ecart >= 0 ? '+' : ''}{c.ecart.toFixed(2)} €</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Check 5 — Prix box (déplacé ici) */}
                        <div className={`p-4 rounded-xl border ${crossCheckPrix.every(c => c.ok) ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-base font-bold w-6 h-6 flex items-center justify-center rounded-full ${crossCheckPrix.every(c => c.ok) ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                    {crossCheckPrix.every(c => c.ok) ? '✓' : '✗'}
                                </span>
                                <h3 className="text-sm font-bold text-slate-700">Prix box BeeBox vs ORPI</h3>
                                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${crossCheckPrix.filter(c => !c.ok).length === 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                    {crossCheckPrix.filter(c => !c.ok).length} écart(s)
                                </span>
                            </div>
                            {crossCheckPrix.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Aucun box en commun ce mois</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {crossCheckPrix.filter(c => !c.ok).map((c, i) => (
                                        <div key={i} className={`flex items-center justify-between text-xs p-2 rounded ${c.ok ? 'bg-white' : 'bg-red-100'}`}>
                                            <span className="font-medium text-slate-700">#{c.boxId} — {c.tenantName}</span>
                                            <div className="text-right shrink-0 ml-2 flex items-center gap-1">
                                                <span className="text-slate-400">{c.prixBeebox.toFixed(0)}€</span>
                                                <span className="text-slate-300">→</span>
                                                <span className={c.ok ? 'text-slate-600' : 'text-red-700 font-bold'}>{c.prixOrpi.toFixed(0)}€</span>
                                                {!c.ok && <span className="text-red-700 font-bold">({c.ecart > 0 ? '+' : ''}{c.ecart.toFixed(0)}€)</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Check 6 — Frais d'entrée ORPI : anomalies détectées */}
                        <div className="p-4 rounded-xl border border-red-200 bg-red-50 md:col-span-2 xl:col-span-1">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-base font-bold w-6 h-6 flex items-center justify-center rounded-full text-white bg-red-600">✗</span>
                                <h3 className="text-sm font-bold text-slate-700">Frais d'entrée ORPI (50€/locataire)</h3>
                            </div>

                            {/* Bloc rouge — action requise */}
                            <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                                <p className="text-xs font-bold text-red-800 mb-1">
                                    ACTION REQUISE — {HONORAIRES_PRELEVES_SANS_FACTURE.length * 50} € prélevés sans facture
                                </p>
                                <p className="text-xs text-red-700 mb-2">
                                    ORPI a déduit 50€ sur vos virements pour {HONORAIRES_PRELEVES_SANS_FACTURE.length} locataires
                                    sans jamais vous envoyer la facture. Réclamez ces {HONORAIRES_PRELEVES_SANS_FACTURE.length} factures à ORPI.
                                </p>
                                <div className="overflow-x-auto rounded border border-red-200">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-red-200">
                                            <tr>
                                                <th className="px-2 py-1.5 text-left font-semibold text-red-900">Box</th>
                                                <th className="px-2 py-1.5 text-left font-semibold text-red-900">Locataire</th>
                                                <th className="px-2 py-1.5 text-left font-semibold text-red-900">Date entrée</th>
                                                <th className="px-2 py-1.5 text-right font-semibold text-red-900">Déduit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-100 bg-white">
                                            {HONORAIRES_PRELEVES_SANS_FACTURE.map((m, i) => (
                                                <tr key={i} className="hover:bg-red-50">
                                                    <td className="px-2 py-1.5 font-bold text-slate-700">#{m.box}</td>
                                                    <td className="px-2 py-1.5 font-medium text-slate-800">{m.nom}</td>
                                                    <td className="px-2 py-1.5 text-slate-500">{m.entree}</td>
                                                    <td className="px-2 py-1.5 text-right font-bold text-red-700">−50 €</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-red-100 border-t border-red-300">
                                            <tr>
                                                <td colSpan={3} className="px-2 py-1.5 font-bold text-red-900">Total à réclamer</td>
                                                <td className="px-2 py-1.5 text-right font-bold text-red-900">−{HONORAIRES_PRELEVES_SANS_FACTURE.length * 50} €</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Bloc vert — bonne nouvelle */}
                            <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                                <p className="text-xs font-bold text-green-800 mb-1">
                                    EN VOTRE FAVEUR — {HONORAIRES_JAMAIS_FACTURES.length * 50} € non prélevés
                                </p>
                                <p className="text-xs text-green-700 mb-2">
                                    ORPI a oublié de vous facturer les frais d'entrée pour {HONORAIRES_JAMAIS_FACTURES.length} locataires.
                                    Ces 50€ n'ont jamais été déduits de vos virements.
                                </p>
                                <div className="overflow-x-auto rounded border border-green-200">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-green-200">
                                            <tr>
                                                <th className="px-2 py-1.5 text-left font-semibold text-green-900">Box</th>
                                                <th className="px-2 py-1.5 text-left font-semibold text-green-900">Locataire</th>
                                                <th className="px-2 py-1.5 text-left font-semibold text-green-900">Date entrée</th>
                                                <th className="px-2 py-1.5 text-right font-semibold text-green-900">Non prélevé</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-green-100 bg-white">
                                            {HONORAIRES_JAMAIS_FACTURES.map((m, i) => (
                                                <tr key={i} className="hover:bg-green-50">
                                                    <td className="px-2 py-1.5 font-bold text-slate-700">#{m.box}</td>
                                                    <td className="px-2 py-1.5 font-medium text-slate-800">{m.nom}</td>
                                                    <td className="px-2 py-1.5 text-slate-500">{m.entree}</td>
                                                    <td className="px-2 py-1.5 text-right font-bold text-green-700">+50 €</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-green-100 border-t border-green-300">
                                            <tr>
                                                <td colSpan={3} className="px-2 py-1.5 font-bold text-green-900">Total économisé</td>
                                                <td className="px-2 py-1.5 text-right font-bold text-green-900">+{HONORAIRES_JAMAIS_FACTURES.length * 50} €</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>}
                </div>
            )}

        </div>
    );
};

export default FinancesPage;
