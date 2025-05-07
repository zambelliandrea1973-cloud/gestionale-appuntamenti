/**
 * Script per liberare la porta 5000
 */

const { execSync } = require('child_process');

console.log('🔍 Cerco processi che utilizzano la porta 5000...');

try {
  // Cerca il PID che sta usando la porta 5000
  const findCommand = "ps aux | grep node | grep -v grep";
  const processes = execSync(findCommand).toString().split('\n');
  
  console.log('📋 Processi Node.js trovati:');
  processes.forEach((process, index) => {
    if (process.trim()) {
      console.log(`${index + 1}: ${process}`);
    }
  });
  
  // Termina tutti i processi Node.js tranne questo script
  console.log('🛑 Terminazione di tutti i processi Node.js...');
  execSync('pkill -9 node || true');
  
  console.log('✅ Completato! La porta 5000 dovrebbe essere libera.');
  console.log('📌 Ora puoi riavviare manualmente l\'applicazione dal pannello dei workflow di Replit.');

} catch (error) {
  console.error('❌ Errore:', error.message);
}