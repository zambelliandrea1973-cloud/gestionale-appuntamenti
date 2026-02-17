#!/bin/bash

# Script per download facilitato del pacchetto deployment
echo "=== GESTIONALE SANITARIO - PACCHETTO DEPLOYMENT ==="
echo "Destinazione: biomedicinaintegrata.it"
echo "Versione: $(date +%Y%m%d-%H%M)"

# Informazioni file
if [ -f "gestionale-sanitario-deployment.tar.gz" ]; then
    size=$(du -h gestionale-sanitario-deployment.tar.gz | cut -f1)
    echo "✅ Pacchetto presente: gestionale-sanitario-deployment.tar.gz ($size)"
    echo ""
    echo "METODI DI DOWNLOAD:"
    echo "1. Via Replit Files:"
    echo "   - Pannello sinistro → Files/Explorer"
    echo "   - Cerca 'gestionale-sanitario-deployment.tar.gz'"
    echo "   - Click destro → Download"
    echo ""
    echo "2. Via URL diretto (se abilitato):"
    echo "   - https://replit.com/@[username]/[repl-name]/gestionale-sanitario-deployment.tar.gz"
    echo ""
    echo "3. Via shell (copia il contenuto):"
    echo "   - base64 gestionale-sanitario-deployment.tar.gz"
    echo ""
    echo "DEPLOY SUL SERVER:"
    echo "scp gestionale-sanitario-deployment.tar.gz root@biomedicinaintegrata.it:/root/"
    echo "ssh root@biomedicinaintegrata.it"
    echo "tar -xzf gestionale-sanitario-deployment.tar.gz"
    echo "cd gestionale-deployment/"
    echo "./install.sh biomedicinaintegrata.it"
    echo ""
    echo "RISULTATO: https://biomedicinaintegrata.it"
else
    echo "❌ Pacchetto non trovato. Creazione in corso..."
    
    # Ricrea il pacchetto
    mkdir -p /tmp/deploy-pkg
    
    # Copia file essenziali
    cp -r client /tmp/deploy-pkg/
    cp -r server /tmp/deploy-pkg/
    cp -r shared /tmp/deploy-pkg/
    cp -r public /tmp/deploy-pkg/
    cp package.json /tmp/deploy-pkg/
    cp package-lock.json /tmp/deploy-pkg/
    cp tsconfig.json /tmp/deploy-pkg/
    cp vite.config.ts /tmp/deploy-pkg/
    cp tailwind.config.ts /tmp/deploy-pkg/
    cp drizzle.config.ts /tmp/deploy-pkg/
    cp theme.json /tmp/deploy-pkg/
    
    # Copia script deployment
    cp deployment-package/install.sh /tmp/deploy-pkg/
    cp deployment-package/docker-compose.yml /tmp/deploy-pkg/
    cp deployment-package/.env.example /tmp/deploy-pkg/
    cp deployment-package/nginx.conf /tmp/deploy-pkg/
    
    chmod +x /tmp/deploy-pkg/install.sh
    
    # Crea archivio
    cd /tmp
    tar -czf gestionale-sanitario-deployment.tar.gz deploy-pkg/
    mv gestionale-sanitario-deployment.tar.gz /home/runner/workspace/
    
    # Pulizia
    rm -rf /tmp/deploy-pkg
    
    echo "✅ Pacchetto ricreato"
fi