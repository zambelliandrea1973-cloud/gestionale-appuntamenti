#!/bin/bash

# ============================================
# CREA BACKUP18 - VERSIONE SEMPLIFICATA
# ============================================
#
# Le modifiche sono già committate da Replit
# Questo script crea solo il TAG permanente
#
# ============================================

echo ""
echo "🔖 CREAZIONE BACKUP18 - Tag Git Permanente"
echo "============================================"
echo ""
echo "📊 Stato attuale:"
git log --oneline -1
echo ""
echo "Contenuto Backup18:"
echo "  ✅ Commissioni 25%"
echo "  ✅ Traduzioni complete (9 lingue)"
echo "  ✅ Sistema multi-tenant"
echo "  ✅ 48 appuntamenti, 40 clienti"
echo ""
read -p "Creare tag permanente 'backup18'? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Creazione backup annullata"
    exit 1
fi

echo ""
echo "🔖 Creo tag Git 'backup18'..."
git tag -a backup18 -m "BACKUP18: Sistema completo - Commissioni 25% + Traduzioni 9 lingue complete"

if [ $? -eq 0 ]; then
    echo "✅ Tag 'backup18' creato con successo!"
    echo ""
    echo "📤 Push del tag su repository remoto..."
    git push origin backup18
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 BACKUP18 COMPLETATO!"
        echo ""
        echo "🔍 Verifica tag creato:"
        git tag -l | grep backup
        echo ""
        echo "📋 Dettagli backup18:"
        git show backup18 --stat | head -20
        echo ""
        echo "✅ Il tag 'backup18' è ora permanente e recuperabile!"
        echo ""
        echo "🔄 Per recuperarlo in futuro:"
        echo "   git checkout backup18"
        echo "   # oppure"
        echo "   ./RECUPERA_BACKUP.sh"
        echo ""
    else
        echo "❌ Errore nel push del tag"
        exit 1
    fi
else
    echo "❌ Errore nella creazione del tag"
    echo "ℹ️  Il tag potrebbe già esistere. Verifico..."
    git tag -l | grep backup18
    exit 1
fi
