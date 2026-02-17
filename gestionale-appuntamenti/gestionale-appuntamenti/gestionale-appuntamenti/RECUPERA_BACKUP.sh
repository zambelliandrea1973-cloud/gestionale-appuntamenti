#!/bin/bash

# ============================================
# RECUPERA BACKUP - Script di Ripristino
# ============================================
#
# Usa questo script per tornare a un backup
# salvato in precedenza
#
# ============================================

echo ""
echo "🔄 RECUPERO BACKUP"
echo "================================"
echo ""
echo "Tag backup disponibili:"
git tag -l | grep backup

echo ""
echo "Quale backup vuoi recuperare?"
echo "1) backup18"
echo "2) backup19"
echo "3) Annulla"
echo ""
read -p "Scegli (1/2/3): " choice

case $choice in
    1)
        BACKUP_TAG="backup18"
        ;;
    2)
        BACKUP_TAG="backup19"
        ;;
    3)
        echo "❌ Recupero annullato"
        exit 0
        ;;
    *)
        echo "❌ Scelta non valida"
        exit 1
        ;;
esac

echo ""
echo "⚠️  ATTENZIONE:"
echo "Stai per ripristinare il sistema allo stato: $BACKUP_TAG"
echo "Le modifiche NON committate andranno PERSE!"
echo ""
read -p "Sei sicuro? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Recupero annullato"
    exit 1
fi

echo ""
echo "🔄 Recupero backup $BACKUP_TAG..."
echo ""

# Salva modifiche correnti se ci sono
if [[ $(git status --porcelain) ]]; then
    echo "📦 Salvo modifiche correnti in stash..."
    git stash save "Backup automatico prima di recupero $BACKUP_TAG"
fi

# Crea nuovo branch dal backup
BRANCH_NAME="ripristino-$BACKUP_TAG-$(date +%Y%m%d-%H%M%S)"
echo "🌿 Creo nuovo branch: $BRANCH_NAME"
git checkout -b $BRANCH_NAME $BACKUP_TAG

echo ""
echo "✅ RECUPERO COMPLETATO!"
echo ""
echo "📊 Stato attuale:"
echo "   Branch: $BRANCH_NAME"
echo "   Codice: $BACKUP_TAG"
echo ""
echo "🔄 Prossimi passi:"
echo "1. Verifica che tutto funzioni"
echo "2. Se va bene: git checkout main && git merge $BRANCH_NAME"
echo "3. Se non va bene: git checkout main (e il branch di ripristino resta disponibile)"
echo ""
