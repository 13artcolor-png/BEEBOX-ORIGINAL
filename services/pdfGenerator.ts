import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Box, Tenant, BoxStatus } from '../types';

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
