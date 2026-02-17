/**
 * Servizio per l'invio di SMS tramite Twilio
 */

import twilio from 'twilio';

// Inizializza il client Twilio se sono presenti le credenziali
let twilioClient: twilio.Twilio | null = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('Client Twilio inizializzato con successo');
  } catch (error) {
    console.error('Errore nell\'inizializzazione del client Twilio:', error);
  }
} else {
  console.log('Credenziali Twilio non configurate, invio SMS disabilitato');
}

export { twilioClient };