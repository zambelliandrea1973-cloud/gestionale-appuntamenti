const { Pool } = require('@neondatabase/serverless');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function fixCustomerPassword() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const password = "test123";
    const hashedPassword = await hashPassword(password);
    
    await client.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPassword, 'zambelli.andrea.1973A@gmail.com']
    );
    
    console.log('Password aggiornata per zambelli.andrea.1973A@gmail.com');
    console.log('Password temporanea: test123');
    
  } catch (error) {
    console.error('Errore:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCustomerPassword();