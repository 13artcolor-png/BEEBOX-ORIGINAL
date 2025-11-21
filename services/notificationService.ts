import { AdminUser, Tenant } from '../types';

/**
 * Simule l'envoi d'une notification par email.
 * Dans une application réelle, cette fonction appellerait une API backend
 * pour envoyer un véritable email.
 * @param toEmail - L'adresse email du destinataire.
 * @param subject - Le sujet de l'email.
 * @param body - Le corps de l'email.
 */
export function sendEmailNotification(toEmail: string, subject: string, body: string): void {
  console.log("--- NOUVELLE NOTIFICATION EMAIL (SIMULATION) ---");
  console.log(`Destinataire: ${toEmail}`);
  console.log(`Sujet: [BEEBOX LAON] ${subject}`);
  console.log(`Message: ${body}`);
  console.log("-----------------------------------------------");
  // Dans une vraie application :
  // fetch('/api/send-email', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ to, subject, body })
  // });
}


/**
 * Envoie un email de rappel de paiement à un locataire.
 * @param tenant - L'objet locataire.
 * @param admin - L'objet administrateur pour l'email de contact.
 */
export function sendPaymentReminder(tenant: Tenant, admin: AdminUser): void {
    const dueDate = tenant.nextDueDate ? new Date(tenant.nextDueDate).toLocaleDateString('fr-FR') : 'inconnue';
    const totalRent = tenant.rentedBoxes.reduce((acc, box) => acc + box.price, 0) + tenant.unpaidRent;
    
    const subject = "Rappel de Paiement de Loyer - BEEBOX LAON";
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
    `;

    sendEmailNotification(tenant.email, subject, body);
}