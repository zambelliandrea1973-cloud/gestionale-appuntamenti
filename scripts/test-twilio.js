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

// Numero di telefono da modificare secondo necessità
const testPhoneNumber = '+393459318970'; // Modifica con il numero di test verificato su Twilio

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

// Verifica se l'account è di prova (trial)
async function checkTrialStatus() {
  try {
    const account = await client.api.accounts(accountSid).fetch();
    const isTrial = account.type === 'Trial';
    
    console.log(`\nTipo di account Twilio: ${account.type}`);
    
    if (isTrial) {
      console.log(`
⚠️  LIMITAZIONI ACCOUNT DI PROVA (TRIAL)  ⚠️
---------------------------------------
Gli account di prova Twilio possono inviare messaggi SOLO a numeri di telefono verificati.

Per utilizzare l'account di prova:
1. Accedi al tuo account Twilio su https://www.twilio.com/login
2. Vai a https://www.twilio.com/console/phone-numbers/verified
3. Aggiungi e verifica il numero ${testPhoneNumber}
4. Oppure modifica questo script per usare un numero già verificato

Per rimuovere questa limitazione:
- Aggiorna il tuo account Twilio a un account completo
- Acquista un numero Twilio per l'invio dei messaggi
`);
    }
    
    return isTrial;
  } catch (error) {
    console.log('\n⚠️ Impossibile determinare il tipo di account Twilio.');
    return true; // Presumi che sia un trial account per sicurezza
  }
}

// Funzione per inviare un SMS di test
async function sendTestSMS(isTrialAccount) {
  try {
    console.log('\nInvio SMS di test in corso...');
    
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
    
    // Gestione specifica degli errori comuni
    if (error.code === 21608) {
      console.log(`
🔴 ERRORE TIPICO DEGLI ACCOUNT DI PROVA: NUMERO NON VERIFICATO
---------------------------------------------------------------
Il numero ${testPhoneNumber} non è verificato nel tuo account Twilio.
Gli account di prova possono inviare messaggi SOLO a numeri verificati.

Per risolvere:
1. Accedi al tuo account Twilio su https://www.twilio.com/login
2. Vai a https://www.twilio.com/console/phone-numbers/verified
3. Clicca su "Add a new Verified Caller ID"
4. Inserisci il numero ${testPhoneNumber} e completa la verifica
5. Esegui nuovamente questo script

In alternativa:
- Acquista un piano Twilio completo per rimuovere questa limitazione
- Usa un numero già verificato modificando la variabile 'testPhoneNumber' in questo script
`);
    } else if (error.code === 21211) {
      console.error('Errore: formato del numero non valido. Assicurati di usare il formato internazionale +[codice paese][numero]');
    } else if (error.code === 20003) {
      console.error('Errore: le credenziali Twilio (SID o Auth Token) non sono valide.');
    }
    
    throw error;
  }
}

// Esegui il test
async function runTest() {
  try {
    const isTrialAccount = await checkTrialStatus();
    await sendTestSMS(isTrialAccount);
    console.log('\nTest completato con successo! 🎉');
  } catch (error) {
    console.log('\nVerifica completata ma l\'invio dell\'SMS è fallito.');
    console.log('Le credenziali Twilio sono state acquisite correttamente dal sistema.');
    process.exit(1);
  }
}

runTest();