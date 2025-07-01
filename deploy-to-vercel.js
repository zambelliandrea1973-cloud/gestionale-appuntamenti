/**
 * Script per preparare il deploy completo su Vercel
 * Mantiene TUTTO il sistema Replit funzionante online
 */

import fs from 'fs';
import path from 'path';

function prepareVercelDeployment() {
    console.log('🚀 Preparazione deploy completo su Vercel...');
    
    // 1. Crea vercel.json per configurazione
    const vercelConfig = {
        "version": 2,
        "name": "gestionale-sanitario",
        "builds": [
            {
                "src": "server/index.js",
                "use": "@vercel/node"
            },
            {
                "src": "client/dist/**",
                "use": "@vercel/static"
            }
        ],
        "routes": [
            {
                "src": "/api/(.*)",
                "dest": "/server/index.js"
            },
            {
                "src": "/(.*)",
                "dest": "/client/dist/$1"
            }
        ],
        "env": {
            "NODE_ENV": "production",
            "DATABASE_URL": "@database_url",
            "SESSION_SECRET": "@session_secret"
        },
        "functions": {
            "server/index.js": {
                "maxDuration": 30
            }
        }
    };
    
    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
    
    // 2. Crea script di deploy automatico
    const deployScript = `#!/bin/bash
# Script di deploy automatico per Vercel

echo "🚀 Iniziando deploy su Vercel..."

# Build del frontend
echo "📦 Building frontend..."
npm run build

# Deploy su Vercel
echo "🌐 Deploying to Vercel..."
npx vercel --prod

echo "✅ Deploy completato!"
echo "🔗 Il tuo gestionale sarà disponibile su: https://gestionale-sanitario.vercel.app"
echo "📱 QR codes clienti funzioneranno automaticamente"
echo "🔄 Aggiornamenti futuri: git push origin main"
`;
    
    fs.writeFileSync('deploy-vercel.sh', deployScript);
    
    // 3. Crea README per il deploy
    const deployReadme = `# Deploy Gestionale Sanitario su Vercel

## Deploy Automatico (Consigliato)

1. **Collega a GitHub:**
   \`\`\`bash
   git init
   git add .
   git commit -m "Sistema completo"
   git remote add origin https://github.com/TUO-USERNAME/gestionale-sanitario.git
   git push -u origin main
   \`\`\`

2. **Deploy su Vercel:**
   - Vai su https://vercel.com
   - Clicca "Import Project"
   - Collega il repository GitHub
   - Deploy automatico!

## Deploy Manuale

\`\`\`bash
npm install -g vercel
npm run build
vercel --prod
\`\`\`

## Configurazione Variabili

Su Vercel dashboard, aggiungi:
- \`DATABASE_URL\`: Il tuo database PostgreSQL
- \`SESSION_SECRET\`: Una stringa segreta casuale

## URL Finali

- **Gestionale Staff**: https://gestionale-sanitario.vercel.app
- **Area Clienti**: https://gestionale-sanitario.vercel.app/client/[TOKEN]
- **QR Codes**: Funzionano automaticamente

## Aggiornamenti Futuri

Ogni volta che modifichi il codice:
\`\`\`bash
git add .
git commit -m "Aggiornamento"
git push origin main
\`\`\`

Vercel aggiornerà automaticamente il sito in 2-3 minuti.

## Alternative Hosting

1. **Netlify**: https://netlify.com (gratuito)
2. **Railway**: https://railway.app (per database incluso)
3. **Render**: https://render.com (hosting Node.js)

Tutti mantengono il sistema identico a Replit.
`;
    
    fs.writeFileSync('DEPLOY-VERCEL.md', deployReadme);
    
    // 4. Aggiorna package.json per production
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Aggiungi script di build se non esistono
    if (!packageJson.scripts.build) {
        packageJson.scripts.build = "cd client && npm run build";
    }
    
    if (!packageJson.scripts.start) {
        packageJson.scripts.start = "node server/index.js";
    }
    
    // Assicurati che ci siano le dipendenze di produzione
    if (!packageJson.engines) {
        packageJson.engines = {
            "node": ">=18.0.0"
        };
    }
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
    // 5. Crea file di ambiente per produzione
    const envExample = `# Copia questo file in .env per sviluppo locale
# Su Vercel, aggiungi queste variabili nel dashboard

DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-super-secret-key-here
NODE_ENV=production

# Optional: Email settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
`;
    
    fs.writeFileSync('.env.example', envExample);
    
    console.log('✅ Preparazione Vercel completata!');
    console.log('📁 File creati:');
    console.log('  - vercel.json (configurazione)');
    console.log('  - deploy-vercel.sh (script deploy)');
    console.log('  - DEPLOY-VERCEL.md (istruzioni)');
    console.log('  - .env.example (variabili ambiente)');
    console.log('');
    console.log('🚀 Prossimi passi:');
    console.log('1. Crea repository GitHub');
    console.log('2. Push del codice');
    console.log('3. Collega a Vercel');
    console.log('4. Deploy automatico!');
}

// Esegui preparazione
prepareVercelDeployment();