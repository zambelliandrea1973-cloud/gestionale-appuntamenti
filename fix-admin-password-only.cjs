/**
 * Corregge solo la password dell'admin a "gironiCO73%"
 */

const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function generateAdminHash() {
  try {
    const adminPassword = "gironiCO73%";
    const hashedPassword = await hashPassword(adminPassword);
    
    console.log('Password admin:', adminPassword);
    console.log('Hash generato:', hashedPassword);
    console.log('');
    console.log('--- SQL DA ESEGUIRE ---');
    console.log(`UPDATE users SET password = '${hashedPassword}' WHERE type = 'admin' OR role = 'admin';`);
    console.log('');
    console.log('Questo aggiornerà SOLO la password dell\'admin');
    
  } catch (error) {
    console.error('❌ Errore durante la generazione hash:', error);
  }
}

generateAdminHash();