#!/usr/bin/env node

/**
 * CREAZIONE NUOVA ARCHITETTURA LINEARE
 * Basata su backup15 funzionante con sistema abbonamenti semplificato
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Creazione nuova architettura lineare...');

// Ripristina la struttura funzionante dal backup15
const backupDir = './backup/backup15-settings-personalizzate';

if (!fs.existsSync(backupDir)) {
  console.error('❌ Backup15 non trovato');
  process.exit(1);
}

console.log('📋 Ripristinando struttura dal backup15...');

// Sostituisci i file correnti con quelli del backup funzionante
const itemsToRestore = [
  'shared/schema.ts',
  'server/storage.ts', 
  'server/routes.ts',
  'server/auth.ts',
  'client/src'
];

itemsToRestore.forEach(item => {
  const backupPath = `${backupDir}/${item}`;
  if (fs.existsSync(backupPath)) {
    if (fs.existsSync(item)) {
      execSync(`rm -rf ${item}`);
    }
    
    const isDirectory = fs.statSync(backupPath).isDirectory();
    if (isDirectory) {
      execSync(`cp -r ${backupPath} ${item}`);
    } else {
      execSync(`cp ${backupPath} ${item}`);
    }
    console.log(`✅ Ripristinato: ${item}`);
  }
});

console.log('✅ Architettura lineare ripristinata dal backup15 funzionante!');
console.log('🔧 Ora implemento il sistema abbonamenti semplificato...');