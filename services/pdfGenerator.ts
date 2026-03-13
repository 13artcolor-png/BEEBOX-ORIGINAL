import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Box, Tenant, BoxStatus } from '../types';

/**
 * Génère une quittance de loyer PDF pour un locataire et un mois donné.
 * @param tenant - Le locataire concerné
 * @param period - Format "YYYY-MM" (ex: "2026-03")
 * @param bailleurNom - Nom complet du propriétaire-bailleur
 */
export const generateQuittanceLoyer = (tenant: Tenant, period: string, bailleurNom: string) => {
    const doc = new jsPDF();
    const [year, month] = period.split('-').map(Number);
    const dateDebut = new Date(year, month - 1, 1);
    const dateFin = new Date(year, month, 0); // dernier jour du mois
    const dateEmission = new Date().toLocaleDateString('fr-FR');
    const moisLabel = dateDebut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const boxes = tenant.rentedBoxes.map(rb => `Box N°${rb.boxId.replace('box-', '')}`).join(', ');
    const loyerTotal = tenant.rentedBoxes.reduce((s, rb) => s + rb.price, 0);
    const assurance = tenant.assuranceMontant || 0;
    const totalTTC = loyerTotal + assurance;

    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    // --- En-tête ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text('QUITTANCE DE LOYER', w / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Mois de ${moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1)}`, w / 2, y, { align: 'center' });
    y += 10;

    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, w - 15, y);
    y += 10;

    // --- Bailleur ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('BAILLEUR', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(bailleurNom, 15, y);
    y += 12;

    // --- Locataire ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('LOCATAIRE', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${tenant.firstName} ${tenant.lastName}`, 15, y);
    y += 5;
    if (tenant.address) {
        doc.text(`${tenant.address}`, 15, y);
        y += 5;
    }
    if (tenant.postalCode && tenant.city) {
        doc.text(`${tenant.postalCode} ${tenant.city}`, 15, y);
        y += 5;
    }
    y += 7;

    // --- Logement ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('LOGEMENT', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${boxes} — BEEBOX LAON`, 15, y);
    y += 5;
    doc.text('Laon, France', 15, y);
    y += 12;

    // --- Déclaration ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const declaration = [
        `Je soussigné(e) ${bailleurNom}, bailleur du logement désigné ci-dessus,`,
        `reconnais avoir reçu de ${tenant.firstName} ${tenant.lastName}, locataire dudit logement,`,
        `la somme de ${totalTTC.toFixed(2)} euros`,
        `au titre du loyer et des charges pour la période du`,
        `${dateDebut.toLocaleDateString('fr-FR')} au ${dateFin.toLocaleDateString('fr-FR')}.`,
    ];
    declaration.forEach(line => { doc.text(line, 15, y); y += 6; });
    y += 5;

    // --- Détail des sommes ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAIL', 15, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        head: [['Désignation', 'Montant']],
        body: [
            ['Loyer mensuel hors charges', `${loyerTotal.toFixed(2)} €`],
            ...(assurance > 0 ? [['Assurance (refacturée)', `${assurance.toFixed(2)} €`]] : []),
            ['TOTAL', `${totalTTC.toFixed(2)} €`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // --- Signature ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Fait à Laon, le ${dateEmission}`, 15, finalY);
    doc.text('Signature du bailleur :', w - 80, finalY);
    doc.line(w - 80, finalY + 15, w - 15, finalY + 15);

    // --- Pied de page ---
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Cette quittance annule tous les reçus qui auraient pu être établis précédemment en règlement du loyer du mois susvisé.', w / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    const filename = `quittance_${tenant.lastName.toLowerCase()}_${period}.pdf`;
    doc.save(filename);
};

// Helper to add header and footer
const addHeaderAndFooter = (doc: jsPDF, title: string) => {
    const pageCount = doc.getNumberOfPages();
    const today = new Date().toLocaleDateString('fr-FR');

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Header
        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text('BEEBOX LAON - Gestion', 15, 20);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(title, 15, 28);
        doc.text(`Date: ${today}`, doc.internal.pageSize.getWidth() - 15, 28, { align: 'right' });


        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} sur ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }
};

export const generateBoxesReport = (boxes: Box[], tenants: Tenant[]) => {
    const doc = new jsPDF();
    const tenantsMap = new Map(tenants.map(t => [t.id, t]));

    const tableData = boxes.map(box => {
        const tenant = box.currentTenantId ? tenantsMap.get(box.currentTenantId) : null;
        const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : '---';
        return [
            `#${box.id.replace('box-', '')}`,
            box.status === BoxStatus.Occupied ? 'Occupé' : 'Libre',
            box.size,
            `${box.price.toFixed(2)} €`,
            tenantName
        ];
    });

    autoTable(doc, {
        head: [['N° Box', 'Statut', 'Taille', 'Prix', 'Locataire Actuel']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 9 },
    });

    addHeaderAndFooter(doc, "Rapport d'Inventaire des Boxes");
    doc.save(`beebox-laon-inventaire-boxes-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateTenantsReport = (tenants: Tenant[]) => {
    const doc = new jsPDF();
    
    const activeTenants = tenants.filter(t => !t.endDate);

    const tableData = activeTenants.map(tenant => [
        `${tenant.lastName} ${tenant.firstName}`,
        tenant.rentedBoxes.map(rb => `#${rb.boxId.replace('box-', '')}`).join(', '),
        tenant.paymentStatus,
        tenant.email,
        tenant.phone,
        new Date(tenant.startDate).toLocaleDateString('fr-FR')
    ]);

    autoTable(doc, {
        head: [['Nom', 'Boxes', 'Statut Paiement', 'Email', 'Téléphone', 'Date d\'entrée']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133], textColor: 255 },
        styles: { fontSize: 9 },
    });

    addHeaderAndFooter(doc, 'Rapport des Locataires Actifs');
    doc.save(`beebox-laon-rapport-locataires-${new Date().toISOString().split('T')[0]}.pdf`);
};
