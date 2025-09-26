#!/usr/bin/env node

/**
 * SCRIPT DI MIGRAZIONE SISTEMA UNIFICATO DATABASE
 * 
 * Migra tutti i dati da storage_data.json a PostgreSQL
 * e elimina le dipendenze dal file JSON per creare
 * una singola fonte di verità.
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 AVVIO MIGRAZIONE SISTEMA UNIFICATO DATABASE');
console.log('===============================================');

/**
 * Step 1: Analizza i dati esistenti nel JSON
 */
function analyzeJsonData() {
  const jsonPath = path.join(process.cwd(), 'storage_data.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.log('❌ File storage_data.json non trovato');
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log('📊 ANALISI DATI JSON:');
    console.log(`  📅 Appuntamenti: ${data.appointments?.length || 0}`);
    console.log(`  👥 Clienti: ${data.clients?.length || 0}`);
    console.log(`  🛠️ Servizi: ${data.services?.length || 0}`);
    console.log(`  👨‍⚕️ Staff: ${data.staff?.length || 0}`);
    console.log(`  🏠 Sale trattamento: ${data.treatmentRooms?.length || 0}`);
    
    return data;
  } catch (error) {
    console.error('❌ Errore lettura JSON:', error);
    return null;
  }
}

/**
 * Step 2: Genera gli script SQL per la migrazione
 */
function generateMigrationSQL(jsonData) {
  if (!jsonData) return null;

  console.log('\n🔄 GENERAZIONE SCRIPT SQL...');
  
  const sqlCommands = [];
  
  // Migrazione clienti
  if (jsonData.clients && jsonData.clients.length > 0) {
    console.log(`  👥 Preparazione migrazione ${jsonData.clients.length} clienti...`);
    
    jsonData.clients.forEach(clientEntry => {
      const client = clientEntry[1]; // Il dato è nel formato [id, data]
      
      if (client && client.ownerId) {
        const sql = `
INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  ${client.id},
  ${client.ownerId},
  ${client.firstName ? `'${client.firstName.replace(/'/g, "''")}'` : 'NULL'},
  ${client.lastName ? `'${client.lastName.replace(/'/g, "''")}'` : 'NULL'},
  ${client.phone ? `'${client.phone}'` : 'NULL'},
  ${client.email ? `'${client.email}'` : 'NULL'},
  ${client.address ? `'${client.address.replace(/'/g, "''")}'` : 'NULL'},
  ${client.birthday ? `'${client.birthday}'` : 'NULL'},
  ${client.notes ? `'${client.notes.replace(/'/g, "''")}'` : 'NULL'},
  ${client.isFrequent || false},
  ${client.medicalNotes ? `'${client.medicalNotes.replace(/'/g, "''")}'` : 'NULL'},
  ${client.allergies ? `'${client.allergies.replace(/'/g, "''")}'` : 'NULL'},
  ${client.hasConsent || false},
  ${client.ownerId},
  ${client.assignmentCode ? `'${client.assignmentCode}'` : 'NULL'},
  ${client.uniqueCode ? `'${client.uniqueCode}'` : 'NULL'}
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";`;
        
        sqlCommands.push(sql);
      }
    });
  }
  
  // Migrazione appuntamenti
  if (jsonData.appointments && jsonData.appointments.length > 0) {
    console.log(`  📅 Preparazione migrazione ${jsonData.appointments.length} appuntamenti...`);
    
    jsonData.appointments.forEach(appointmentEntry => {
      const appointment = appointmentEntry[1];
      
      if (appointment && appointment.userId) {
        const sql = `
INSERT INTO appointments (
  user_id, client_id, service_id, staff_id, room_id,
  date, start_time, end_time, notes, status,
  reminder_type, reminder_status, reminder_sent
) VALUES (
  ${appointment.userId},
  ${appointment.clientId},
  ${appointment.serviceId},
  ${appointment.staffId || 'NULL'},
  ${appointment.roomId || 'NULL'},
  '${appointment.date}',
  '${appointment.startTime}',
  '${appointment.endTime}',
  ${appointment.notes ? `'${appointment.notes.replace(/'/g, "''")}'` : 'NULL'},
  '${appointment.status || 'scheduled'}',
  ${appointment.reminderType ? `'${appointment.reminderType}'` : 'NULL'},
  '${appointment.reminderStatus || 'pending'}',
  ${appointment.reminderSent || false}
) ON CONFLICT DO NOTHING;`;
        
        sqlCommands.push(sql);
      }
    });
  }
  
  return sqlCommands;
}

/**
 * Step 3: Crea backup del JSON prima della migrazione
 */
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `storage_data_backup_before_unified_migration_${timestamp}.json`;
  
  try {
    fs.copyFileSync('storage_data.json', backupName);
    console.log(`✅ Backup creato: ${backupName}`);
    return backupName;
  } catch (error) {
    console.error('❌ Errore creazione backup:', error);
    return null;
  }
}

/**
 * MAIN: Esegue la migrazione completa
 */
async function main() {
  console.log('🔍 Step 1: Analisi dati esistenti...');
  const jsonData = analyzeJsonData();
  
  if (!jsonData) {
    console.log('⚠️ Nessun dato da migrare trovato nel JSON');
    return;
  }
  
  console.log('\n💾 Step 2: Creazione backup...');
  const backupFile = createBackup();
  
  if (!backupFile) {
    console.log('❌ Impossibile creare backup, migrazione annullata');
    return;
  }
  
  console.log('\n🔄 Step 3: Generazione script SQL...');
  const sqlCommands = generateMigrationSQL(jsonData);
  
  if (!sqlCommands || sqlCommands.length === 0) {
    console.log('⚠️ Nessun comando SQL generato');
    return;
  }
  
  // Salva gli script SQL per l'esecuzione manuale
  const sqlFile = `migration_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
  fs.writeFileSync(sqlFile, sqlCommands.join('\n\n'));
  console.log(`✅ Script SQL salvato in: ${sqlFile}`);
  
  console.log('\n📋 PROSSIMI PASSI:');
  console.log('1. Eseguire lo script SQL nel database PostgreSQL');
  console.log('2. Verificare che tutti i dati siano stati migrati correttamente');
  console.log('3. Aggiornare il codice per rimuovere dipendenze dal JSON');
  console.log('4. Disattivare il sistema MemStorage');
  
  console.log('\n✅ MIGRAZIONE PREPARATA CON SUCCESSO!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { analyzeJsonData, generateMigrationSQL, createBackup };