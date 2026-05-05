// @ts-nocheck
import { Request, Response } from 'express';
import { directNotificationService } from '../services/directNotificationService';

export async function testWhatsApp(req: Request, res: Response) {
  try {
    // Get the phone number configured for notifications
    const notificationPhone = await directNotificationService.getNotificationPhone();
    console.log('Phone number used for notifications:', notificationPhone);
    
    // Retrieve contact information to see available numbers
    const contactService = await import('../services/contactService');
    const contactInfo = contactService.contactService.getContactInfo();
    
    // Create a test message
    const message = "This is a test message for WhatsApp";
    
    // Create a WhatsApp link for a specific number
    const clientNumber = '+393472550110'; // Phone number for client Zambelli
    const whatsappLink = directNotificationService.generateWhatsAppLink(clientNumber, message);
    
    // Respond with all useful information for debugging
    res.json({
      success: true,
      message: 'Test completed successfully',
      data: {
        // Sender information (professional)
        settingsPreferredContactPhone: 'secondary', // As configured in settings
        contactInfo: {
          phone1: contactInfo.phone1,
          phone2: contactInfo.phone2
        },
        notificationPhoneUsed: notificationPhone,
        
        // Recipient information (client)
        clientNumber,
        
        // Link generated
        whatsappLink,
        whatsappMessage: message
      }
    });
  } catch (error: any) {
    console.error('Error during test:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during the test'
    });
  }
}