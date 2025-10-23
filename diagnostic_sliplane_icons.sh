#!/bin/bash

# ============================================
# DIAGNOSTICA ICONE PWA SU SLIPLANE
# ============================================
#
# Questo script verifica tutti i punti critici
# per identificare perché Sliplane mostra
# "Fleur de Vie" invece del logo personalizzato
#
# ============================================

echo ""
echo "🔍 DIAGNOSTICA ICONE PWA SU SLIPLANE"
echo "===================================="
echo ""
echo "Eseguito il: $(date)"
echo "Host: $(hostname)"
echo ""

# 1. VERIFICA VARIABILI AMBIENTE
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  VERIFICA DATABASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL NON CONFIGURATO!"
    echo "   → Aggiungi variabile ambiente DATABASE_URL"
else
    echo "✅ DATABASE_URL configurato"
    echo "   Host: $(echo $DATABASE_URL | sed -E 's|.*@([^/]+)/.*|\1|')"
    echo "   Database: $(echo $DATABASE_URL | sed -E 's|.*/(.*)|\1|')"
fi
echo ""

# 2. VERIFICA CONNESSIONE DATABASE
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  VERIFICA CONNESSIONE DATABASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -z "$DATABASE_URL" ]; then
    echo "⏭️  Saltato (DATABASE_URL non configurato)"
else
    if psql $DATABASE_URL -c "SELECT version();" 2>&1 | grep -q "PostgreSQL"; then
        echo "✅ Connessione database OK"
        psql $DATABASE_URL -c "SELECT version();" 2>&1 | head -1
    else
        echo "❌ ERRORE CONNESSIONE DATABASE"
        psql $DATABASE_URL -c "SELECT version();" 2>&1 | head -5
    fi
fi
echo ""

# 3. VERIFICA DATI ICONE NEL DATABASE
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  VERIFICA DATI ICONE NEL DATABASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -z "$DATABASE_URL" ]; then
    echo "⏭️  Saltato (DATABASE_URL non configurato)"
else
    echo "Icone presenti per tutti gli utenti:"
    psql $DATABASE_URL -c "SELECT user_id, LENGTH(icon_base64) as icon_size_bytes, created_at FROM user_icons ORDER BY user_id;" 2>&1
    echo ""
    echo "Icona per user_id = 14 (Silvia Busnari):"
    ICON_CHECK=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM user_icons WHERE user_id = 14;" 2>&1 | tr -d ' ')
    if [ "$ICON_CHECK" = "1" ]; then
        echo "✅ Icona trovata per user 14"
        psql $DATABASE_URL -c "SELECT user_id, LENGTH(icon_base64) as icon_size_bytes, LEFT(icon_base64, 50) as preview FROM user_icons WHERE user_id = 14;" 2>&1
    elif [ "$ICON_CHECK" = "0" ]; then
        echo "❌ ICONA NON TROVATA per user 14"
        echo "   → Verifica che DATABASE_URL punti allo stesso database di Replit"
    else
        echo "❌ ERRORE nella query: $ICON_CHECK"
    fi
fi
echo ""

# 4. VERIFICA FILE ICONE DEFAULT
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  VERIFICA FILE ICONE DEFAULT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "public/icons/app_icon.jpg" ]; then
    echo "✅ app_icon.jpg (Fleur de Vie) trovato"
    ls -lh public/icons/app_icon.jpg
else
    echo "❌ app_icon.jpg NON TROVATO"
    echo "   → Path: $(pwd)/public/icons/app_icon.jpg"
fi
echo ""

if [ -f "public/icons/icon-192x192.png" ]; then
    echo "✅ icon-192x192.png trovato"
    ls -lh public/icons/icon-192x192.png
else
    echo "⚠️  icon-192x192.png non trovato (non critico)"
fi
echo ""

# 5. VERIFICA SHARP INSTALLATO
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  VERIFICA SHARP INSTALLATO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "node_modules/sharp" ]; then
    echo "✅ Sharp installato"
    ls -ld node_modules/sharp | head -1
else
    echo "❌ SHARP NON INSTALLATO"
    echo "   → Esegui: npm install sharp"
fi
echo ""

# 6. VERIFICA PROCESSO NODE IN ESECUZIONE
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  VERIFICA PROCESSO NODE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pgrep -f "node.*index" > /dev/null; then
    echo "✅ Processo Node.js in esecuzione"
    ps aux | grep "node" | grep -v grep | head -3
else
    echo "⚠️  Nessun processo Node.js trovato"
fi
echo ""

# 7. ULTIMI LOG SERVER
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  ULTIMI LOG SERVER (ICON/MANIFEST)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cerca log in vari path possibili
LOG_PATHS=(
    "/var/log/sliplane/app.log"
    "/var/log/app.log"
    "logs/app.log"
    "app.log"
)

LOG_FOUND=false
for LOG_PATH in "${LOG_PATHS[@]}"; do
    if [ -f "$LOG_PATH" ]; then
        echo "✅ Log trovato: $LOG_PATH"
        echo "Ultime 20 righe con ICON o MANIFEST:"
        tail -200 "$LOG_PATH" | grep -E "ICON|MANIFEST" | tail -20
        LOG_FOUND=true
        break
    fi
done

if [ "$LOG_FOUND" = false ]; then
    echo "⚠️  File di log non trovato nei path standard"
    echo "   Cercati: ${LOG_PATHS[@]}"
    echo ""
    echo "Log console disponibile con:"
    echo "   pm2 logs"
    echo "   journalctl -u your-app.service -n 100"
fi
echo ""

# 8. TEST ROUTE /pwa-icon
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  TEST ROUTE /pwa-icon/192x192?owner=14"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Prova su localhost:5000
if curl -s -I "http://localhost:5000/pwa-icon/192x192?owner=14" > /tmp/icon_test.txt 2>&1; then
    if grep -q "200 OK" /tmp/icon_test.txt; then
        echo "✅ Route /pwa-icon risponde correttamente"
        cat /tmp/icon_test.txt | head -10
        
        # Scarica icona per verifica dimensioni
        curl -s "http://localhost:5000/pwa-icon/192x192?owner=14" > /tmp/test-icon.png 2>&1
        if [ -f "/tmp/test-icon.png" ]; then
            echo ""
            echo "File scaricato:"
            file /tmp/test-icon.png
            ls -lh /tmp/test-icon.png
        fi
    else
        echo "⚠️  Route risponde ma non 200 OK:"
        cat /tmp/icon_test.txt | head -10
    fi
else
    echo "❌ ERRORE nel contattare http://localhost:5000"
    echo "   → Verifica che l'app sia in esecuzione"
    cat /tmp/icon_test.txt 2>&1 | head -5
fi
rm -f /tmp/icon_test.txt
echo ""

# 9. RIEPILOGO
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RIEPILOGO DIAGNOSTICA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Esegui questo script su Sliplane e confronta i risultati con Replit."
echo ""
echo "📋 PROSSIMI PASSI:"
echo ""
echo "1. Se DATABASE_URL mancante → Configura variabile ambiente"
echo "2. Se icona user 14 non trovata → Verifica DATABASE_URL corretto"
echo "3. Se Sharp mancante → npm install sharp"
echo "4. Se route /pwa-icon fallisce → Controlla log applicazione"
echo ""
echo "✅ DIAGNOSTICA COMPLETATA"
echo ""
