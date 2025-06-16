/**
 * Test specifico per verificare il sistema di promemoria per Marco Berto
 */

const fs = require('fs');

function testMarcoBertoReminder() {
  console.log('🔍 TEST PROMEMORIA MARCO BERTO - AVVIO');
  
  try {
    // Carica dati storage
    const storageData = JSON.parse(fs.readFileSync('./storage_data.json', 'utf8'));
    
    // Carica impostazioni email
    const emailSettings = JSON.parse(fs.readFileSync('./email_settings.json', 'utf8'));
    
    console.log('📧 Sistema email attivo:', emailSettings.emailEnabled);
    console.log('📧 Email configurata:', emailSettings.emailAddress);
    
    // Trova Marco Berto
    const marcoBerto = storageData.clients.find(([id, client]) => 
      client.firstName === 'Marco' && client.lastName === 'Berto'
    );
    
    if (!marcoBerto) {
      console.log('❌ Marco Berto non trovato');
      return;
    }
    
    const [clientId, clientData] = marcoBerto;
    console.log('👤 Cliente trovato:', clientData.firstName, clientData.lastName);
    console.log('📧 Email cliente:', clientData.email);
    
    // Trova appuntamento per domani
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const appointment = storageData.appointments.find(([id, apt]) => 
      apt.clientId === clientData.id && apt.date === tomorrowStr
    );
    
    if (!appointment) {
      console.log('❌ Appuntamento per domani non trovato');
      return;
    }
    
    const [aptId, aptData] = appointment;
    console.log('📅 Appuntamento trovato:', {
      id: aptData.id,
      data: aptData.date,
      orario: aptData.startTime,
      clientId: aptData.clientId,
      serviceId: aptData.serviceId
    });
    
    // Trova servizio
    const service = storageData.userServices['3']?.find(s => s.id === aptData.serviceId) ||
                   storageData.userServices['16']?.find(s => s.id === aptData.serviceId);
    
    console.log('🔧 Servizio:', service ? service.name : 'Non trovato');
    
    // Verifica condizioni per invio promemoria
    const now = new Date();
    const aptDateTime = new Date(`${aptData.date}T${aptData.startTime}`);
    const hoursUntilAppointment = (aptDateTime - now) / (1000 * 60 * 60);
    
    console.log('⏰ Ore fino all\'appuntamento:', hoursUntilAppointment.toFixed(2));
    console.log('✅ Promemoria dovrebbe essere inviato:', hoursUntilAppointment > 0 && hoursUntilAppointment <= 25);
    
    // Simula creazione del promemoria
    if (emailSettings.emailEnabled && clientData.email && hoursUntilAppointment > 0 && hoursUntilAppointment <= 25) {
      console.log('📤 PROMEMORIA PRONTO PER INVIO');
      console.log('   Destinatario:', clientData.email);
      console.log('   Cliente:', clientData.firstName, clientData.lastName);
      console.log('   Servizio:', service?.name || 'Sconosciuto');
      console.log('   Data:', aptData.date);
      console.log('   Ora:', aptData.startTime);
    } else {
      console.log('⚠️ Promemoria NON verrà inviato - verificare condizioni');
    }
    
  } catch (error) {
    console.error('❌ Errore durante test:', error);
  }
}

// Esegui test
testMarcoBertoReminder();