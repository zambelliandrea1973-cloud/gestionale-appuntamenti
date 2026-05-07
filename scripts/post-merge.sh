#!/bin/bash
# Post-merge setup script. Stdin is closed when run automatically, so all
# commands must be non-interactive.
set -e

echo "==> npm install"
npm install --no-audit --no-fund

# Controllo i18n NON aggirabile: verifica allineamento chiavi, assenza
# marker [TODO:LANG] residui e coerenza interpolazioni in tutte le 9
# lingue. Se anche un solo controllo fallisce, lo script si interrompe
# (set -e) bloccando il post-merge e di conseguenza il rilascio.
# Per dettagli vedere replit.md sezione "Sistema i18n".
echo "==> i18n sync check (npx tsx scripts/i18n-sync.ts)"
if ! npx tsx scripts/i18n-sync.ts </dev/null; then
  echo ""
  echo "❌ Controllo traduzioni FALLITO: il rilascio è bloccato."
  echo "   Esegui in locale 'npx tsx scripts/i18n-sync.ts --fix' per"
  echo "   aggiungere le chiavi mancanti, poi traduci i marker [TODO:LANG]"
  echo "   e ricommitta prima di rilanciare il merge/deploy."
  exit 1
fi

# drizzle-kit push può chiedere conferma su nuovi UNIQUE constraints o
# trasformazioni di tipo che non possono essere risolte automaticamente.
# Con stdin chiuso queste prompt vanno in EOF e lo script si blocca.
# `--force` copre solo i prompt di data-loss; gli altri (truncate per
# unique, cast di tipo, FK violations) vanno gestiti manualmente prima
# del merge facendo girare `npm run db:push -- --force` in locale e
# applicando i fix SQL necessari (drop duplicati / cast / pulizia FK).
echo "==> i18n placeholder check (npx tsx scripts/i18n-placeholder-check.ts)"
if ! npx tsx scripts/i18n-placeholder-check.ts </dev/null; then
  echo ""
  echo "❌ Controllo placeholder inglesi FALLITO: il rilascio è bloccato."
  echo "   Alcune chiavi in de/es/fr/nl/no/ro/ru hanno lo stesso valore di en.json."
  echo "   Traduci le chiavi indicate o aggiungi il valore a"
  echo "   .local/i18n-placeholder-exceptions.json se è un termine legittimo."
  exit 1
fi

echo "==> npm run db:push -- --force"
npm run db:push -- --force </dev/null

echo "==> ensure user_sessions table (recreate if db:push dropped it)"
npx tsx scripts/ensure-session-table.ts </dev/null
