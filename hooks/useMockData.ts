
import { useState } from 'react';
import { Box, Tenant, Agent, Agency, BoxStatus, BoxSide, BoxLevel, OpeningType, AdminUser, IdType, PaymentStatus } from '../types';

const generateInitialBoxes = (): Box[] => {
  const boxes: Box[] = [];
  const sizes = ['5m²', '8m²', '10m²', '12m²', '15m²', '23 M²', '11.5 M2'];
  const prices: { [key: string]: number } = { '5m²': 50, '8m²': 70, '10m²': 90, '12m²': 110, '15m²': 130, '23 M²': 697.90, '11.5 M2': 102.48, 'garage': 90.00 };
  const openingTypes = Object.values(OpeningType);

  for (let i = 1; i <= 61; i++) {
    let size = sizes[i % sizes.length];
    let price;

    switch(i) {
        case 1: size = '23 M²'; price = 697.90; break;
        case 2: case 3: size = '23 M2 OU 67M3'; price = 166.65; break;
        case 4: size = '11.5 M2 OU 35 M3'; price = 102.48; break;
        case 6: size = '11.5 M2 /35M3'; price = 90.00; break;
        default: price = prices[size] ? prices[size] + (i % 3) * 5 : 100;
    }

    const side = i % 2 === 0 ? BoxSide.Rue : BoxSide.Cour;
    const level = i % 3 === 0 ? BoxLevel.Niveau1 : BoxLevel.RDC;
    const opening = openingTypes[i % openingTypes.length];
    
    const box: Box = {
      id: i.toString(),
      size,
      price,
      status: BoxStatus.Vacant,
      side,
      level,
      opening,
      tenantHistory: [],
      workToDo: '',
      workAlert: false,
      workHistory: [],
    };

    if (i === 10) box.note = "Proche de l'entrée";
    if (i === 15) {
      box.workToDo = "La porte grince et nécessite d'être huilée.";
      box.workAlert = true;
    }
    if (i === 25) box.note = "Nécessite une clé spéciale";

    boxes.push(box);
  }
  return boxes;
};

export const initialAdminUser: AdminUser = {
    id: 'main_admin',
    name: 'Papa et Maman',
    username: 'admin',
    email: 'admin@beebox-laon.fr',
    secondaryEmail: 'beeboxlaon@gmail.com',
};

export const initialAgents: Agent[] = [
  { id: '1', name: 'Jean Dupont', agencyId: '1', personalCode: 'JD1234', username: 'jdupont', email: 'j.dupont@agence-centre.fr', phone: '0611223344', doorCode: '11223344' },
  { id: '2', name: 'Delphine Berko', agencyId: '3', personalCode: 'MC5678', username: 'dberko', email: 'd.berko@orpi.com', phone: '0682903472', doorCode: '82903472' },
  { id: '3', name: 'Agent ORPI', agencyId: '3', personalCode: 'ORPI01', username: 'orpi', email: 'contact@orpi-laon.fr', phone: '0323000506', doorCode: '99887766' },
];

export const initialAgencies: Agency[] = [
  { id: '1', name: 'Agence Immobilière du Centre', managementFee: 5, entryFee: 100, email: 'contact@agence-centre.fr', phone: '0323000102' },
  { id: '2', name: 'Agence Laforêt Laon', managementFee: 6, entryFee: 120, email: 'laon@laforet.com', phone: '0323000304' },
  { id: '3', name: 'ORPI', managementFee: 7, entryFee: 110, email: 'chauny@orpi.com', phone: '0323381286', reportContactEmail: 'orchestra@egide.net'},
];

export const initialBoxes = generateInitialBoxes();

const getNextDueDate = (date: Date) => {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate.toISOString().split('T')[0];
};

const today = new Date();
const lastMonth = new Date(new Date().setMonth(today.getMonth() - 1)).toISOString().split('T')[0];
const twoMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 2)).toISOString().split('T')[0];
const threeDaysFromNow = new Date(new Date().setDate(today.getDate() + 3)).toISOString().split('T')[0];
const tenDaysAgo = new Date(new Date().setDate(today.getDate() - 10)).toISOString().split('T')[0];


export const initialTenants: Tenant[] = [
    // Existing tenants
    {
      id: '101', firstName: 'Pierre', lastName: 'Martin', address: '1 rue de la Paix', postalCode: '02000', city: 'Laon', phone: '0612345678', email: 'pierre.martin@email.com', idNumber: '123456789', idType: IdType.CarteIdentite, idImageUrl: 'dummy_url_id', insuranceInfo: 'MAIF Contrat #123', insuranceImageUrl: 'dummy_url_insurance', doorCode: '12345678', agentId: '1', rentedBoxes: [{ boxId: '10', price: initialBoxes.find(b => b.id === '10')?.price || 0 }], startDate: '2023-01-15', endDate: null, potentialEndDate: '2024-12-31', info: 'Client régulier.', unpaidRent: 0, paymentStatus: PaymentStatus.Paid, lastPaymentDate: lastMonth, nextDueDate: getNextDueDate(new Date(lastMonth))
    },
    {
      id: '102', firstName: 'Sophie', lastName: 'Bernard', address: '2 avenue de la Gare', postalCode: '02000', city: 'Laon', phone: '0687654321', email: 'sophie.bernard@email.com', idNumber: '987654321', idType: IdType.Passeport, insuranceInfo: 'AXA #456', doorCode: '87654321', agentId: '2', rentedBoxes: [{ boxId: '5', price: initialBoxes.find(b => b.id === '5')?.price || 0 }], startDate: '2022-11-01', endDate: '2023-10-31', potentialEndDate: '', info: 'Parti sans préavis.', unpaidRent: 0, paymentStatus: PaymentStatus.Paid
    },
    // Tenants from the report
    {
      id: '1', firstName: 'DIEUSEUL', lastName: 'CHERESTAL', address: '58 RUE DE MANOISE', postalCode: '02000', city: 'LAON', phone: '0600000001', email: 'd.cherestal@example.com', idNumber: 'S0745', idType: IdType.Autre, insuranceInfo: 'N/A', doorCode: '10000001', agentId: '3', rentedBoxes: [{ boxId: '1', price: 697.90 }], startDate: '2024-05-10', endDate: null, potentialEndDate: '', info: 'Via rapport ORPI', unpaidRent: 0, paymentStatus: PaymentStatus.Due, lastPaymentDate: lastMonth, nextDueDate: threeDaysFromNow,
    },
    {
      id: '2', firstName: 'OMEGA PRODUCTION', lastName: 'M JUILLIART THOMAS', address: '58 RUE DE MANOISE', postalCode: '02000', city: 'LAON', phone: '0600000002', email: 'omega.prod@example.com', idNumber: 'S0650', idType: IdType.Autre, insuranceInfo: 'N/A', doorCode: '10000002', agentId: '3', rentedBoxes: [{ boxId: '2', price: 166.65 }, { boxId: '3', price: 166.65 }], startDate: '2024-04-01', endDate: null, potentialEndDate: '', info: 'Via rapport ORPI', unpaidRent: 333.30, paymentStatus: PaymentStatus.Overdue, lastPaymentDate: twoMonthsAgo, nextDueDate: tenDaysAgo
    },
    {
      id: '3', firstName: 'AMANDINE', lastName: 'MME CERF KARINE', address: '58 RUE DE MANOISE', postalCode: '02000', city: 'LAON', phone: '0600000003', email: 'a.karine@example.com', idNumber: 'S0341', idType: IdType.Autre, insuranceInfo: 'N/A', doorCode: '10000003', agentId: '3', rentedBoxes: [{ boxId: '4', price: 102.48 }], startDate: '2024-06-01', endDate: null, potentialEndDate: '', info: 'Via rapport ORPI', unpaidRent: 0, paymentStatus: PaymentStatus.Paid, lastPaymentDate: lastMonth, nextDueDate: getNextDueDate(new Date(lastMonth))
    },
    {
      id: '4', firstName: 'PIERRE', lastName: 'PASCAL', address: '58 RUE DE MANOISE', postalCode: '02000', city: 'LAON', phone: '0600000004', email: 'p.pascal@example.com', idNumber: 'S0762', idType: IdType.Autre, insuranceInfo: 'N/A', doorCode: '10000004', agentId: '3', rentedBoxes: [{ boxId: '6', price: 90.00 }], startDate: '2024-06-15', endDate: null, potentialEndDate: '', info: 'Via rapport ORPI', unpaidRent: 0, paymentStatus: PaymentStatus.Paid, lastPaymentDate: lastMonth, nextDueDate: getNextDueDate(new Date(lastMonth))
    },
];

// Assign initial tenants to boxes
initialTenants.forEach(tenant => {
    if(!tenant.endDate) {
        tenant.rentedBoxes.forEach(rb => {
            const boxIndex = initialBoxes.findIndex(b => b.id === rb.boxId);
            if (boxIndex !== -1) {
                initialBoxes[boxIndex].status = BoxStatus.Occupied;
                initialBoxes[boxIndex].currentTenantId = tenant.id;
                initialBoxes[boxIndex].rentedByAgentId = tenant.agentId; // Assign agent to box
            }
        });
    }
    tenant.rentedBoxes.forEach(rb => {
        const boxIndex = initialBoxes.findIndex(b => b.id === rb.boxId);
        if (boxIndex !== -1 && !initialBoxes[boxIndex].tenantHistory.includes(tenant.id)) {
            initialBoxes[boxIndex].tenantHistory.push(tenant.id);
        }
    });
});

// Add a sample work history item to a box that has a past tenant
const box5Index = initialBoxes.findIndex(b => b.id === '5');
if (box5Index > -1) {
    initialBoxes[box5Index].workHistory.push({
        description: "Nettoyage complet après départ de Sophie Bernard.",
        completedDate: "2023-11-02"
    });
}


export const useMockData = () => {
  // This hook now just provides the initial, rich dataset.
  // State management is lifted to App.tsx
  return { initialBoxes, initialTenants, initialAgents, initialAgencies, initialAdminUser };
};