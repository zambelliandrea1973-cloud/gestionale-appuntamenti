#!/bin/bash
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
