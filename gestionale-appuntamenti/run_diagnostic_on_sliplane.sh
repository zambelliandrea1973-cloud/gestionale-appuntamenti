#!/bin/bash

# ============================================
# ESEGUE DIAGNOSTICA SU SLIPLANE DA REPLIT
# ============================================
#
# Questo script:
# 1. Si connette a Sliplane via SSH
# 2. Esegue lo script diagnostico
# 3. Mostra i risultati
#
# ============================================

echo ""
echo "🔍 CONNESSIONE A SLIPLANE PER DIAGNOSTICA ICONE"
echo "================================================"
echo ""

# ISTRUZIONI PER L'UTENTE
echo "📋 PRIMA DI PROCEDERE:"
echo ""
echo "1. Vai su https://app.sliplane.io"
echo "2. Seleziona il tuo servizio 'Gestionale Appuntamenti'"
echo "3. Clicca sulla tab 'SSH'"
echo "4. Copia il comando SSH che vedi (es: ssh -p 22222 abc123@server.sliplane.app)"
echo ""
read -p "Hai copiato il comando SSH? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Procedura annullata"
    echo "   Riavvia lo script quando hai il comando SSH pronto"
    exit 1
fi

echo ""
read -p "Incolla il comando SSH qui: " SSH_COMMAND
echo ""

if [ -z "$SSH_COMMAND" ]; then
    echo "❌ Comando SSH non fornito"
    exit 1
fi

echo "📤 Invio script diagnostico a Sliplane..."
echo ""

# Esegue lo script diagnostico sul server remoto Sliplane
cat diagnostic_sliplane_icons.sh | $SSH_COMMAND 'bash -s'

echo ""
echo "✅ DIAGNOSTICA COMPLETATA"
echo ""
echo "📋 Analizza i risultati sopra per identificare il problema:"
echo ""
echo "🔍 COSA CERCARE:"
echo "- ❌ DATABASE_URL NON CONFIGURATO → Aggiungi variabile ambiente"
echo "- ❌ ICONA NON TROVATA per user 14 → Verifica DATABASE_URL uguale a Replit"
echo "- ❌ SHARP NON INSTALLATO → npm install sharp"
echo "- ❌ ERRORE CONNESSIONE DATABASE → Verifica DATABASE_URL corretto"
echo ""
