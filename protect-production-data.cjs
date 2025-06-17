/**
 * Sistema di protezione per prevenire modifiche accidentali ai dati di produzione
 */

const fs = require('fs');

function createProductionBackup() {
  const timestamp = Date.now();
  const backupFileName = `storage_data_backup_${timestamp}.json`;
  
  try {
    const storageData = fs.readFileSync('storage_data.json', 'utf8');
    fs.writeFileSync(backupFileName, storageData);
    
    console.log(`✅ Backup di produzione creato: ${backupFileName}`);
    console.log(`📊 Dati protetti:`);
    
    const data = JSON.parse(storageData);
    console.log(`   - Clienti: ${data.clients?.length || 0}`);
    console.log(`   - Appuntamenti: ${data.appointments?.length || 0}`);
    console.log(`   - Servizi: ${data.services?.length || 0}`);
    
    return backupFileName;
    
  } catch (error) {
    console.error('❌ Errore nella creazione del backup:', error.message);
    return null;
  }
}

function validateDataIntegrity() {
  try {
    const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
    
    console.log('🔍 Verifica integrità dati corrente:');
    
    // Verifica appuntamento Marco Berto per oggi
    const todayAppointments = storageData.appointments.filter(([id, appointment]) => 
      appointment.date === '2025-06-17' && appointment.clientId === 252
    );
    
    if (todayAppointments.length > 0) {
      const marcoBerto = todayAppointments[0][1];
      console.log(`✅ Appuntamento Marco Berto trovato:`);
      console.log(`   Data: ${marcoBerto.date} ore ${marcoBerto.startTime}`);
      console.log(`   Stato: ${marcoBerto.status}`);
    } else {
      console.log('⚠️ PROBLEMA: Appuntamento Marco Berto per oggi non trovato!');
    }
    
    // Statistiche generali
    console.log(`📊 Statistiche generali:`);
    console.log(`   - Clienti totali: ${storageData.clients?.length || 0}`);
    console.log(`   - Appuntamenti totali: ${storageData.appointments?.length || 0}`);
    console.log(`   - Appuntamenti oggi: ${storageData.appointments.filter(([id, apt]) => apt.date === '2025-06-17').length}`);
    console.log(`   - Appuntamenti domani: ${storageData.appointments.filter(([id, apt]) => apt.date === '2025-06-18').length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Errore nella verifica:', error.message);
    return false;
  }
}

// Esegue protezione
console.log('🔒 Sistema di protezione dati di produzione');
console.log('==========================================');

const backupFile = createProductionBackup();
if (backupFile) {
  console.log(`\n💾 Backup salvato come: ${backupFile}`);
}

console.log('\n🔍 Verifica stato attuale:');
validateDataIntegrity();

console.log('\n📋 Per il futuro:');
console.log('   - Prima di test che modificano dati, creare backup');
console.log('   - Dopo i test, verificare che i dati siano corretti');
console.log('   - In caso di problemi, ripristinare dal backup più recente');