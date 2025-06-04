/**
 * Ripristina password "gironico" per tutti gli account
 */

const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function generateGironicoHash() {
  try {
    const password = "gironico";
    const hashedPassword = await hashPassword(password);
    
    console.log('Password originale:', password);
    console.log('Hash generato:', hashedPassword);
    console.log('');
    console.log('--- SQL DA ESEGUIRE ---');
    console.log(`UPDATE users SET password = '${hashedPassword}';`);
    console.log('');
    console.log('Questo resetterà la password di TUTTI gli utenti a:', password);
    
  } catch (error) {
    console.error('❌ Errore durante la generazione hash:', error);
  }
}

generateGironicoHash();