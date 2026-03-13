export enum UserRole {
  Admin = 'admin',
  Agent = 'agent',
}

export enum BoxStatus {
  Vacant = 'vacant',
  Occupied = 'occupied',
}

export enum BoxSide {
  Cour = 'Cour',
  Rue = 'Rue',
}

export enum BoxLevel {
  RDC = 'RDC',
  Niveau1 = 'Niveau 1',
}

export enum OpeningType {
  Porte = 'Porte',
  Volet = 'Volet',
  Garage = 'Garage',
}

export enum IdType {
  CarteIdentite = "Carte d'identité",
  PermisConduire = 'Permis de conduire',
  Passeport = 'Passeport',
  Autre = 'Autre',
}

export enum PaymentStatus {
  Paid = 'Payé',
  Due = 'À échéance',
  Overdue = 'En retard',
}

export interface AdminUser {
  // FIX: Add optional 'id' property to satisfy the generic constraint of fetchData.
  id?: string;
  name: string;
  username: string;
  email: string;
  secondaryEmail?: string;
  password?: string; // For changing password in admin profile
}

export interface WorkHistoryItem {
  description: string;
  completedDate: string;
}

export interface Box {
  id: string;
  immLot?: string;
  codeImmeuble?: string;
  size: string;
  price: number;
  assuranceMontant?: number;
  tvaApplicable?: boolean;
  tvaTaux?: number;
  typeLoyer?: string;
  status: BoxStatus;
  side: BoxSide;
  level: BoxLevel;
  opening: OpeningType;
  currentTenantId?: string | null;
  tenantHistory: string[];
  rentedByAgentId?: string;
  note?: string;
  workToDo?: string;
  workAlert?: boolean;
  workHistory: WorkHistoryItem[];
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  idNumber: string;
  idType: IdType;
  idImageUrl?: string;
  insuranceInfo: string;
  insuranceExpiryDate?: string;
  insuranceImageUrl?: string;
  doorCode: string;
  codeLocataire?: string;
  agentId: string;
  rentedBoxes: { boxId: string; price: number }[];
  assuranceMontant?: number;
  startDate: string;
  endDate?: string | null;
  potentialEndDate: string;
  info: string;
  unpaidRent: number;
  // New fields for payment tracking
  paymentStatus: PaymentStatus;
  lastPaymentDate?: string;
  nextDueDate?: string;
}

export interface Agent {
  id: string;
  name: string;
  agencyId: string;
  personalCode: string;
  photoUrl?: string;
  username: string;
  email: string;
  phone: string;
  doorCode: string;
  password?: string; // For setting/resetting agent password by admin
}

export interface Agency {
  id: string;
  name: string;
  managementFee: number; // percentage
  entryFee: number; // fixed amount
  logoUrl?: string;
  email: string;
  phone: string;
  reportContactEmail?: string;
}

export interface ChatMessage {
  sender: 'user' | 'gemini';
  text: string;
  isError?: boolean;
}

// Interfaces for report analysis
export interface ExtractedReportData {
  boxNumber: string;
  tenantName: string;
  rentAmount: number;
}

export interface AnalysisDiscrepancy {
  boxId: string;
  reportData: ExtractedReportData;
  appData: {
    box: Box | null;
    tenant: Tenant | null;
  };
  reason: string;
}

export interface AnalysisMatch {
  boxId: string;
  reportData: ExtractedReportData;
  appData: {
    box: Box;
    tenant: Tenant;
  };
}

export interface AnalysisResult {
  matches: AnalysisMatch[];
  discrepancies: AnalysisDiscrepancy[];
}

export interface ActivityLog {
  id: string;
  timestamp: any; // Firestore Timestamp
  userRole: UserRole;
  userName: string;
  action: string;
}

export interface GuidedVideo {
  id: string;
  title: string;
  storageUrl: string;
  timestamp: any; // Firestore Timestamp
}

export interface GeranceRecord {
  id: string;
  boxId: string;
  codeLot: string;
  codeLocataire: string;
  nomLocataire: string;
  loyer: number;
  assurance: number;
  tva: number;
  totalQuittance: number;
  totalRegle: number;
  solde: number;
  periode: string;
  fichier: string;
  importedAt: string;
}

export interface ErreurAgence {
  id: string;
  type: string;
  titre: string;
  description: string;
  boxesImpactees: string;
  ecartMensuel?: number;
  ecartAnnuel?: number;
  impactMensuel?: number;
  impactAnnuel?: number;
  dateDetectee: string;
  statut: string;
  actionRequise: string;
  // Champs erreur tarif
  locataire?: string;
  codeLocataire?: string;
  prixReel?: number;
  prixFacture?: number;
  cause?: string;
  // Champs dette fantôme
  locatairesFautif?: string;
  locatairesVictimes?: string;
  detteBox1?: number;
  detteBox23?: number;
}

export interface RdgRecord {
  id: string;
  ref: string;
  date_rdg: string;    // YYYY-MM-DD
  annee: string;       // YYYY
  mois: string;        // YYYY-MM
  quittance_total: number;
  regle_total: number;
  honoraires_gerance: number;
  honoraires_entree: number;
  virement: number;
}

export interface HonorairesRecord {
  id: string;
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
  importedAt: string;
}

// ─── Interfaces Contrôle CRG Mensuel ─────────────────────────────────────────

export interface CrgLot {
  boxId: string;
  locataires: { nom: string; loyer: number; quittance: number; regle: number; solde: number }[];
}

export interface CrgErreurStatus {
  erreurId: string;
  titre: string;
  statut: 'PERSISTANT' | 'CORRIGE' | 'NOUVEAU';
  detail: string;
}

export interface CrgAnalysisResult {
  date: string;
  virement: number;
  lots: CrgLot[];
  erreursStatus: CrgErreurStatus[];
  nouvellesAnomalies: string[];
}