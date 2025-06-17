/**
 * Forza l'esecuzione del sistema di promemoria per testare l'invio effettivo
 */

const http = require('http');

async function forceReminderTest() {
  console.log('🚀 Avvio test forzato del sistema di promemoria...');
  
  try {
    // Effettua una richiesta HTTP al server per forzare l'esecuzione dei promemoria
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/force-reminder-check',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📨 Risposta dal server:', res.statusCode);
        if (data) {
          try {
            const result = JSON.parse(data);
            console.log('📊 Risultato:', result);
          } catch (e) {
            console.log('📄 Risposta raw:', data);
          }
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Errore nella richiesta:', error.message);
      console.log('💡 Il server potrebbe non essere in ascolto o l\'endpoint non esiste');
      console.log('💡 Procedo con la verifica diretta del sistema...');
      
      // Se la richiesta HTTP fallisce, verifico lo stato del sistema di promemoria
      testReminderSystem();
    });

    req.end();
    
  } catch (error) {
    console.error('❌ Errore generale:', error.message);
  }
}

async function testReminderSystem() {
  console.log('\n🔍 Verifica diretta del sistema di promemoria...');
  
  // Simulo la logica del sistema di promemoria
  const fs = require('fs');
  const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
  
  const now = new Date();
  const appointments = storageData.appointments || [];
  
  console.log(`📅 Ora attuale: ${now.toISOString()}`);
  console.log(`📋 Appuntamenti totali: ${appointments.length}`);
  
  let eligibleCount = 0;
  
  for (const [id, appointment] of appointments) {
    if (!appointment.reminderType || appointment.reminderStatus === 'sent') {
      continue;
    }
    
    const apptDate = new Date(appointment.date + 'T' + appointment.startTime);
    const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff >= 23 && hoursDiff <= 25) {
      eligibleCount++;
      console.log(`✅ Appuntamento ${id} IDONEO per promemoria:`);
      console.log(`   Cliente: ${appointment.clientId}`);
      console.log(`   Data/Ora: ${appointment.date} ${appointment.startTime}`);
      console.log(`   Ore rimanenti: ${hoursDiff.toFixed(1)}`);
      console.log(`   Tipo promemoria: ${appointment.reminderType}`);
    }
  }
  
  console.log(`\n📊 Appuntamenti idonei per promemoria: ${eligibleCount}`);
  
  if (eligibleCount > 0) {
    console.log('✅ Il sistema DOVREBBE inviare promemoria');
  } else {
    console.log('❌ Nessun appuntamento nel range temporale corretto');
  }
}

forceReminderTest();