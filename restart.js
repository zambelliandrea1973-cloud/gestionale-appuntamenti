/**
 * Script di riavvio esterno
 * 
 * Questo script può essere eseguito manualmente quando l'applicazione è offline
 * per riavviarla senza dover accedere all'interfaccia web.
 * 
 * Uso: node restart.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Avvio del processo di riavvio dell\'applicazione...');

try {
  // Verifica se ci sono processi Node.js in esecuzione
  const psOutput = execSync('ps -ef | grep node').toString();
  const nodeProcesses = psOutput.split('\n').filter(line => 
    line.includes('node') && 
    !line.includes('grep') &&
    !line.includes('restart.js')
  );
  
  console.log(`📋 Trovati ${nodeProcesses.length} processi Node.js in esecuzione`);
  
  if (nodeProcesses.length > 0) {
    // Tenta di inviare il segnale SIGHUP ai processi Node.js
    console.log('🛑 Arresto dei processi in corso...');
    
    for (const process of nodeProcesses) {
      const pid = process.trim().split(/\s+/)[1];
      if (pid) {
        try {
          console.log(`- Invio segnale SIGHUP al processo ${pid}`);
          process.kill(parseInt(pid), 'SIGHUP');
        } catch (e) {
          console.log(`- Impossibile inviare segnale al processo ${pid}: ${e.message}`);
        }
      }
    }
  } else {
    console.log('⚠️ Nessun processo Node.js trovato in esecuzione');
  }
  
  // Riavvia il server tramite npm
  console.log('🚀 Riavvio dell\'applicazione...');
  execSync('npm run dev', { stdio: 'inherit' });
  
  console.log('✅ Riavvio completato con successo!');
} catch (error) {
  console.error('❌ Errore durante il riavvio dell\'applicazione:', error.message);
  
  // Tentativo alternativo con pkill
  try {
    console.log('🔄 Tentativo alternativo di riavvio...');
    execSync('pkill -HUP node');
    console.log('✅ Riavvio alternativo completato!');
    
    // Riavvia il server
    console.log('🚀 Riavvio dell\'applicazione...');
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (fallbackError) {
    console.error('❌ Anche il tentativo alternativo è fallito:', fallbackError.message);
    console.log('⚠️ Per favore riavvia manualmente l\'applicazione con "npm run dev"');
  }
}