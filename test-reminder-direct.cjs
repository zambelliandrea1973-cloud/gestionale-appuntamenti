/**
 * Test diretto del sistema di promemoria senza autenticazione
 */

const fs = require('fs');

async function testReminderDirect() {
  try {
    // Simula la funzione processReminders direttamente
    console.log('🔧 Test diretto del sistema di promemoria...');
    
    // Carica i dati
    const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
    const emailConfig = JSON.parse(fs.readFileSync('email_settings.json', 'utf8'));
    
    console.log('📧 Configurazione email:', {
      enabled: emailConfig.emailEnabled,
      address: emailConfig.emailAddress ? '***@' + emailConfig.emailAddress.split('@')[1] : 'Non configurato',
      hasPassword: !!emailConfig.emailPassword,
      hasTemplate: !!emailConfig.emailTemplate
    });
    
    // Simula il controllo degli appuntamenti
    const now = new Date();
    const appointments = storageData.appointments || [];
    
    console.log(`📅 Ora attuale: ${now.toISOString()}`);
    console.log(`📋 Appuntamenti totali: ${appointments.length}`);
    
    let eligibleCount = 0;
    const eligibleAppointments = [];
    
    for (const [id, appointment] of appointments) {
      // Verifica le condizioni per il promemoria
      if (!appointment.reminderType || appointment.reminderStatus === 'sent') {
        continue;
      }
      
      const apptDate = new Date(appointment.date + 'T' + appointment.startTime);
      const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff >= 23 && hoursDiff <= 25) {
        eligibleCount++;
        eligibleAppointments.push({
          id: appointment.id,
          clientId: appointment.clientId,
          date: appointment.date,
          startTime: appointment.startTime,
          reminderType: appointment.reminderType,
          hoursDiff: hoursDiff.toFixed(1)
        });
        
        // Trova il cliente
        const client = storageData.clients.find(([clientId, clientData]) => 
          clientId === appointment.clientId
        );
        
        if (client) {
          const clientData = client[1];
          console.log(`✅ Appuntamento ${appointment.id} IDONEO:`);
          console.log(`   Cliente: ${clientData.firstName} ${clientData.lastName} (${clientData.email})`);
          console.log(`   Data/Ora: ${appointment.date} ${appointment.startTime}`);
          console.log(`   Ore rimanenti: ${hoursDiff.toFixed(1)}`);
          console.log(`   Tipo promemoria: ${appointment.reminderType}`);
          
          // Simula l'invio email se è il tipo corretto
          if (appointment.reminderType === 'email' && clientData.email && emailConfig.emailEnabled) {
            console.log(`📧 SIMULAZIONE: Invio email a ${clientData.email}`);
            console.log(`   Oggetto: ${emailConfig.emailSubject.replace('{{data}}', appointment.date)}`);
            console.log(`   Template disponibile: ${!!emailConfig.emailTemplate}`);
            
            // Test della configurazione email
            if (emailConfig.emailAddress && emailConfig.emailPassword) {
              console.log(`   ✅ Configurazione email completa - L'email VERREBBE INVIATA`);
            } else {
              console.log(`   ❌ Configurazione email incompleta`);
            }
          }
        }
      }
    }
    
    console.log(`\n📊 Risultato finale:`);
    console.log(`   Appuntamenti idonei: ${eligibleCount}`);
    console.log(`   Configurazione email OK: ${emailConfig.emailEnabled && emailConfig.emailAddress && emailConfig.emailPassword}`);
    
    if (eligibleCount > 0 && emailConfig.emailEnabled) {
      console.log(`\n✅ IL SISTEMA DOVREBBE INVIARE ${eligibleCount} PROMEMORIA EMAIL`);
    } else if (eligibleCount === 0) {
      console.log(`\n⏰ Nessun appuntamento nel range 23-25 ore`);
    } else {
      console.log(`\n❌ Configurazione email non completa`);
    }
    
  } catch (error) {
    console.error('❌ Errore nel test:', error.message);
  }
}

testReminderDirect();