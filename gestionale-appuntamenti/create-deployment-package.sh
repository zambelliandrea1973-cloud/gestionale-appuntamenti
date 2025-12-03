#!/bin/bash

# Crea pacchetto deployment per biomedicinaintegrata.it
echo "Creazione pacchetto deployment..."

# Crea directory temporanea
mkdir -p /tmp/gestionale-deployment

# Copia files essenziali escludendo quelli non necessari
rsync -av --exclude='node_modules' \
         --exclude='.replit' \
         --exclude='replit.nix' \
         --exclude='temp_test_app' \
         --exclude='logs' \
         --exclude='attached_assets' \
         --exclude='storage_data_backup_*.json' \
         --exclude='deployment-package' \
         --exclude='gestionale-sanitario-deployment.tar.gz*' \
         /home/runner/workspace/ /tmp/gestionale-deployment/

# Copia script di deployment
cp deployment-package/install.sh /tmp/gestionale-deployment/
cp deployment-package/docker-compose.yml /tmp/gestionale-deployment/
cp deployment-package/.env.example /tmp/gestionale-deployment/
cp deployment-package/nginx.conf /tmp/gestionale-deployment/
cp deployment-package/Dockerfile /tmp/gestionale-deployment/

# Rendi eseguibile install.sh
chmod +x /tmp/gestionale-deployment/install.sh

# Crea archivio finale
cd /tmp
tar -czf gestionale-sanitario-deployment.tar.gz gestionale-deployment/

# Sposta archivio nella directory principale
mv gestionale-sanitario-deployment.tar.gz /home/runner/workspace/

# Pulizia
rm -rf /tmp/gestionale-deployment

echo "Pacchetto creato: gestionale-sanitario-deployment.tar.gz"
ls -lh /home/runner/workspace/gestionale-sanitario-deployment.tar.gz