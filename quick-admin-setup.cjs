/**
 * Setup rapido amministratore con licenza illimitata
 * Uso: node quick-admin-setup.cjs
 */

const fs = require('fs');

console.log('🏥 Setup Amministratore - Licenza Illimitata');
console.log('=============================================\n');

// 1. Account admin con licenza illimitata
const adminCredentials = {
  users: {
    '999': {
      id: 999,
      email: 'admin@gestionale.local',
      password: 'admin123',
      type: 'admin',
      name: 'Amministratore Sistema',
      licenseType: 'unlimited',
      permissions: ['all'],
      createdAt: new Date().toISOString()
    }
  },
  defaultAdminCreated: true
};

// 2. Configurazione ambiente per admin
const adminEnv = `# Configurazione Amministratore
NODE_ENV=development
PORT=5173

# Licenza Illimitata
LICENSE_TYPE=unlimited
LICENSE_OWNER=admin@gestionale.local

# Tutte le funzionalità abilitate
ENABLE_WHATSAPP=true
ENABLE_EMAIL=true
ENABLE_PAYMENTS=true
ENABLE_REPORTS=true
ENABLE_API=true
ENABLE_WHITE_LABEL=true
ENABLE_UNLIMITED_CLIENTS=true
ENABLE_UNLIMITED_USERS=true

# Sicurezza
SESSION_SECRET=admin-super-secret-${Date.now()}
JWT_SECRET=admin-jwt-secret-${Date.now()}
`;

try {
  // Backup credenziali esistenti se presenti
  if (fs.existsSync('accounts-credentials.json')) {
    const existing = fs.readFileSync('accounts-credentials.json', 'utf8');
    const existingData = JSON.parse(existing);
    
    // Aggiungi admin alle credenziali esistenti
    existingData.users['999'] = adminCredentials.users['999'];
    
    fs.writeFileSync('accounts-credentials.json', JSON.stringify(existingData, null, 2));
    console.log('✓ Account admin aggiunto alle credenziali esistenti');
  } else {
    // Crea nuovo file credenziali
    fs.writeFileSync('accounts-credentials.json', JSON.stringify(adminCredentials, null, 2));
    console.log('✓ File credenziali admin creato');
  }
  
  // Crea/aggiorna file .env
  fs.writeFileSync('.env', adminEnv);
  console.log('✓ Configurazione ambiente admin creata');
  
  console.log('\n✅ Setup admin completato!');
  console.log('\n🔐 Credenziali amministratore:');
  console.log('   Email: admin@gestionale.local');
  console.log('   Password: admin123');
  console.log('   Tipo: Licenza Illimitata');
  console.log('\n🚀 Per avviare:');
  console.log('   npm run dev');
  console.log('\n🌐 Accedi su: http://localhost:5173');
  console.log('\n💡 Con questo account hai accesso completo a tutte le funzionalità');
  
} catch (error) {
  console.error('❌ Errore durante il setup:', error.message);
  process.exit(1);
}