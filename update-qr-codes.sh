#!/bin/bash
# Script per aggiornare tutti i QR codes dopo migrazione

echo "🔄 Aggiornamento QR codes per nuovo hosting..."

NEW_URL="https://gestionale-sanitario.up.railway.app"

# Questa operazione va fatta quando il nuovo sistema è online
echo "📱 QR codes verranno aggiornati automaticamente"
echo "🔗 Nuovo URL base: $NEW_URL"
echo "✅ I clienti potranno continuare ad accedere senza interruzioni"

# Il sistema genera automaticamente i QR con il nuovo URL
node -e "
const config = require('./url-config.json');
config.active = 'railway';
require('fs').writeFileSync('url-config.json', JSON.stringify(config, null, 2));
console.log('✅ Configurazione aggiornata per Railway');
"
