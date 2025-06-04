/**
 * Reset password per faverioelisa6@gmail.com
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

async function resetFaverioPassword() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema: {} });

  try {
    const newPassword = "password123";
    const hashedPassword = await hashPassword(newPassword);
    
    console.log('🔄 Reset password per faverioelisa6@gmail.com...');
    
    const result = await db.execute(sql`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE username = 'faverioelisa6@gmail.com'
    `);
    
    console.log(`✅ Password aggiornata per faverioelisa6@gmail.com: ${result.rowCount} righe modificate`);
    console.log(`📝 Nuova password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Errore durante il reset:', error);
  } finally {
    await pool.end();
  }
}

resetFaverioPassword();