/**
 * Verifica del timing per i promemoria email
 */

const fs = require('fs');

function checkReminderSchedule() {
  console.log('📅 VERIFICA SCHEDULE PROMEMORIA MARCO BERTO');
  
  try {
    const storageData = JSON.parse(fs.readFileSync('./storage_data.json', 'utf8'));
    const emailSettings = JSON.parse(fs.readFileSync('./email_settings.json', 'utf8'));
    
    // Trova Marco Berto e il suo appuntamento
    const marcoBerto = storageData.clients.find(([id, client]) => 
      client.firstName === 'Marco' && client.lastName === 'Berto'
    );
    
    if (!marcoBerto) {
      console.log('❌ Marco Berto non trovato');
      return;
    }
    
    const [clientId, clientData] = marcoBerto;
    const appointment = storageData.appointments.find(([id, apt]) => 
      apt.clientId === clientData.id
    );
    
    if (!appointment) {
      console.log('❌ Appuntamento non trovato');
      return;
    }
    
    const [aptId, aptData] = appointment;
    
    // Calcoli temporali
    const now = new Date();
    const aptDateTime = new Date(`${aptData.date}T${aptData.startTime}`);
    const hoursUntilAppointment = (aptDateTime - now) / (1000 * 60 * 60);
    const minutesUntilAppointment = (aptDateTime - now) / (1000 * 60);
    
    // Calcola quando inizierà la finestra di invio (25 ore prima)
    const reminderWindowStart = new Date(aptDateTime.getTime() - (25 * 60 * 60 * 1000));
    const hoursUntilReminderWindow = (reminderWindowStart - now) / (1000 * 60 * 60);
    
    console.log('⏰ TIMING DETTAGLIATO:');
    console.log(`   Ora attuale: ${now.toLocaleString('it-IT')}`);
    console.log(`   Appuntamento: ${aptDateTime.toLocaleString('it-IT')}`);
    console.log(`   Ore fino appuntamento: ${hoursUntilAppointment.toFixed(2)}`);
    console.log(`   Minuti fino appuntamento: ${minutesUntilAppointment.toFixed(0)}`);
    console.log('');
    console.log('📮 FINESTRA INVIO PROMEMORIA:');
    console.log(`   Inizia alle: ${reminderWindowStart.toLocaleString('it-IT')}`);
    console.log(`   Ore fino inizio finestra: ${hoursUntilReminderWindow.toFixed(2)}`);
    console.log('');
    
    if (hoursUntilAppointment <= 25 && hoursUntilAppointment > 0) {
      console.log('✅ PROMEMORIA ATTIVO - Email verrà inviata al prossimo controllo (ogni ora)');
    } else if (hoursUntilReminderWindow > 0) {
      console.log(`⏳ PROMEMORIA IN ATTESA - Sarà attivato tra ${hoursUntilReminderWindow.toFixed(2)} ore`);
      
      // Calcola il prossimo controllo scheduler
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1);
      nextHour.setMinutes(0);
      nextHour.setSeconds(0);
      nextHour.setMilliseconds(0);
      
      console.log(`   Prossimo controllo scheduler: ${nextHour.toLocaleString('it-IT')}`);
      
      // Verifica se il prossimo controllo sarà nella finestra
      const hoursFromNextCheckToAppointment = (aptDateTime - nextHour) / (1000 * 60 * 60);
      if (hoursFromNextCheckToAppointment <= 25 && hoursFromNextCheckToAppointment > 0) {
        console.log('🎯 PROSSIMO CONTROLLO INVIERÀ IL PROMEMORIA!');
      }
    } else {
      console.log('❌ Appuntamento scaduto o fuori finestra');
    }
    
    console.log('');
    console.log('🔧 CONFIGURAZIONE SISTEMA:');
    console.log(`   Email abilitata: ${emailSettings.emailEnabled}`);
    console.log(`   Email mittente: ${emailSettings.emailAddress}`);
    console.log(`   Email destinatario: ${clientData.email}`);
    console.log(`   Scheduler attivo: Ogni ora alle :00`);
    console.log(`   Finestra promemoria: 24-25 ore prima`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

checkReminderSchedule();