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

