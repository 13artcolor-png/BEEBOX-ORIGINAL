import emailjs from '@emailjs/browser';
import { AdminUser, Tenant } from '../types';

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
 */
export function sendPaymentReminder(tenant: Tenant, admin: AdminUser): void {
  const dueDate = tenant.nextDueDate
    ? new Date(tenant.nextDueDate).toLocaleDateString('fr-FR')
    : 'inconnue';
  const totalRent = tenant.rentedBoxes.reduce((acc, box) => acc + box.price, 0) + tenant.unpaidRent;

  const subject = 'Rappel de Paiement de Loyer - BEEBOX LAON';
  const body = `
Cher/Chère ${tenant.firstName} ${tenant.lastName},

Ceci est un rappel concernant le paiement de votre loyer pour votre box de stockage chez BEEBOX LAON.
Votre prochaine échéance est le ${dueDate}.

Montant dû : ${totalRent.toFixed(2)} €

Veuillez procéder au paiement dès que possible pour éviter tout désagrément.

Si vous avez déjà effectué le paiement, veuillez ignorer ce message.

Pour toute question, veuillez nous contacter à ${admin.email}.

Cordialement,
L'équipe de BEEBOX LAON
  `.trim();

  sendEmailNotification(tenant.email, subject, body);
}
