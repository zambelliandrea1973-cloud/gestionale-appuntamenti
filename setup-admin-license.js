/**
 * Script per setup rapido come amministratore con licenza illimitata
 * Uso: node setup-admin-license.js
 */

const fs = require('fs');
const path = require('path');

console.log('🏥 Setup Amministratore - Licenza Illimitata');
console.log('=============================================\n');

function setupAdminLicense() {
  try {
    // 1. Crea account amministratore
    console.log('1. Creazione account amministratore...');
    createAdminAccount();
    
    // 2. Configura licenza illimitata
    console.log('2. Configurazione licenza illimitata...');
    setupUnlimitedLicense();
    
    // 3. Inizializza storage
    console.log('3. Inizializzazione storage dati...');
    initializeStorage();
    
    // 4. Crea file di configurazione
    console.log('4. Creazione configurazione ambiente...');
    createEnvironmentConfig();
    
    console.log('\n✅ Setup completato con successo!');
    console.log('\n🔐 Credenziali amministratore:');
    console.log('   Email: admin@gestionale.local');
    console.log('   Password: admin123');
    console.log('\n🚀 Per avviare il sistema:');
    console.log('   npm install');
    console.log('   npm run dev');
    console.log('\n📖 Il sistema sarà disponibile su: http://localhost:5173');
    
  } catch (error) {
    console.error('❌ Errore durante il setup:', error.message);
    process.exit(1);
  }
}

function createAdminAccount() {
  const credentials = {
    users: {
      '1': {
        id: 1,
        email: 'admin@gestionale.local',
        password: 'admin123',
        type: 'admin',
        name: 'Amministratore Sistema',
        createdAt: new Date().toISOString(),
        licenseType: 'unlimited',
        permissions: ['all']
      }
    },
    defaultAdminCreated: true
  };
  
  fs.writeFileSync('accounts-credentials.json', JSON.stringify(credentials, null, 2));
  console.log('   ✓ Account amministratore creato');
}

function setupUnlimitedLicense() {
  const licenseConfig = {
    type: 'unlimited',
    features: {
      maxClients: -1, // illimitati
      maxAppointments: -1, // illimitati
      maxUsers: -1, // illimitati
      multiTenant: true,
      whatsappNotifications: true,
      emailNotifications: true,
      paymentIntegration: true,
      advancedReports: true,
      apiAccess: true,
      whiteLabel: true,
      customBranding: true,
      backupRestore: true,
      supportLevel: 'premium'
    },
    expiryDate: null, // mai scade
    issuedTo: 'admin@gestionale.local',
    issuedDate: new Date().toISOString()
  };
  
  fs.writeFileSync('license-config.json', JSON.stringify(licenseConfig, null, 2));
  console.log('   ✓ Licenza illimitata configurata');
}

function initializeStorage() {
  // Carica i dati reali se esistono, altrimenti crea struttura vuota
  let storageData;
  
  if (fs.existsSync('storage_data.json')) {
    // Mantieni i dati esistenti
    storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
    console.log('   ✓ Dati esistenti mantenuti');
  } else {
    // Crea struttura base
    storageData = {
      clients: [],
      users: {},
      appointments: [],
      services: [],
      settings: {
        businessName: 'Gestionale Sanitario',
        address: '',
        phone: '',
        email: 'admin@gestionale.local',
        website: '',
        timezone: 'Europe/Rome',
        currency: 'EUR',
        language: 'it'
      },
      notifications: [],
      reports: [],
      backups: [],
      lastBackup: null,
      version: '1.0.0'
    };
    
    fs.writeFileSync('storage_data.json', JSON.stringify(storageData, null, 2));
    console.log('   ✓ Storage inizializzato');
  }
}

function createEnvironmentConfig() {
  const envConfig = `# Configurazione Ambiente - Amministratore
NODE_ENV=development
PORT=5173

# Database (opzionale - usa file JSON se non configurato)
# DATABASE_URL=postgresql://username:password@localhost:5432/gestionale

# Licenza
LICENSE_TYPE=unlimited
LICENSE_OWNER=admin@gestionale.local

# Email (opzionale)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Pagamenti (opzionale)
# STRIPE_SECRET_KEY=sk_test_...
# PAYPAL_CLIENT_ID=your-paypal-client-id

# Sicurezza
SESSION_SECRET=admin-super-secret-key-$(date +%s)
JWT_SECRET=admin-jwt-secret-key-$(date +%s)

# Features
ENABLE_WHATSAPP=true
ENABLE_EMAIL=true
ENABLE_PAYMENTS=true
ENABLE_REPORTS=true
ENABLE_API=true
ENABLE_WHITE_LABEL=true

# Logging
LOG_LEVEL=info
ENABLE_DEBUG=true
`;

  fs.writeFileSync('.env', envConfig);
  console.log('   ✓ File ambiente configurato');
}

// Esegui setup se chiamato direttamente
if (require.main === module) {
  setupAdminLicense();
}

module.exports = { setupAdminLicense };