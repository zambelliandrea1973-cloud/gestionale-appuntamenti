#!/bin/bash

# ============================================
# CREA BACKUP19 - TAG GIT PERMANENTE
# ============================================
#
# Da eseguire DOPO backup18 se fai altre modifiche
#
# ============================================

echo ""
echo "🔖 CREAZIONE BACKUP19 - Tag Git Permanente"
echo "============================================"
echo ""
echo "Questo backup includerà eventuali modifiche"
echo "fatte DOPO backup18."
echo ""
read -p "Vuoi procedere? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Creazione backup annullata"
    exit 1
fi

echo ""
echo "📝 Step 1: Creo commit delle nuove modifiche..."
git add .
git commit -m "BACKUP19: Aggiornamento sistema"

echo ""
echo "🔖 Step 2: Creo tag Git 'backup19'..."
git tag -a backup19 -m "BACKUP19: Sistema aggiornato"

echo ""
echo "📤 Step 3: Push commit e tag su repository..."
git push origin main
git push origin backup19

echo ""
echo "✅ BACKUP19 CREATO CON SUCCESSO!"
echo ""
