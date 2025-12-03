#!/usr/bin/env node

/**
 * Script di installazione automatica per il Gestionale Sanitario
 */

const fs = require('fs');
const path = require('path');
import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🏥 Installazione Gestionale Sanitario');
console.log('=====================================\n');

async function install() {
  try {
    // 1. Verifica prerequisiti
    console.log('1. Verifica prerequisiti...');
    checkPrerequisites();
    
    // 2. Installazione dipendenze
    console.log('2. Installazione dipendenze...');
    execSync('npm install', { stdio: 'inherit' });
    
    // 3. Configurazione database
    console.log('3. Configurazione database...');
    await configureDatabasePrompt();
    
    // 4. Configurazione admin
    console.log('4. Configurazione amministratore...');
    await configureAdminPrompt();
    
    // 5. Build del progetto
    console.log('5. Build del progetto...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // 6. Test dell'installazione
    console.log('6. Test dell\'installazione...');
    testInstallation();
    
    console.log('\n✅ Installazione completata con successo!');
    console.log('\n🚀 Per avviare il sistema:');
    console.log('   npm run start');
    console.log('\n📖 Documentazione completa in: docs/README.md');
    
  } catch (error) {
    console.error('❌ Errore durante l\'installazione:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function checkPrerequisites() {
  // Verifica Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' });
    console.log(`   Node.js: ${nodeVersion.trim()}`);
  } catch (error) {
    throw new Error('Node.js non trovato. Installa Node.js 18+ da https://nodejs.org');
  }
  
  // Verifica npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' });
    console.log(`   npm: ${npmVersion.trim()}`);
  } catch (error) {
    throw new Error('npm non trovato.');
  }
}

function configureDatabasePrompt() {
  return new Promise((resolve) => {
    rl.question('Vuoi configurare un database PostgreSQL? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        configureDatabaseDetails().then(resolve);
      } else {
        console.log('   Utilizzerà file JSON per i dati (adatto per installazioni piccole)');
        resolve();
      }
    });
  });
}

function configureDatabaseDetails() {
  return new Promise((resolve) => {
    console.log('\nInserisci i dettagli del database PostgreSQL:');
    
    rl.question('Host (localhost): ', (host) => {
      rl.question('Porta (5432): ', (port) => {
        rl.question('Nome database: ', (dbname) => {
          rl.question('Username: ', (username) => {
            rl.question('Password: ', (password) => {
              
              const dbUrl = `postgresql://${username}:${password}@${host || 'localhost'}:${port || '5432'}/${dbname}`;
              
              // Aggiorna file .env
              updateEnvFile('DATABASE_URL', dbUrl);
              console.log('   Database configurato!');
              resolve();
            });
          });
        });
      });
    });
  });
}

function configureAdminPrompt() {
  return new Promise((resolve) => {
    console.log('\nConfigurazione account amministratore:');
    
    rl.question('Email amministratore: ', (email) => {
      rl.question('Password amministratore: ', (password) => {
        rl.question('Nome completo: ', (name) => {
          
          // Crea account admin
          createAdminAccount(email, password, name);
          console.log('   Account amministratore creato!');
          resolve();
        });
      });
    });
  });
}

function updateEnvFile(key, value) {
  const envPath = '.env';
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync('.env.example')) {
    envContent = fs.readFileSync('.env.example', 'utf8');
  }
  
  // Aggiorna o aggiungi la chiave
  const lines = envContent.split('\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
  }
  
  if (!found) {
    lines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(envPath, lines.join('\n'));
}

function createAdminAccount(email, password, name) {
  // Carica accounts-credentials.json
  let credentials = {};
  if (fs.existsSync('accounts-credentials.json')) {
    credentials = JSON.parse(fs.readFileSync('accounts-credentials.json', 'utf8'));
  }
  
  if (!credentials.users) {
    credentials.users = {};
  }
  
  // Crea account admin
  credentials.users['1'] = {
    id: 1,
    email: email,
    password: password, // In produzione dovrebbe essere hashata
    type: 'admin',
    name: name,
    createdAt: new Date().toISOString()
  };
  
  credentials.defaultAdminCreated = true;
  
  fs.writeFileSync('accounts-credentials.json', JSON.stringify(credentials, null, 2));
}

function testInstallation() {
  console.log('   Verifica file di configurazione...');
  
  const requiredFiles = [
    'package.json',
    '.env',
    'accounts-credentials.json',
    'storage_data.json'
  ];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`File mancante: ${file}`);
    }
  });
  
  console.log('   Tutti i file richiesti sono presenti ✓');
}

// Avvia installazione
install();
