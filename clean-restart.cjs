/**
 * Script di riavvio pulito
 * 
 * Questo script è in formato CommonJS (.cjs) per essere compatibile 
 * con il progetto che utilizza moduli ES
 * 
 * Uso: node clean-restart.cjs
 */

const { execSync, spawn } = require('child_process');

console.log('🔄 Avvio del processo di riavvio pulito...');

try {
  // Tenta di terminare solo i processi del server Node.js, escludendo questo script
  console.log('🛑 Terminazione dei processi del server Node.js...');
  execSync('ps aux | grep "tsx server/index.ts" | grep -v grep | awk \'{print $2}\' | xargs -r kill -9 || true');
  
  // Aspetta che tutti i processi vengano terminati
  console.log('⏳ Attesa terminazione processi...');
  setTimeout(() => {
    console.log('🚀 Avvio dell\'applicazione...');
    
    // Avvia il server in un nuovo processo
    try {
      const server = spawn('npm', ['run', 'dev'], {
        detached: true,
        stdio: 'inherit'
      });
      
      // Dissocia il processo per permettergli di continuare anche dopo la chiusura dello script
      server.unref();
      
      console.log('✅ Applicazione avviata con successo!');
      console.log('📌 L\'applicazione sarà disponibile tra pochi secondi.');
    } catch (startError) {
      console.error('❌ Errore durante l\'avvio dell\'applicazione:', startError.message);
    }
  }, 2000); // Attende 2 secondi
} catch (error) {
  console.error('❌ Errore durante il riavvio:', error.message);
}