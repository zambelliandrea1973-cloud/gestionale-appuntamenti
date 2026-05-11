#!/bin/bash
# Post-merge setup script. Stdin is closed when run automatically, so all
# commands must be non-interactive.
set -e

echo "==> npm install"
npm install --no-audit --no-fund

# Auto-fix i18n: aggiunge [TODO:LANG] per le chiavi mancanti nelle lingue
# non-canonical, poi verifica (nella stessa esecuzione) che non restino
# chiavi extra o interpolazioni divergenti — queste non possono essere
# corrette automaticamente e bloccano il rilascio.
# Nota: in modalità --fix i marker [TODO:LANG] (nuovi E pre-esistenti) NON
# sono bloccanti. Il controllo stretto dei TODO viene delegato a una
# pipeline CI separata (i18n-sync senza --fix) oppure al revisore manuale.
echo "==> i18n auto-fix (npm run i18n:sync -- --fix)"
if ! npm run i18n:sync -- --fix </dev/null; then
  echo ""
  echo "❌ Fix traduzioni FALLITO: chiavi extra o interpolazioni divergenti rilevate."
  echo "   Questi problemi non possono essere corretti automaticamente."
  echo "   Risolvi le issues indicate sopra e ricommitta prima di rilanciare."
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
