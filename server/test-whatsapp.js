/**
 * Script semplice per testare la generazione di WhatsApp link
 * usando il nuovo parametro preferredContactPhone
 */

import { directNotificationService } from './services/directNotificationService.js';

// Simuliamo il caso in cui useContactPhoneForNotifications = true 
// e preferredContactPhone = 'secondary'
directNotificationService.getNotificationPhone()
  .then(phone => {
    console.log('Numero di telefono utilizzato per notifiche:', phone);
    
    const message = "Questo è un messaggio di test per WhatsApp";
    const link = directNotificationService.generateWhatsAppLink(
      '+393472550110', // Numero di destinazione (cliente)
      message
    );
    
    console.log('WhatsApp link generated:', link);
    console.log('You can click this link to open WhatsApp and send the message');
  })
  .catch(error => {
    console.error('Error during test:', error);
  });