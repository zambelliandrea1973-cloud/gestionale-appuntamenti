/**
 * Genera hash password corretto per faverioelisa6@gmail.com
 */

const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function generateCorrectHash() {
  try {
    const password = "password123";
    const hashedPassword = await hashPassword(password);
    
    console.log('Password originale:', password);
    console.log('Hash generato:', hashedPassword);
    console.log('');
    console.log('Esegui questo SQL per aggiornare:');
    console.log(`UPDATE users SET password = '${hashedPassword}' WHERE username = 'faverioelisa6@gmail.com';`);
    
  } catch (error) {
    console.error('❌ Errore durante la generazione hash:', error);
  }
}

generateCorrectHash();