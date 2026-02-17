/**
 * Script per correggere direttamente la password dell'amministratore
 * Utilizziamo un approccio basato sulla creazione di una route temporanea
 */

const { db } = require('./server/db');
const { eq } = require('drizzle-orm');
const { users } = require('./shared/schema');
const { createServer } = require('http');
const express = require('express');

const app = express();
const server = createServer(app);

// Endpoint temporaneo per correggere la password 
app.get('/fix-admin-password-backup14', async (req, res) => {
  try {
    console.log("Avvio correzione password admin...");
    
    // Correzione password admin usando il valore esatto del backup14
    await db.update(users)
      .set({ 
        password: '04b065f1f410058d66f4a34d03ff3a8fa528a4024ecb7d60b111968d44d12ecb73414abb28a439ba9bc8b7b5d14b87534bf02e39db4b298aa1ef60e32fc669d9.b5b523721e413f709649ca32c38db89c' 
      })
      .where(eq(users.username, 'zambelli.andrea.1973@gmail.com'));
    
    console.log("✓ Password admin corretta con 'gironiCO73%'");
    
    // Correzione password per account customer - valore backup14
    await db.update(users)
      .set({ 
        password: '35e803d1e8d765136b051ed26dbc477dc9734461a681d12af35fceedd4c61cebe22a1279e6f4ef394751be1ff38856cae8a004c6e8da5a1b49020cb4a13cffe7.58f3f77fe0ad6c6c6a3c37f3073bdf59' 
      })
      .where(eq(users.username, 'zambelli.andrea.1973D@gmail.com'));
    
    console.log("✓ Password account business corretta con 'gironico'");
    
    // Elimina tutte le sessioni
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Tabella sessioni svuotata");
    await pool.end();
    
    res.json({ 
      success: true, 
      message: "Password reimpostate con successo!",
      accounts: [
        { username: "zambelli.andrea.1973@gmail.com", password: "gironiCO73%" },
        { username: "zambelli.andrea.1973D@gmail.com", password: "gironico" }
      ]
    });
  } catch (error) {
    console.error("ERRORE durante il reset password:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Avvia il server sulla porta 3033
server.listen(3033, () => {
  console.log('Server avviato su http://localhost:3033');
  console.log('Visita /fix-admin-password-backup14 per correggere le password');
});