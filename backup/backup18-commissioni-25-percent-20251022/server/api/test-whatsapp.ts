import { Request, Response } from 'express';
import { directNotificationService } from '../services/directNotificationService';

export async function testWhatsApp(req: Request, res: Response) {
  try {
    // Otteniamo il numero di telefono configurato per le notifiche
    const notificationPhone = await directNotificationService.getNotificationPhone();
    console.log('Numero di telefono utilizzato per notifiche:', notificationPhone);
    
    // Recuperiamo le informazioni di contatto per vedere i numeri disponibili
    const contactService = await import('../services/contactService');
    const contactInfo = contactService.contactService.getContactInfo();
    
    // Creiamo un messaggio di test
    const message = "Questo è un messaggio di test per WhatsApp";
    
    // Creiamo un link WhatsApp per un numero specifico
    const clientNumber = '+393472550110'; // Numero di telefono del cliente Zambelli
    const whatsappLink = directNotificationService.generateWhatsAppLink(clientNumber, message);
    
    // Rispondiamo con tutte le informazioni utili per il debug
    res.json({
      success: true,
      message: 'Test completato con successo',
      data: {
        // Informazioni sul mittente (professionista)
        settingsPreferredContactPhone: 'secondary', // Come configurato nelle impostazioni
        contactInfo: {
          phone1: contactInfo.phone1,
          phone2: contactInfo.phone2
        },
        notificationPhoneUsed: notificationPhone,
        
        // Informazioni sul destinatario (cliente)
        clientNumber,
        
        // Link generato
        whatsappLink,
        whatsappMessage: message
      }
    });
  } catch (error) {
    console.error('Errore durante il test:', error);
    res.status(500).json({
      success: false,
      message: 'Si è verificato un errore durante il test'
    });
  }
}