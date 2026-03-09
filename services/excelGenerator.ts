import * as XLSX from 'xlsx';
import { Box, Tenant, BoxStatus, PaymentStatus } from '../types';

const safeDate = (d: string | null | undefined): string => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR');
};

export const generateBoxesExcel = (boxes: Box[], tenants: Tenant[]) => {
    const tenantsMap = new Map(tenants.map(t => [t.id, t]));

    const rows = boxes.map(box => {
        const tenant = box.currentTenantId ? tenantsMap.get(box.currentTenantId) : null;
        return {
            'N° Box': box.id.replace('box-', ''),
            'Statut': box.status === BoxStatus.Occupied ? 'Occupé' : 'Libre',
            'Taille': box.size,
            'Prix (€)': box.price,
            'Locataire Actuel': tenant ? `${tenant.lastName} ${tenant.firstName}` : '—',
            'Email Locataire': tenant?.email || '',
            'Téléphone Locataire': tenant?.phone || '',
        };
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Largeurs des colonnes
    ws['!cols'] = [
        { wch: 8 },   // N° Box
        { wch: 10 },  // Statut
        { wch: 12 },  // Taille
        { wch: 10 },  // Prix
        { wch: 25 },  // Locataire
        { wch: 28 },  // Email
        { wch: 16 },  // Téléphone
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire Boxes');

    // Résumé
    const occupiedCount = boxes.filter(b => b.status === BoxStatus.Occupied).length;
    const summaryRows = [
        { 'Indicateur': 'Total boxes', 'Valeur': boxes.length },
        { 'Indicateur': 'Boxes occupées', 'Valeur': occupiedCount },
        { 'Indicateur': 'Boxes libres', 'Valeur': boxes.length - occupiedCount },
        { 'Indicateur': 'Taux d\'occupation', 'Valeur': `${((occupiedCount / boxes.length) * 100).toFixed(1)} %` },
        { 'Indicateur': 'Revenu mensuel total (€)', 'Valeur': boxes.filter(b => b.status === BoxStatus.Occupied).reduce((s, b) => s + b.price, 0).toFixed(2) },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `beebox-laon-inventaire-boxes-${today}.xlsx`);
};

export const generateTenantsExcel = (tenants: Tenant[]) => {
    const activeTenants = tenants.filter(t => !t.endDate);
    const pastTenants = tenants.filter(t => !!t.endDate);

    const toRow = (tenant: Tenant) => ({
        'Nom': tenant.lastName,
        'Prénom': tenant.firstName,
        'Email': tenant.email,
        'Téléphone': tenant.phone,
        'Boxes': tenant.rentedBoxes.map(rb => rb.boxId.replace('box-', '')).join(', '),
        'Statut paiement': tenant.paymentStatus,
        'Loyer impayé (€)': tenant.unpaidRent > 0 ? tenant.unpaidRent : '',
        'Date d\'entrée': safeDate(tenant.startDate),
        'Date de sortie': safeDate(tenant.endDate),
        'Code porte': tenant.doorCode || '',
        'Adresse': `${tenant.address || ''} ${tenant.postalCode || ''} ${tenant.city || ''}`.trim(),
        'Assurance': tenant.insuranceInfo || '',
    });

    const colWidths = [
        { wch: 18 }, // Nom
        { wch: 16 }, // Prénom
        { wch: 28 }, // Email
        { wch: 14 }, // Téléphone
        { wch: 12 }, // Boxes
        { wch: 16 }, // Statut paiement
        { wch: 16 }, // Loyer impayé
        { wch: 14 }, // Date entrée
        { wch: 14 }, // Date sortie
        { wch: 12 }, // Code porte
        { wch: 35 }, // Adresse
        { wch: 30 }, // Assurance
    ];

    const wb = XLSX.utils.book_new();

    // Feuille locataires actifs
    const wsActive = XLSX.utils.json_to_sheet(activeTenants.map(toRow));
    wsActive['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, wsActive, `Actifs (${activeTenants.length})`);

    // Feuille locataires passés
    const wsPast = XLSX.utils.json_to_sheet(pastTenants.length > 0 ? pastTenants.map(toRow) : [{ 'Info': 'Aucun locataire passé' }]);
    wsPast['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, wsPast, `Passés (${pastTenants.length})`);

    // Feuille tous locataires
    const wsAll = XLSX.utils.json_to_sheet(tenants.map(t => ({ ...toRow(t), 'Statut': t.endDate ? 'Passé' : 'Actif' })));
    wsAll['!cols'] = [...colWidths, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsAll, `Tous (${tenants.length})`);

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `beebox-laon-locataires-${today}.xlsx`);
};
