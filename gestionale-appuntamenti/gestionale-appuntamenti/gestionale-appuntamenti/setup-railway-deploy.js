/**
 * Setup alternativo per Railway - Include database PostgreSQL gratuito
 */

import fs from 'fs';

function setupRailwayDeployment() {
    console.log('🚂 Preparazione deploy Railway con database incluso...');
    
    // 1. Railway configuration
    const railwayConfig = {
        "build": {
            "builder": "nixpacks"
        },
        "deploy": {
            "startCommand": "npm start"
        }
    };
    
    fs.writeFileSync('railway.json', JSON.stringify(railwayConfig, null, 2));
    
    // 2. Nixpacks configuration per Railway
    const nixpacksConfig = `
providers = ["node"]

[phases.setup]
nixPkgs = ["nodejs_18", "npm"]

[phases.build]
cmds = ["npm ci", "npm run build"]

[phases.deploy]
cmd = "npm start"
`;
    
    fs.writeFileSync('nixpacks.toml', nixpacksConfig);
    
    // 3. Script setup Railway
    const railwaySetup = `#!/bin/bash
# Setup completo Railway con database

echo "🚂 Setup Railway..."

# Install Railway CLI
npm install -g @railway/cli

# Login e setup
echo "1. Esegui: railway login"
echo "2. Esegui: railway init"
echo "3. Esegui: railway add postgresql"
echo "4. Esegui: railway up"

echo "✅ Il tuo gestionale sarà su: https://[project-name].up.railway.app"
`;
    
    fs.writeFileSync('setup-railway.sh', railwaySetup);
    
    // 4. README Railway
    const railwayReadme = `# Deploy su Railway (Consigliato per Database Incluso)

## Vantaggi Railway
- ✅ Database PostgreSQL incluso GRATIS
- ✅ Deploy automatico da GitHub
- ✅ SSL certificato automatico
- ✅ Backup database automatici
- ✅ 500 ore gratis al mese

## Setup Veloce

1. **Vai su https://railway.app**
2. **Clicca "Deploy from GitHub"**
3. **Collega il repository**
4. **Aggiungi PostgreSQL**: Click "+ Add Service" → PostgreSQL
5. **Deploy automatico!**

## Setup Manuale

\`\`\`bash
npm install -g @railway/cli
railway login
railway init
railway add postgresql
railway up
\`\`\`

## Variabili Automatiche

Railway configura automaticamente:
- \`DATABASE_URL\` (dal PostgreSQL service)
- \`PORT\` (automatico)

Aggiungi manualmente:
- \`SESSION_SECRET\`: stringa casuale sicura

## URL Finali

- **Gestionale**: https://[project-name].up.railway.app
- **Area Clienti**: https://[project-name].up.railway.app/client/[TOKEN]
- **Database**: Incluso e gestito automaticamente

## Aggiornamenti

Ogni push su GitHub → deploy automatico in 2-3 minuti
`;
    
    fs.writeFileSync('DEPLOY-RAILWAY.md', railwayReadme);
    
    console.log('✅ Railway setup completato!');
    console.log('🚂 Railway include database PostgreSQL GRATIS');
    console.log('📁 File creati: railway.json, nixpacks.toml, setup-railway.sh');
}

setupRailwayDeployment();