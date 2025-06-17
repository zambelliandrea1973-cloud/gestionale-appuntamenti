/**
 * Forza l'invio effettivo del promemoria email
 */

const fs = require('fs');
const nodemailer = require('nodemailer');

async function forceSendReminder() {
  try {
    console.log('🚀 Invio forzato del promemoria email...');
    
    // Carica dati e configurazione
    const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
    const emailConfig = JSON.parse(fs.readFileSync('email_settings.json', 'utf8'));
    
    // Trova l'appuntamento di test
    const testAppointment = storageData.appointments.find(([id, appointment]) => 
      id === 1750148900000
    );
    
    if (!testAppointment) {
      console.log('❌ Appuntamento di test non trovato');
      return;
    }
    
    const appointment = testAppointment[1];
    
    // Trova il cliente
    const client = storageData.clients.find(([id, clientData]) => 
      id === appointment.clientId
    );
    
    if (!client) {
      console.log('❌ Cliente non trovato');
      return;
    }
    
    const clientData = client[1];
    
    console.log('📧 Configurazione email trovata per:', emailConfig.emailAddress);
    console.log('👤 Cliente:', clientData.firstName, clientData.lastName, '(' + clientData.email + ')');
    console.log('📅 Appuntamento:', appointment.date, appointment.startTime);
    
    // Prepara il messaggio usando il template
    let message = emailConfig.emailTemplate
      .replace(/{{nome}}/g, clientData.firstName)
      .replace(/{{cognome}}/g, clientData.lastName)
      .replace(/{{servizio}}/g, 'Consulenza Medica')
      .replace(/{{data}}/g, appointment.date)
      .replace(/{{ora}}/g, appointment.startTime);
    
    let subject = emailConfig.emailSubject
      .replace(/{{data}}/g, appointment.date);
    
    console.log('📝 Oggetto:', subject);
    console.log('📄 Messaggio:', message.substring(0, 100) + '...');
    
    // Crea trasportatore Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.emailAddress,
        pass: emailConfig.emailPassword,
      }
    });
    
    // Verifica connessione
    console.log('🔗 Verifica connessione Gmail...');
    await transporter.verify();
    console.log('✅ Connessione Gmail verificata');
    
    // Prepara email
    const mailOptions = {
      from: emailConfig.emailAddress,
      to: clientData.email,
      subject: subject,
      text: message,
      html: message.replace(/\n/g, '<br>'),
    };
    
    console.log('📨 Invio email in corso...');
    
    // Invia email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ EMAIL INVIATA CON SUCCESSO!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📬 Destinatario:', clientData.email);
    
    // Aggiorna lo stato nell'storage
    const appointmentIndex = storageData.appointments.findIndex(([id, apt]) => id === appointment.id);
    if (appointmentIndex !== -1) {
      storageData.appointments[appointmentIndex][1].reminderStatus = 'sent';
      storageData.appointments[appointmentIndex][1].reminderSentAt = new Date().toISOString();
      
      fs.writeFileSync('storage_data.json', JSON.stringify(storageData, null, 2));
      console.log('💾 Stato appuntamento aggiornato: reminderStatus = "sent"');
    }
    
    console.log('\n🎯 TEST COMPLETATO: Il sistema di promemoria email funziona correttamente!');
    
  } catch (error) {
    console.error('❌ Errore nell\'invio:', error.message);
    if (error.code === 'EAUTH') {
      console.log('🔐 Errore di autenticazione: Verificare username e password Gmail');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 Errore di connessione: Verificare la connessione internet');
    }
  }
}

forceSendReminder();