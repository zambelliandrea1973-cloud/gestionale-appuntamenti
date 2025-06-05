/**
 * Script temporaneo per login automatico admin dopo riavvio server
 */

const { Pool } = require('@neondatabase/serverless');

async function autoLoginAdmin() {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Verifica che l'admin esista
    const userResult = await pool.query(
      'SELECT id, username, password FROM users WHERE username = $1',
      ['zambelli.andrea.1973@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Admin non trovato');
      return;
    }
    
    const admin = userResult.rows[0];
    console.log(`✅ Admin trovato: ${admin.username} (ID: ${admin.id})`);
    
    // Simula login tramite richiesta HTTP
    const response = await fetch('http://localhost:5000/api/login-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'zambelli.andrea.1973@gmail.com',
        password: 'gironiCO73%'
      })
    });
    
    if (response.ok) {
      const cookies = response.headers.get('set-cookie');
      console.log('✅ Login admin completato');
      console.log('🍪 Cookie di sessione:', cookies);
    } else {
      console.log('❌ Errore login:', response.status, await response.text());
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Errore auto-login:', error);
  }
}

autoLoginAdmin();