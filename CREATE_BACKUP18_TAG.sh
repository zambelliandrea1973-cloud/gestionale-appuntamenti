#!/bin/bash

# ============================================
# CREA BACKUP18 - TAG GIT PERMANENTE
# ============================================
#
# IMPORTANTE: Questo crea un TAG GIT che è:
# - ✅ Permanente e non sovracrivibile
# - ✅ Recuperabile in qualsiasi momento
# - ✅ Indipendente da future modifiche
#
# Contenuto Backup18:
# - Commissioni 25%
# - Traduzioni complete 9 lingue
# - Sistema multi-tenant
# - PostgreSQL funzionante
#
# ============================================

echo ""
echo "🔖 CREAZIONE BACKUP18 - Tag Git Permanente"
echo "============================================"
echo ""
echo "⚠️  ATTENZIONE:"
echo "Questo backup includerà lo STATO ATTUALE del codice"
echo "con commissioni 25% + traduzioni complete."
echo ""
read -p "Vuoi procedere? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Creazione backup annullata"
    exit 1
fi

echo ""
echo "📝 Step 1: Creo commit dello stato attuale..."
git add .
git commit -m "BACKUP18: Stato stabile - Commissioni 25% + Traduzioni complete"

echo ""
echo "🔖 Step 2: Creo tag Git 'backup18'..."
git tag -a backup18 -m "BACKUP18: Stato stabile sistema completo - Commissioni 25% + Traduzioni 9 lingue"

echo ""
echo "📤 Step 3: Push commit e tag su repository..."
git push origin main
git push origin backup18

echo ""
echo "✅ BACKUP18 CREATO CON SUCCESSO!"
echo ""
echo "🔍 Per verificare:"
echo "   git tag -l"
echo ""
echo "🔄 Per recuperare questo backup in futuro:"
echo "   git checkout backup18"
echo "   # oppure"
echo "   git checkout -b ripristino-backup18 backup18"
echo ""
echo "📋 Il tag 'backup18' è ora permanente e recuperabile!"
echo ""
