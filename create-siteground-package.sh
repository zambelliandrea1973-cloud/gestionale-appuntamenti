#!/bin/bash

# Script per creare pacchetto di deployment specifico per SiteGround
# Versione ottimizzata per hosting condiviso senza SSH

echo "🔧 Creazione pacchetto SiteGround per gestionale sanitario..."

# Crea directory di deployment per SiteGround
rm -rf siteground-deployment
mkdir -p siteground-deployment

# Copia i file principali
echo "📁 Copiando file applicazione..."
cp -r client siteground-deployment/
cp -r server siteground-deployment/
cp -r shared siteground-deployment/
cp -r public siteground-deployment/

# Copia file di configurazione
cp package.json siteground-deployment/
cp package-lock.json siteground-deployment/
cp tsconfig.json siteground-deployment/
cp vite.config.ts siteground-deployment/
cp tailwind.config.ts siteground-deployment/
cp postcss.config.js siteground-deployment/
cp drizzle.config.ts siteground-deployment/

# Crea script di installazione per SiteGround
cat > siteground-deployment/install-siteground.sh << 'EOF'
#!/bin/bash

echo "🚀 Installazione Gestionale Sanitario su SiteGround..."

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato. Contatta il supporto SiteGround per Node.js"
    exit 1
fi

echo "✅ Node.js trovato: $(node --version)"

# Installa dipendenze
echo "📦 Installazione dipendenze..."
npm install --production

# Crea directory per database se non esiste
mkdir -p data

# Imposta permessi
chmod -R 755 .
chmod +x install-siteground.sh

echo "✅ Installazione completata!"
echo "🌐 Configurare il dominio per puntare alla directory public/"
echo "🔧 Avviare con: node server/index.js"

EOF

# Crea file di configurazione per SiteGround
cat > siteground-deployment/.htaccess << 'EOF'
# Configurazione Apache per SiteGround

# Abilita mod_rewrite
RewriteEngine On

# Redirect HTTP a HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Gestione routing SPA
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Compressione GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
EOF

# Crea README per SiteGround
cat > siteground-deployment/README-SITEGROUND.md << 'EOF'
# Gestionale Sanitario - Installazione SiteGround

## Requisiti
- Hosting SiteGround con supporto Node.js
- Accesso al File Manager
- Dominio configurato

## Installazione

### 1. Carica i file
- Estrai tutti i file nella directory principale del dominio
- Assicurati che i file siano nella root (public_html/)

### 2. Esegui installazione
```bash
chmod +x install-siteground.sh
./install-siteground.sh
```

### 3. Configurazione dominio
- Il dominio deve puntare alla cartella che contiene i file
- Non servono subdirectory specifiche

### 4. Avvio applicazione
```bash
node server/index.js
```

## Configurazione Database
L'applicazione usa SQLite per compatibilità con hosting condiviso.
Il database si trova in `data/app.db`

## Supporto
Per problemi di installazione:
- Verificare che Node.js sia abilitato nel pannello SiteGround
- Controllare i log degli errori nel pannello hosting
- Contattare il supporto SiteGround per assistenza Node.js

EOF

# Crea package.json ottimizzato per SiteGround
cat > siteground-deployment/package-siteground.json << 'EOF'
{
  "name": "gestionale-sanitario",
  "version": "1.0.0",
  "description": "Gestionale Sanitario per SiteGround",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "build": "echo 'Build completed'",
    "postinstall": "echo 'Post-install completed'"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF

# Rendi eseguibile lo script di installazione
chmod +x siteground-deployment/install-siteground.sh

# Crea archivio per SiteGround
echo "🗜️ Creazione archivio per SiteGround..."
cd siteground-deployment
tar -czf ../gestionale-sanitario-siteground.tar.gz .
cd ..

echo "✅ Pacchetto SiteGround creato: gestionale-sanitario-siteground.tar.gz"
echo "📁 Dimensione: $(du -h gestionale-sanitario-siteground.tar.gz | cut -f1)"
echo ""
echo "🔄 Prossimi passi:"
echo "1. Scarica il file gestionale-sanitario-siteground.tar.gz"
echo "2. Caricalo tramite File Manager SiteGround"
echo "3. Estrai l'archivio nella directory principale"
echo "4. Esegui install-siteground.sh dal terminale SiteGround"
