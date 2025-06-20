#!/bin/bash

# Script di verifica pacchetto deployment
# Da eseguire prima di caricare sul server

set -e

echo "🔍 Verifica Pacchetto Deployment per biomedicinaintegrata.it"
echo "=========================================================="

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_ok() {
    echo -e "${GREEN}✅${NC} $1"
}

check_error() {
    echo -e "${RED}❌${NC} $1"
}

check_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

check_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Verifica directory corrente
if [ ! -d "gestionale-sanitario" ]; then
    check_error "Directory 'gestionale-sanitario' non trovata"
    echo "Assicurati di essere nella directory che contiene il codice dell'app"
    exit 1
fi

echo "📁 Verifica struttura directory..."

# Directory essenziali
required_dirs=("client" "server" "shared" "public")
for dir in "${required_dirs[@]}"; do
    if [ -d "gestionale-sanitario/$dir" ]; then
        check_ok "Directory $dir"
    else
        check_error "Directory $dir mancante"
        exit 1
    fi
done

# Sottodirectory client
client_dirs=("src" "src/pages" "src/components" "src/hooks")
for dir in "${client_dirs[@]}"; do
    if [ -d "gestionale-sanitario/client/$dir" ]; then
        check_ok "Client $dir"
    else
        check_error "Client $dir mancante"
    fi
done

# File essenziali
echo -e "\n📄 Verifica file essenziali..."
required_files=(
    "package.json"
    "package-lock.json" 
    "tsconfig.json"
    "vite.config.ts"
    "tailwind.config.ts"
    "drizzle.config.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "gestionale-sanitario/$file" ]; then
        check_ok "$file"
    else
        check_error "$file mancante"
    fi
done

# File deployment
echo -e "\n🚀 Verifica file deployment..."
deployment_files=("install.sh" "docker-compose.yml" ".env.example" "nginx.conf" "Dockerfile")
for file in "${deployment_files[@]}"; do
    if [ -f "gestionale-sanitario/$file" ]; then
        check_ok "Deployment $file"
    else
        check_error "Deployment $file mancante"
        echo "   Copia da deployment-package/$file"
    fi
done

# Verifica install.sh eseguibile
if [ -f "gestionale-sanitario/install.sh" ]; then
    if [ -x "gestionale-sanitario/install.sh" ]; then
        check_ok "install.sh è eseguibile"
    else
        check_warning "install.sh non è eseguibile"
        echo "   Esegui: chmod +x gestionale-sanitario/install.sh"
    fi
fi

# Verifica package.json
echo -e "\n📦 Verifica package.json..."
if [ -f "gestionale-sanitario/package.json" ]; then
    if grep -q '"start"' gestionale-sanitario/package.json; then
        check_ok "Script 'start' presente"
    else
        check_error "Script 'start' mancante in package.json"
    fi
    
    if grep -q '"build"' gestionale-sanitario/package.json; then
        check_ok "Script 'build' presente"
    else
        check_error "Script 'build' mancante in package.json"
    fi
fi

# File da rimuovere per production
echo -e "\n🧹 Verifica pulizia file development..."
dev_files=(".replit" "replit.nix" "temp_test_app" "logs" "attached_assets")
for file in "${dev_files[@]}"; do
    if [ -e "gestionale-sanitario/$file" ]; then
        check_warning "File/directory development $file presente"
        echo "   Considera di rimuoverlo: rm -rf gestionale-sanitario/$file"
    else
        check_ok "File development $file rimosso"
    fi
done

# Verifica backup files
backup_count=$(find gestionale-sanitario -name "storage_data_backup_*.json" | wc -l)
if [ $backup_count -gt 0 ]; then
    check_warning "Trovati $backup_count file di backup"
    echo "   Considera di rimuoverli: rm gestionale-sanitario/storage_data_backup_*.json"
else
    check_ok "Nessun file di backup di sviluppo"
fi

# Verifica dimensioni
echo -e "\n📊 Analisi dimensioni..."
if [ -d "gestionale-sanitario/node_modules" ]; then
    check_warning "Directory node_modules presente"
    echo "   Le dipendenze verranno reinstallate sul server"
    echo "   Puoi rimuoverla per ridurre le dimensioni: rm -rf gestionale-sanitario/node_modules"
fi

total_size=$(du -sh gestionale-sanitario 2>/dev/null | cut -f1 || echo "N/A")
check_info "Dimensione totale directory: $total_size"

# Crea archivio se non esiste
echo -e "\n📦 Creazione archivio..."
if [ ! -f "gestionale-sanitario-deployment.tar.gz" ]; then
    echo "Creazione archivio in corso..."
    tar -czf gestionale-sanitario-deployment.tar.gz gestionale-sanitario/ 2>/dev/null
    if [ $? -eq 0 ]; then
        check_ok "Archivio creato: gestionale-sanitario-deployment.tar.gz"
    else
        check_error "Errore nella creazione archivio"
        exit 1
    fi
else
    check_info "Archivio esistente trovato"
fi

# Dimensioni archivio
if [ -f "gestionale-sanitario-deployment.tar.gz" ]; then
    archive_size=$(du -h gestionale-sanitario-deployment.tar.gz | cut -f1)
    check_ok "Dimensione archivio: $archive_size"
    
    # Warning se troppo grande
    size_mb=$(du -m gestionale-sanitario-deployment.tar.gz | cut -f1)
    if [ $size_mb -gt 100 ]; then
        check_warning "Archivio grande (${archive_size}). Upload potrebbe richiedere tempo."
    fi
fi

# Verifica contenuto .env.example
echo -e "\n⚙️  Verifica configurazione..."
if [ -f "gestionale-sanitario/.env.example" ]; then
    if grep -q "biomedicinaintegrata.it" gestionale-sanitario/.env.example; then
        check_ok "Dominio biomedicinaintegrata.it configurato"
    else
        check_warning "Dominio non configurato in .env.example"
    fi
else
    check_error ".env.example mancante"
fi

# Suggerimenti finali
echo -e "\n🎯 Suggerimenti per ottimizzazione:"
echo "   1. Rimuovi node_modules per ridurre dimensioni"
echo "   2. Rimuovi file di backup e log di sviluppo" 
echo "   3. Verifica che .env.example sia configurato correttamente"
echo "   4. Test del pacchetto su ambiente locale prima del deployment"

# Comandi di upload
echo -e "\n📤 Comandi per upload al server:"
echo "   scp gestionale-sanitario-deployment.tar.gz root@biomedicinaintegrata.it:/root/"
echo "   ssh root@biomedicinaintegrata.it"
echo "   tar -xzf gestionale-sanitario-deployment.tar.gz"
echo "   cd gestionale-sanitario"
echo "   ./install.sh biomedicinaintegrata.it"

echo -e "\n${GREEN}🎉 Verifica completata!${NC}"
echo "Il pacchetto è pronto per il deployment su biomedicinaintegrata.it"