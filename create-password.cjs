// File per la generazione di password hash
const crypto = require('crypto');

/**
 * Calcola l'hash di una password con salt
 * @param {string} password - Password in chiaro
 * @returns {Promise<string>} - Hash formattato come hash.salt
 */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}

// Funzione principale
async function main() {
  const password = 'gironico';
  const hashedPassword = await hashPassword(password);
  console.log(`Password hash per '${password}':`);
  console.log(hashedPassword);
}

// Esegui la funzione principale
main();