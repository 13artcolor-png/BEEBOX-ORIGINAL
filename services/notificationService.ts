import emailjs from '@emailjs/browser';
import { Tenant } from '../types';

// Clés EmailJS - à configurer dans le fichier .env
const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '';
const SERVICE_ID = process.env.EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || '';

// Initialisation EmailJS si les clés sont présentes
if (PUBLIC_KEY) {
  emailjs.init({ publicKey: PUBLIC_KEY });
}

/**
 * Envoie un email via EmailJS (service client-side).
 * Nécessite de configurer EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID dans .env
 * Si non configuré, affiche une simulation dans la console.
 */
export async function sendEmailNotification(toEmail: string, subject: string, body: string): Promise<void> {
  // Si EmailJS n'est pas configuré, simulation dans la console
  if (!PUBLIC_KEY || !SERVICE_ID || !TEMPLATE_ID) {
    console.log('--- NOTIFICATION EMAIL (simulation - EmailJS non configuré) ---');
    console.log(`Destinataire: ${toEmail}`);
    console.log(`Sujet: [BEEBOX LAON] ${subject}`);
    console.log(`Message: ${body}`);
    console.log('--------------------------------------------------------------');
    return;
  }

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: toEmail,
      subject: `[BEEBOX LAON] ${subject}`,
      message: body,
      from_name: 'BEEBOX LAON',
    });
    console.log(`Email envoyé à ${toEmail}: ${subject}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    // Ne pas throw - les notifications email ne doivent pas bloquer les opérations principales
  }
}

/**
 * Envoie un rappel de paiement au locataire.
 * Ouvre le client email avec un message pré-rempli (mailto:).
 * Si EmailJS est configuré, envoie aussi via EmailJS.
 */
export function sendPaymentReminder(tenant: Tenant, adminEmail: string): void {
  const dueDate = tenant.nextDueDate
    ? new Date(tenant.nextDueDate).toLocaleDateString('fr-FR')
    : 'à échéance';
  const monthlyRent = tenant.rentedBoxes.reduce((acc, box) => acc + box.price, 0);
  const totalDue = monthlyRent + tenant.unpaidRent;
  const boxes = tenant.rentedBoxes.map(rb => `Box #${rb.boxId.replace('box-', '')}`).join(', ');

  const subject = 'Rappel de paiement de loyer - BEEBOX LAON';
  const bodyText = [
    `Cher/Chère ${tenant.firstName} ${tenant.lastName},`,
    '',
    `Ceci est un rappel concernant le paiement de votre loyer pour ${boxes} chez BEEBOX LAON.`,
    `Échéance : ${dueDate}`,
    `Loyer mensuel : ${monthlyRent.toFixed(2)} €`,
    tenant.unpaidRent > 0 ? `Impayés antérieurs : ${tenant.unpaidRent.toFixed(2)} €` : '',
    `Total dû : ${totalDue.toFixed(2)} €`,
    '',
    'Veuillez procéder au paiement dès que possible pour éviter tout désagrément.',
    'Si vous avez déjà effectué le paiement, veuillez ignorer ce message.',
    '',
    `Pour toute question, contactez-nous à ${adminEmail}.`,
    '',
    'Cordialement,',
    'BEEBOX LAON',
  ].filter(l => l !== undefined).join('\n');

  // Ouvrir le client email avec message pré-rempli
  if (tenant.email) {
    const mailtoUrl = `mailto:${tenant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.open(mailtoUrl, '_blank');
  } else {
    alert(`Ce locataire (${tenant.firstName} ${tenant.lastName}) n'a pas d'adresse email renseignée.`);
  }

  // EmailJS en complément si configuré
  if (PUBLIC_KEY && SERVICE_ID && TEMPLATE_ID) {
    sendEmailNotification(tenant.email, subject, bodyText);
  }
}

/**
 * Envoie le règlement intérieur et/ou le mandat au locataire.
 * Ouvre le client email avec les liens de téléchargement dans le corps.
 */
export function sendDocumentsToTenant(tenant: Tenant, reglementUrl?: string, mandatUrl?: string): void {
  if (!reglementUrl && !mandatUrl) {
    alert("Aucun document uploadé. Allez dans Données & Admin → Administrateur pour uploader le règlement intérieur et le mandat.");
    return;
  }
  if (!tenant.email) {
    alert(`Ce locataire (${tenant.firstName} ${tenant.lastName}) n'a pas d'adresse email renseignée.`);
    return;
  }

  const boxes = tenant.rentedBoxes.map(rb => `Box #${rb.boxId.replace('box-', '')}`).join(', ');
  const subject = 'Documents BEEBOX LAON - Règlement intérieur et mandat';
  const lines = [
    `Cher/Chère ${tenant.firstName} ${tenant.lastName},`,
    '',
    `Veuillez trouver ci-dessous les documents relatifs à votre location (${boxes}) chez BEEBOX LAON.`,
    '',
  ];

  if (reglementUrl) {
    lines.push(`Règlement intérieur : ${reglementUrl}`);
  }
  if (mandatUrl) {
    lines.push(`Mandat de location : ${mandatUrl}`);
  }

  lines.push('', 'Cordialement,', 'BEEBOX LAON');

  const bodyText = lines.join('\n');
  const mailtoUrl = `mailto:${tenant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.open(mailtoUrl, '_blank');
}
