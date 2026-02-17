#!/usr/bin/env node

/**
 * BACKUP15 - Backup completo prima dell'implementazione delle impostazioni personalizzate per utente
 * Data: 22 Maggio 2025
 * 
 * Questo backup salva lo stato attuale prima di implementare:
 * - Sistema di personalizzazione per ogni utente (logo, tema, integrazioni)
 * - Impostazioni separate per admin, staff, customer
 * - Persistenza delle personalizzazioni per tutta la durata dell'abbonamento
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 BACKUP15 - Backup prima delle impostazioni personalizzate...');

const backupDir = './backup/backup15-settings-personalizzate';

// Crea la directory di backup
if (!fs.existsSync('./backup')) {
  fs.mkdirSync('./backup');
}

if (fs.existsSync(backupDir)) {
  execSync(`rm -rf ${backupDir}`);
}

fs.mkdirSync(backupDir, { recursive: true });

// Lista dei file e directory da copiare
const itemsToBackup = [
  'client/src',
  'server',
  'shared',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'theme.json',
  'drizzle.config.ts'
];

console.log('📁 Copiando files e directory...');

itemsToBackup.forEach(item => {
  if (fs.existsSync(item)) {
    const isDirectory = fs.statSync(item).isDirectory();
    if (isDirectory) {
      execSync(`cp -r ${item} ${backupDir}/`);
      console.log(`✅ Directory copiata: ${item}`);
    } else {
      execSync(`cp ${item} ${backupDir}/`);
      console.log(`✅ File copiato: ${item}`);
    }
  } else {
    console.log(`⚠️  Item non trovato: ${item}`);
  }
});

// Salva informazioni di stato
const backupInfo = {
  timestamp: new Date().toISOString(),
  description: 'Backup15 - Prima dell\'implementazione impostazioni personalizzate per utente',
  features: [
    'Sistema attuale con impostazioni condivise',
    'Funzionalità eliminazione clienti operativa',
    'ID cliente visibile solo agli admin',
    'Sistema di autenticazione multi-tier funzionante',
    '15 account attivi (2 admin, 7 staff, 6 customer)',
    '255 clienti privati distribuiti correttamente'
  ],
  nextSteps: [
    'Implementare tabella user_settings per personalizzazioni',
    'Creare interfaccia gestione impostazioni personalizzate',
    'Permettere upload logo personalizzato per ogni utente',
    'Gestire temi e colori indipendenti',
    'Configurazioni email/WhatsApp separate per utente'
  ],
  accounts: {
    admin: ['zambelli.andrea.1973@gmail.com', 'elisa.faverio@example.com'],
    staff: 7,
    customer: 6,
    totalClients: 255
  }
};

fs.writeFileSync(
  path.join(backupDir, 'backup-info.json'),
  JSON.stringify(backupInfo, null, 2)
);

console.log('✅ Backup15 completato!');
console.log(`📂 Backup salvato in: ${backupDir}`);
console.log('🚀 Pronto per implementare le impostazioni personalizzate per utente!');