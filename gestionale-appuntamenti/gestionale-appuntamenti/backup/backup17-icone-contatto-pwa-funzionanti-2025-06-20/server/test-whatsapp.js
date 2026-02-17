/**
 * Script semplice per testare la generazione di link WhatsApp
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
    
    console.log('Link WhatsApp generato:', link);
    console.log('Puoi fare clic su questo link per aprire WhatsApp e inviare il messaggio');
  })
  .catch(error => {
    console.error('Errore durante il test:', error);
  });