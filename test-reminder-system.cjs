/**
 * Script per testare il sistema di promemoria
 * Verifica se l'appuntamento di Marco Berto viene rilevato per l'invio del promemoria
 */

const fs = require('fs');

async function testReminderSystem() {
  try {
    // Carica i dati dal file storage
    const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
    
    // Trova l'appuntamento di Marco Berto
    const marcoBertoAppointment = storageData.appointments.find(([id, appointment]) => 
      id === 1750059544768
    );
    
    if (!marcoBertoAppointment) {
      console.log('❌ Appuntamento di Marco Berto non trovato');
      return;
    }
    
    const appointment = marcoBertoAppointment[1];
    console.log('✅ Appuntamento trovato:', {
      id: appointment.id,
      clientId: appointment.clientId,
      date: appointment.date,
      startTime: appointment.startTime,
      reminderType: appointment.reminderType,
      reminderStatus: appointment.reminderStatus
    });
    
    // Trova il cliente Marco Berto
    const client = storageData.clients.find(([id, client]) => 
      id === appointment.clientId
    );
    
    if (!client) {
      console.log('❌ Cliente non trovato');
      return;
    }
    
    const clientData = client[1];
    console.log('✅ Cliente trovato:', {
      id: clientData.id,
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      email: clientData.email,
      phone: clientData.phone
    });
    
    // Calcola se l'appuntamento è nelle prossime 24-25 ore
    const now = new Date();
    const apptDate = new Date(appointment.date + 'T' + appointment.startTime);
    const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log('📅 Analisi temporale:');
    console.log('  Ora attuale:', now.toISOString());
    console.log('  Appuntamento:', apptDate.toISOString());
    console.log('  Ore di differenza:', hoursDiff.toFixed(1));
    console.log('  Nel range 23-25 ore?', hoursDiff >= 23 && hoursDiff <= 25 ? '✅ SÌ' : '❌ NO');
    
    // Verifica configurazione email
    const emailSettings = storageData.settings?.find(([key, setting]) => 
      key === 'emailCalendarSettings'
    );
    
    if (emailSettings) {
      const emailConfig = JSON.parse(emailSettings[1].value);
      console.log('📧 Configurazione email:', {
        enabled: emailConfig.emailEnabled,
        address: emailConfig.emailAddress ? '***@' + emailConfig.emailAddress.split('@')[1] : 'Non configurato',
        hasPassword: emailConfig.hasPasswordSaved || false
      });
    } else {
      console.log('❌ Configurazione email non trovata');
    }
    
    // Test manuale del processo di invio
    console.log('\n🔍 Test condizioni per promemoria:');
    console.log('  ✓ reminderType presente:', !!appointment.reminderType);
    console.log('  ✓ reminderStatus non "sent":', appointment.reminderStatus !== 'sent');
    console.log('  ✓ Cliente ha email:', !!clientData.email);
    console.log('  ✓ Nel range temporale:', hoursDiff >= 23 && hoursDiff <= 25);
    
    const canSendReminder = appointment.reminderType && 
                           appointment.reminderStatus !== 'sent' && 
                           clientData.email && 
                           hoursDiff >= 23 && hoursDiff <= 25;
                           
    console.log('\n🎯 Risultato finale:', canSendReminder ? '✅ PROMEMORIA DOVREBBE ESSERE INVIATO' : '❌ PROMEMORIA NON VERRÀ INVIATO');
    
  } catch (error) {
    console.error('❌ Errore nel test:', error.message);
  }
}

testReminderSystem();