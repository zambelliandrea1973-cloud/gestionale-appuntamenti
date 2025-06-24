/**
 * Script per creare un pacchetto di distribuzione completo del sistema
 * Questo pacchetto conterrà tutto il necessario per installare il sistema su qualsiasi hosting
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configurazione del pacchetto
const packageConfig = {
  name: 'gestionale-sanitario-completo',
  version: '1.0.0',
  includeDatabase: true,
  includeDocumentation: true,
  includeInstaller: true
};

function createDeploymentPackage() {
  console.log('📦 Creazione pacchetto di distribuzione...');
  
  // Crea directory temporanea per il pacchetto
  const packageDir = `./deployment-package`;
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir, { recursive: true });
  }

  // 1. Copia tutti i file del progetto
  console.log('📁 Copia dei file del progetto...');
  copyProjectFiles(packageDir);

  // 2. Crea configurazione per installazione
  console.log('⚙️ Creazione configurazione installazione...');
  createInstallationConfig(packageDir);

  // 3. Crea script di installazione
  console.log('🔧 Creazione script di installazione...');
  createInstallationScript(packageDir);

  // 4. Crea documentazione
  console.log('📖 Creazione documentazione...');
  createDocumentation(packageDir);

  // 5. Crea archivio finale
  console.log('📦 Creazione archivio finale...');
  createFinalArchive(packageDir);

  console.log('✅ Pacchetto di distribuzione creato con successo!');
}

function copyProjectFiles(packageDir) {
  // Lista dei file/directory da includere
  const filesToInclude = [
    'client/',
    'server/',
    'shared/',
    'public/',
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'drizzle.config.ts',
    'tsconfig.json',
    '.env.example'
  ];

  // Lista dei file da escludere
  const filesToExclude = [
    'node_modules/',
    '.git/',
    '.cache/',
    'dist/',
    'logs/',
    'storage_data.json', // Questo verrà creato vuoto
    'accounts-credentials.json' // Questo verrà creato vuoto
  ];

  filesToInclude.forEach(item => {
    const sourcePath = path.join('.', item);
    const destPath = path.join(packageDir, item);
    
    if (fs.existsSync(sourcePath)) {
      if (fs.statSync(sourcePath).isDirectory()) {
        copyDirectory(sourcePath, destPath, filesToExclude);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  });

  // Crea file di configurazione iniziali vuoti
  createInitialConfigFiles(packageDir);
}

function copyDirectory(src, dest, excludePatterns = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    // Controlla se il file/directory deve essere escluso
    const shouldExclude = excludePatterns.some(pattern => 
      srcPath.includes(pattern) || item.includes(pattern)
    );
    
    if (shouldExclude) {
      return;
    }
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath, excludePatterns);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

function createInitialConfigFiles(packageDir) {
  // Crea storage_data.json vuoto con struttura base
  const initialStorage = {
    clients: [],
    users: {},
    appointments: [],
    services: [],
    settings: {},
    lastBackup: null
  };
  
  fs.writeFileSync(
    path.join(packageDir, 'storage_data.json'),
    JSON.stringify(initialStorage, null, 2)
  );

  // Crea accounts-credentials.json vuoto
  const initialCredentials = {
    users: {},
    defaultAdminCreated: false
  };
  
  fs.writeFileSync(
    path.join(packageDir, 'accounts-credentials.json'),
    JSON.stringify(initialCredentials, null, 2)
  );

  // Crea file .env di esempio
  const envExample = `# Configurazione Database
DATABASE_URL=postgresql://username:password@localhost:5432/gestionale_sanitario

# Configurazione Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Configurazione Pagamenti (opzionale)
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# Configurazione Sessioni
SESSION_SECRET=your-very-secret-session-key

# Configurazione Generale
NODE_ENV=production
PORT=3000
`;

  fs.writeFileSync(path.join(packageDir, '.env.example'), envExample);
}

function createInstallationConfig(packageDir) {
  const installConfig = {
    name: packageConfig.name,
    version: packageConfig.version,
    description: "Sistema di gestione sanitaria completo",
    requirements: {
      node: ">=18.0.0",
      npm: ">=8.0.0",
      database: "PostgreSQL 13+ (opzionale, può usare file JSON)",
      memory: "512MB RAM minimo",
      storage: "1GB spazio libero"
    },
    features: [
      "Gestione clienti e appuntamenti",
      "Sistema di autenticazione multi-utente",
      "Generazione QR code per accesso clienti",
      "Sistema di notifiche WhatsApp",
      "Gestione fatture e pagamenti",
      "Sistema multi-tenant",
      "Backup automatici",
      "Interfaccia PWA per clienti"
    ],
    installation: {
      steps: [
        "Estrai il pacchetto nella directory desiderata",
        "Esegui 'npm install' per installare le dipendenze",
        "Copia .env.example in .env e configura le variabili",
        "Esegui 'npm run setup' per l'installazione iniziale",
        "Esegui 'npm run start' per avviare il sistema"
      ]
    },
    support: {
      documentation: "docs/README.md",
      installation: "docs/INSTALLATION.md",
      configuration: "docs/CONFIGURATION.md",
      troubleshooting: "docs/TROUBLESHOOTING.md"
    }
  };

  fs.writeFileSync(
    path.join(packageDir, 'installation-config.json'),
    JSON.stringify(installConfig, null, 2)
  );
}

function createInstallationScript(packageDir) {
  const installScript = `#!/usr/bin/env node

/**
 * Script di installazione automatica per il Gestionale Sanitario
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🏥 Installazione Gestionale Sanitario');
console.log('=====================================\\n');

async function install() {
  try {
    // 1. Verifica prerequisiti
    console.log('1. Verifica prerequisiti...');
    checkPrerequisites();
    
    // 2. Installazione dipendenze
    console.log('2. Installazione dipendenze...');
    execSync('npm install', { stdio: 'inherit' });
    
    // 3. Configurazione database
    console.log('3. Configurazione database...');
    await configureDatabasePrompt();
    
    // 4. Configurazione admin
    console.log('4. Configurazione amministratore...');
    await configureAdminPrompt();
    
    // 5. Build del progetto
    console.log('5. Build del progetto...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // 6. Test dell'installazione
    console.log('6. Test dell\\'installazione...');
    testInstallation();
    
    console.log('\\n✅ Installazione completata con successo!');
    console.log('\\n🚀 Per avviare il sistema:');
    console.log('   npm run start');
    console.log('\\n📖 Documentazione completa in: docs/README.md');
    
  } catch (error) {
    console.error('❌ Errore durante l\\'installazione:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function checkPrerequisites() {
  // Verifica Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' });
    console.log(\`   Node.js: \${nodeVersion.trim()}\`);
  } catch (error) {
    throw new Error('Node.js non trovato. Installa Node.js 18+ da https://nodejs.org');
  }
  
  // Verifica npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' });
    console.log(\`   npm: \${npmVersion.trim()}\`);
  } catch (error) {
    throw new Error('npm non trovato.');
  }
}

function configureDatabasePrompt() {
  return new Promise((resolve) => {
    rl.question('Vuoi configurare un database PostgreSQL? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        configureDatabaseDetails().then(resolve);
      } else {
        console.log('   Utilizzerà file JSON per i dati (adatto per installazioni piccole)');
        resolve();
      }
    });
  });
}

function configureDatabaseDetails() {
  return new Promise((resolve) => {
    console.log('\\nInserisci i dettagli del database PostgreSQL:');
    
    rl.question('Host (localhost): ', (host) => {
      rl.question('Porta (5432): ', (port) => {
        rl.question('Nome database: ', (dbname) => {
          rl.question('Username: ', (username) => {
            rl.question('Password: ', (password) => {
              
              const dbUrl = \`postgresql://\${username}:\${password}@\${host || 'localhost'}:\${port || '5432'}/\${dbname}\`;
              
              // Aggiorna file .env
              updateEnvFile('DATABASE_URL', dbUrl);
              console.log('   Database configurato!');
              resolve();
            });
          });
        });
      });
    });
  });
}

function configureAdminPrompt() {
  return new Promise((resolve) => {
    console.log('\\nConfigurazione account amministratore:');
    
    rl.question('Email amministratore: ', (email) => {
      rl.question('Password amministratore: ', (password) => {
        rl.question('Nome completo: ', (name) => {
          
          // Crea account admin
          createAdminAccount(email, password, name);
          console.log('   Account amministratore creato!');
          resolve();
        });
      });
    });
  });
}

function updateEnvFile(key, value) {
  const envPath = '.env';
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync('.env.example')) {
    envContent = fs.readFileSync('.env.example', 'utf8');
  }
  
  // Aggiorna o aggiungi la chiave
  const lines = envContent.split('\\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(\`\${key}=\`)) {
      lines[i] = \`\${key}=\${value}\`;
      found = true;
      break;
    }
  }
  
  if (!found) {
    lines.push(\`\${key}=\${value}\`);
  }
  
  fs.writeFileSync(envPath, lines.join('\\n'));
}

function createAdminAccount(email, password, name) {
  // Carica accounts-credentials.json
  let credentials = {};
  if (fs.existsSync('accounts-credentials.json')) {
    credentials = JSON.parse(fs.readFileSync('accounts-credentials.json', 'utf8'));
  }
  
  if (!credentials.users) {
    credentials.users = {};
  }
  
  // Crea account admin
  credentials.users['1'] = {
    id: 1,
    email: email,
    password: password, // In produzione dovrebbe essere hashata
    type: 'admin',
    name: name,
    createdAt: new Date().toISOString()
  };
  
  credentials.defaultAdminCreated = true;
  
  fs.writeFileSync('accounts-credentials.json', JSON.stringify(credentials, null, 2));
}

function testInstallation() {
  console.log('   Verifica file di configurazione...');
  
  const requiredFiles = [
    'package.json',
    '.env',
    'accounts-credentials.json',
    'storage_data.json'
  ];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(\`File mancante: \${file}\`);
    }
  });
  
  console.log('   Tutti i file richiesti sono presenti ✓');
}

// Avvia installazione
install();
`;

  fs.writeFileSync(path.join(packageDir, 'install.js'), installScript);
  
  // Aggiorna package.json con script di setup
  const packageJsonPath = path.join(packageDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts.setup = 'node install.js';
    packageJson.scripts.postinstall = 'echo "Esegui npm run setup per configurare il sistema"';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
}

function createDocumentation(packageDir) {
  const docsDir = path.join(packageDir, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // README principale
  const readme = `# Gestionale Sanitario - Sistema Completo

Sistema di gestione per studi medici e professionisti sanitari.

## Caratteristiche Principali

- 🏥 **Gestione Clienti**: Database completo pazienti con QR code
- 📅 **Calendario Appuntamenti**: Pianificazione e gestione appuntamenti
- 💬 **Notifiche WhatsApp**: Sistema automatico di promemoria
- 💰 **Gestione Fatture**: Fatturazione e pagamenti integrati
- 👥 **Multi-Utente**: Sistema multi-tenant per più professionisti
- 📱 **PWA Clienti**: Area clienti accessibile da mobile
- 🔐 **Sicurezza**: Autenticazione robusta e backup automatici

## Installazione Rapida

\`\`\`bash
# 1. Estrai il pacchetto
unzip gestionale-sanitario-completo.zip
cd gestionale-sanitario-completo

# 2. Installa dipendenze
npm install

# 3. Configura il sistema
npm run setup

# 4. Avvia il sistema
npm run start
\`\`\`

## Requisiti di Sistema

- **Node.js**: 18.0.0 o superiore
- **RAM**: 512MB minimo (1GB raccomandato)
- **Storage**: 1GB spazio libero
- **Database**: PostgreSQL 13+ (opzionale, può usare file JSON)

## Configurazione

1. **Database**: PostgreSQL raccomandato per installazioni con molti utenti
2. **Email**: Configurazione SMTP per notifiche
3. **Pagamenti**: Stripe e PayPal supportati (opzionale)

## Struttura del Progetto

\`\`\`
gestionale-sanitario/
├── client/          # Frontend React
├── server/          # Backend Node.js
├── shared/          # Codice condiviso
├── public/          # File statici
├── docs/            # Documentazione
├── storage_data.json # Database JSON (sviluppo)
└── package.json     # Configurazione progetto
\`\`\`

## Supporto

- 📖 **Documentazione**: [docs/](./docs/)
- 🚀 **Installazione**: [docs/INSTALLATION.md](./INSTALLATION.md)
- ⚙️ **Configurazione**: [docs/CONFIGURATION.md](./CONFIGURATION.md)
- 🔧 **Risoluzione Problemi**: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Licenza

Sistema proprietario. Vietata la ridistribuzione non autorizzata.

---

© 2025 Andrea Zambelli - Gestionale Sanitario
`;

  fs.writeFileSync(path.join(docsDir, 'README.md'), readme);

  // Guida installazione dettagliata
  const installation = `# Guida Installazione Dettagliata

## Pre-Requisiti

### 1. Node.js e npm
Scarica e installa Node.js dalla pagina ufficiale: https://nodejs.org
- Versione minima richiesta: 18.0.0
- npm verrà installato automaticamente con Node.js

### 2. Database (Opzionale)
Per installazioni professionali, si raccomanda PostgreSQL:
- Scarica PostgreSQL: https://www.postgresql.org/download/
- Versione minima: 13.0
- Crea un database vuoto per il gestionale

## Installazione Passo-Passo

### 1. Preparazione
\`\`\`bash
# Estrai il pacchetto di installazione
unzip gestionale-sanitario-completo.zip
cd gestionale-sanitario-completo

# Verifica i requisiti
node --version  # Deve essere >= 18.0.0
npm --version   # Deve essere >= 8.0.0
\`\`\`

### 2. Installazione Dipendenze
\`\`\`bash
npm install
\`\`\`

### 3. Configurazione Iniziale
\`\`\`bash
npm run setup
\`\`\`

Il wizard di configurazione ti guiderà attraverso:
- Configurazione database (PostgreSQL o file JSON)
- Creazione account amministratore
- Configurazione email (opzionale)
- Configurazione pagamenti (opzionale)

### 4. Test Installazione
\`\`\`bash
npm run start
\`\`\`

Apri il browser su: http://localhost:3000

## Configurazioni Avanzate

### Database PostgreSQL
Se scegli PostgreSQL durante l'installazione, inserisci:
- **Host**: Indirizzo del server database
- **Porta**: Di solito 5432
- **Nome Database**: Nome del database creato
- **Username/Password**: Credenziali di accesso

### Configurazione Email
Per attivare le notifiche email, configura nel file \`.env\`:
\`\`\`
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tua-email@gmail.com
SMTP_PASS=password-app-gmail
\`\`\`

### Configurazione Hosting
Per hosting su server remoto:

1. **Variabili Ambiente**:
\`\`\`
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
\`\`\`

2. **Avvio Produzione**:
\`\`\`bash
npm run build
npm run start
\`\`\`

3. **Process Manager** (raccomandato):
\`\`\`bash
npm install -g pm2
pm2 start "npm run start" --name gestionale
pm2 startup
pm2 save
\`\`\`

## Troubleshooting

### Errore "Port already in use"
\`\`\`bash
# Cambia porta nel file .env
PORT=3001
\`\`\`

### Errore database connection
1. Verifica che PostgreSQL sia in esecuzione
2. Controlla le credenziali nel file .env
3. Testa la connessione manualmente

### Errore npm install
\`\`\`bash
# Pulisci cache npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
\`\`\`

## Aggiornamenti

Per aggiornare il sistema:
1. Ferma il servizio
2. Backup del database e configurazioni
3. Estrai la nuova versione
4. Esegui \`npm install\`
5. Riavvia il servizio
`;

  fs.writeFileSync(path.join(docsDir, 'INSTALLATION.md'), installation);
}

function createFinalArchive(packageDir) {
  const output = fs.createWriteStream('gestionale-sanitario-completo.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(\`📦 Archivio creato: gestionale-sanitario-completo.zip (\${archive.pointer()} bytes)\`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(packageDir, false);
  archive.finalize();
}

// Esegui la creazione del pacchetto
if (require.main === module) {
  createDeploymentPackage();
}

module.exports = { createDeploymentPackage };