#!/bin/bash
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
