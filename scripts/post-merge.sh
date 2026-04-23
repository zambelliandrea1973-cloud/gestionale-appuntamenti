#!/bin/bash
# Post-merge setup script. Stdin is closed when run automatically, so all
# commands must be non-interactive.
set -e

echo "==> npm install"
npm install --no-audit --no-fund

# drizzle-kit push può chiedere conferma su nuovi UNIQUE constraints o
# trasformazioni di tipo che non possono essere risolte automaticamente.
# Con stdin chiuso queste prompt vanno in EOF e lo script si blocca.
# `--force` copre solo i prompt di data-loss; gli altri (truncate per
# unique, cast di tipo, FK violations) vanno gestiti manualmente prima
# del merge facendo girare `npm run db:push -- --force` in locale e
# applicando i fix SQL necessari (drop duplicati / cast / pulizia FK).
echo "==> npm run db:push -- --force"
npm run db:push -- --force </dev/null
