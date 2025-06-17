/**
 * Test specifico per l'appuntamento nel range temporale corretto
 */

const fs = require('fs');

async function testSpecificAppointment() {
  try {
    const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
    
    // Trova l'appuntamento di test
    const testAppointment = storageData.appointments.find(([id, appointment]) => 
      id === 1750148900000
    );
    
    if (!testAppointment) {
      console.log('❌ Appuntamento di test non trovato');
      return;
    }
    
    const appointment = testAppointment[1];
    console.log('✅ Appuntamento test trovato:', {
      id: appointment.id,
      clientId: appointment.clientId,
      date: appointment.date,
      startTime: appointment.startTime,
      reminderType: appointment.reminderType,
      notes: appointment.notes
    });
    
    // Calcola se è nel range temporale
    const now = new Date();
    const apptDate = new Date(appointment.date + 'T' + appointment.startTime);
    const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log('📅 Analisi temporale:');
    console.log('  Ora attuale:', now.toISOString());
    console.log('  Appuntamento:', apptDate.toISOString());
    console.log('  Ore di differenza:', hoursDiff.toFixed(1));
    console.log('  Nel range 23-25 ore?', hoursDiff >= 23 && hoursDiff <= 25 ? '✅ SÌ' : '❌ NO');
    
    // Verifica configurazione email dal file separato
    let emailConfig = null;
    try {
      emailConfig = JSON.parse(fs.readFileSync('email_settings.json', 'utf8'));
      console.log('📧 Configurazione email trovata:', {
        enabled: emailConfig.emailEnabled,
        address: emailConfig.emailAddress ? '***@' + emailConfig.emailAddress.split('@')[1] : 'Non configurato',
        hasPassword: !!emailConfig.emailPassword
      });
    } catch (error) {
      console.log('❌ Configurazione email non trovata nel file separato');
    }
    
    const canSendReminder = appointment.reminderType && 
                           appointment.reminderStatus !== 'sent' && 
                           hoursDiff >= 23 && hoursDiff <= 25 &&
                           emailConfig && emailConfig.emailEnabled;
                           
    console.log('\n🎯 Risultato finale:', canSendReminder ? '✅ PROMEMORIA DOVREBBE ESSERE INVIATO' : '❌ PROMEMORIA NON VERRÀ INVIATO');
    
  } catch (error) {
    console.error('❌ Errore nel test:', error.message);
  }
}

testSpecificAppointment();