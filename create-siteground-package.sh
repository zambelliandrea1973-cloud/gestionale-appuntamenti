#!/bin/bash
# Script per creare pacchetto di ripristino SiteGround

echo "Creando pacchetto di ripristino per SiteGround..."

# Crea directory temporanea
mkdir -p siteground-ripristino

# Copia file necessari
cp index.php siteground-ripristino/
cp gestionale-standalone.php siteground-ripristino/
cp RIPRISTINO-SITO.md siteground-ripristino/

# Crea istruzioni specifiche per SiteGround
cat > siteground-ripristino/ISTRUZIONI-SITEGROUND.txt << 'EOF'
RIPRISTINO BIOMEDICINAINTEGRATA.IT - ISTRUZIONI SITEGROUND

PASSO 1: Elimina File Problematici
Nel File Manager SiteGround, elimina questi file se presenti:
- gestionale-auto-installer.php (questo causa l'errore)
- gestionale-auto-installer-new.php
- simple-installer.php

PASSO 2: Carica Nuovi File
Carica questi file nella cartella public_html:
- index.php (homepage ripristinata)
- gestionale-standalone.php (sistema gestionale)

PASSO 3: Test
- Vai su biomedicinaintegrata.it (homepage)
- Clicca "Accedi al Sistema" per testare gestionale

URL FUNZIONANTI:
- Homepage: biomedicinaintegrata.it
- Gestionale: biomedicinaintegrata.it/gestionale-standalone.php
- Dashboard Andrea: biomedicinaintegrata.it/gestionale-standalone.php?dashboard=3
- Dashboard Silvia: biomedicinaintegrata.it/gestionale-standalone.php?dashboard=14
- Dashboard Elisa: biomedicinaintegrata.it/gestionale-standalone.php?dashboard=16

CREDENZIALI TEST:
Password universale: gestionale2024!
Username: email del professionista

CLIENTI QR (test):
- Mario Rossi: biomedicinaintegrata.it/gestionale-standalone.php?client=PROF_003_0003_CLIENT_1_0001
- Zambelli Andrea: biomedicinaintegrata.it/gestionale-standalone.php?client=PROF_003_0003_CLIENT_2_0002
EOF

# Crea archivio
tar -czf biomedicinaintegrata-ripristino.tar.gz siteground-ripristino/

echo "Pacchetto creato: biomedicinaintegrata-ripristino.tar.gz"
echo "Estrai e carica i file nel File Manager SiteGround"