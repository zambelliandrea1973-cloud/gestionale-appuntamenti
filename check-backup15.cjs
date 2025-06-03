const fs = require('fs');

console.log('Controllo backup15-settings-personalizzate.cjs per capire la struttura...\n');

try {
  const backupContent = fs.readFileSync('backup15-settings-personalizzate.cjs', 'utf8');
  
  // Cerca le sezioni principali
  console.log('=== STRUTTURA BACKUP ===');
  
  // Cerca tabelle users 
  if (backupContent.includes('users')) {
    console.log('✓ Trovata tabella users');
  }
  
  // Cerca tabelle clients
  if (backupContent.includes('clients')) {
    console.log('✓ Trovata tabella clients');
  }
  
  // Cerca tabelle client_accounts
  if (backupContent.includes('client_accounts')) {
    console.log('✓ Trovata tabella client_accounts');
  }
  
  console.log('\n=== DIFFERENZA TRA CLIENTI E ACCOUNT ===');
  console.log('users = Account professionisti abbonati (tipo: customer, staff, admin)');
  console.log('clients = Clienti finali dei professionisti');
  console.log('client_accounts = Link tra clienti finali e account per accesso PWA');
  
  // Estrai esempi di users
  const userMatches = backupContent.match(/INSERT INTO users.*?VALUES.*?;/gs);
  if (userMatches) {
    console.log('\n=== ESEMPI USERS (Account professionisti) ===');
    userMatches.slice(0, 3).forEach((match, i) => {
      console.log(`${i+1}. ${match.substring(0, 100)}...`);
    });
  }
  
  // Estrai esempi di clients
  const clientMatches = backupContent.match(/INSERT INTO clients.*?VALUES.*?;/gs);
  if (clientMatches) {
    console.log('\n=== ESEMPI CLIENTS (Clienti finali) ===');
    clientMatches.slice(0, 3).forEach((match, i) => {
      console.log(`${i+1}. ${match.substring(0, 100)}...`);
    });
  }
  
} catch (error) {
  console.error('Errore nella lettura del backup:', error.message);
}