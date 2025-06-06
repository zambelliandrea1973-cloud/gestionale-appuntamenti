#!/usr/bin/env node

/**
 * CREAZIONE SISTEMA ABBONAMENTI E UTENTI
 * Implementa la struttura di abbonamenti che hai specificato
 */

const { execSync } = require('child_process');

console.log('🚀 Implementazione sistema abbonamenti...');

// Push delle modifiche al database
console.log('📊 Aggiornamento schema database...');
try {
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('✅ Schema database aggiornato');
} catch (error) {
  console.log('⚠️  Continuando con il setup...');
}

console.log('👥 Creazione account utente con nuova struttura...');