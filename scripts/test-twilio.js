/**
 * Script di test per verificare la configurazione Twilio
 * 
 * Uso:
 * node scripts/test-twilio.js
 */

// Importa la libreria Twilio (sintassi ES modules)
import twilio from 'twilio';

// Configura il client Twilio utilizzando le variabili d'ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('=== TEST CONFIGURAZIONE TWILIO ===');
console.log('Verifica delle credenziali:');
console.log(`TWILIO_ACCOUNT_SID: ${accountSid ? '✓ Configurato' : '✗ Mancante'}`);
console.log(`TWILIO_AUTH_TOKEN: ${authToken ? '✓ Configurato' : '✗ Mancante'}`);
console.log(`TWILIO_PHONE_NUMBER: ${twilioPhoneNumber ? '✓ Configurato' : '✗ Mancante'}`);

// Esci se mancano le credenziali
if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('\n❌ Test fallito: mancano una o più credenziali Twilio.');
  process.exit(1);
}

// Inizializza il client Twilio
const client = twilio(accountSid, authToken);

// Funzione per inviare un SMS di test
async function sendTestSMS() {
  try {
    console.log('\nInvio SMS di test in corso...');
    
    // Numero di telefono da modificare secondo necessità
    const testPhoneNumber = '+393459318970'; // Modifica con il tuo numero di test
    
    // Invia il messaggio
    const message = await client.messages.create({
      body: 'Questo è un messaggio di test da Twilio per verificare la configurazione',
      from: twilioPhoneNumber,
      to: testPhoneNumber
    });
    
    console.log(`\n✅ SMS inviato con successo!`);
    console.log(`SID: ${message.sid}`);
    console.log(`Stato: ${message.status}`);
    console.log(`Da: ${message.from}`);
    console.log(`A: ${message.to}`);
    console.log(`Corpo: ${message.body}`);
    
    return message;
  } catch (error) {
    console.error('\n❌ Errore nell\'invio del SMS:', error.message);
    if (error.code) {
      console.error('Codice errore:', error.code);
    }
    
    // Suggerimenti comuni per la risoluzione dei problemi
    console.log('\nSuggerimenti per la risoluzione:');
    console.log('1. Verifica che il numero di telefono Twilio sia abilitato per SMS');
    console.log('2. Verifica che il SID dell\'account e il token di autenticazione siano corretti');
    console.log('3. Se stai utilizzando un trial account, assicurati che il numero di destinazione sia verificato');
    
    throw error;
  }
}

// Esegui il test
sendTestSMS()
  .then(() => {
    console.log('\nTest completato con successo! 🎉');
  })
  .catch(() => {
    console.log('\nTest fallito. Verifica le credenziali e le impostazioni Twilio.');
    process.exit(1);
  });