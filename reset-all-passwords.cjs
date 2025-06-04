/**
 * Reset password per tutti gli account a "password123"
 * per risolvere i problemi di autenticazione
 */

const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, sql } = require('drizzle-orm');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function resetAllPasswords() {
  console.log('🔄 Reset password per tutti gli account...');
  
  try {
    const newPassword = "password123";
    const hashedPassword = await hashPassword(newPassword);
    
    console.log('Hash generato:', hashedPassword);
    console.log('');
    console.log('--- SQL DA ESEGUIRE ---');
    console.log(`UPDATE users SET password = '${hashedPassword}';`);
    console.log('');
    console.log('Questo resetterà la password di TUTTI gli utenti a:', newPassword);
    
  } catch (error) {
    console.error('❌ Errore durante la generazione hash:', error);
  }
}

resetAllPasswords();