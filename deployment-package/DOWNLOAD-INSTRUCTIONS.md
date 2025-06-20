# 📥 Download e Preparazione Codice Sorgente

## Passo 1: Download da Replit

### Metodo A: Download ZIP (Consigliato)

1. **Vai al progetto Replit**
   - Apri il browser e vai al tuo progetto Replit
   - URL: https://replit.com/@tuousername/gestionale-sanitario

2. **Download ZIP**
   - Clicca sui tre puntini (...) in alto a destra
   - Seleziona "Download as ZIP"
   - Salva il file `gestionale-sanitario.zip` sul tuo computer

3. **Estrai i file**
   ```bash
   unzip gestionale-sanitario.zip
   cd gestionale-sanitario
   ```

### Metodo B: Git Clone

Se hai configurato Git in Replit:

```bash
git clone https://github.com/tuousername/gestionale-sanitario.git
cd gestionale-sanitario
```

## Passo 2: Preparazione Pacchetto Deployment

### Struttura Directory Target

Crea questa struttura sul tuo computer:

```
deployment-ready/
├── gestionale-sanitario/          # Codice dell'app
│   ├── client/
│   ├── server/
│   ├── shared/
│   ├── package.json
│   └── ...tutti i file del progetto
├── deployment-scripts/            # Script deployment
│   ├── install.sh
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── .env.example
└── gestionale-sanitario.tar.gz    # Pacchetto finale
```

### Comandi Preparazione

```bash
# Crea directory di lavoro
mkdir -p ~/deployment-ready/gestionale-sanitario
mkdir -p ~/deployment-ready/deployment-scripts

# Copia il codice scaricato da Replit
cp -r /path/to/downloaded/gestionale-sanitario/* ~/deployment-ready/gestionale-sanitario/

# Copia gli script di deployment (creati precedentemente)
cp deployment-package/* ~/deployment-ready/deployment-scripts/

# Vai nella directory
cd ~/deployment-ready
```

## Passo 3: Pulizia e Ottimizzazione

### Rimuovi File Non Necessari per Production

```bash
cd gestionale-sanitario

# Rimuovi directory di sviluppo
rm -rf .replit
rm -rf replit.nix
rm -rf temp_test_app
rm -rf logs
rm -rf attached_assets

# Rimuovi backup di sviluppo
rm -f storage_data_backup_*.json
rm -f *.backup
rm -f *.log

# Rimuovi file temporanei
rm -f .env.local
rm -f .env.development

# Mantieni solo i file essenziali
```

### File da Mantenere per Production

```
gestionale-sanitario/
├── client/                 # Frontend React
├── server/                 # Backend Express
├── shared/                 # Schema condiviso
├── public/                 # File statici
├── package.json           # Dipendenze
├── package-lock.json      # Lock file
├── tsconfig.json          # TypeScript config
├── tailwind.config.ts     # Tailwind CSS
├── vite.config.ts         # Vite build
├── drizzle.config.ts      # Database config
└── theme.json             # Tema UI
```

## Passo 4: Aggiornamento Configurazione Production

### Modifica package.json

```bash
cd gestionale-sanitario
```

Verifica che package.json contenga:

```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "vite build",
    "dev": "tsx server/index.ts",
    "db:push": "drizzle-kit push:pg"
  }
}
```

### Crea File Production

**server/index.js** (file di avvio production):
```javascript
require('tsx/cjs').register();
require('./index.ts');
```

## Passo 5: Creazione Pacchetto Finale

### Copia Script Deployment

```bash
cd ~/deployment-ready

# Copia install.sh nella root del progetto
cp deployment-scripts/install.sh gestionale-sanitario/
chmod +x gestionale-sanitario/install.sh

# Copia altri file di configurazione
cp deployment-scripts/docker-compose.yml gestionale-sanitario/
cp deployment-scripts/nginx.conf gestionale-sanitario/
cp deployment-scripts/.env.example gestionale-sanitario/
cp deployment-scripts/Dockerfile gestionale-sanitario/
```

### Crea Archivio Finale

```bash
# Crea il pacchetto finale
tar -czf gestionale-sanitario-deployment.tar.gz gestionale-sanitario/

# Verifica dimensione
ls -lh gestionale-sanitario-deployment.tar.gz
```

## Passo 6: Upload al Server

### Metodo A: SCP (Secure Copy)

```bash
# Upload al server
scp gestionale-sanitario-deployment.tar.gz root@biomedicinaintegrata.it:/root/
```

### Metodo B: SFTP

```bash
sftp root@biomedicinaintegrata.it
put gestionale-sanitario-deployment.tar.gz
quit
```

### Metodo C: Wget (se hai web server temporaneo)

1. Carica il file su un servizio temporaneo (Dropbox, Google Drive, etc.)
2. Sul server:
```bash
wget "https://link-diretto-al-file/gestionale-sanitario-deployment.tar.gz"
```

## Passo 7: Installazione sul Server

### Connessione al Server

```bash
ssh root@biomedicinaintegrata.it
```

### Estrazione e Installazione

```bash
# Estrai il pacchetto
tar -xzf gestionale-sanitario-deployment.tar.gz
cd gestionale-sanitario

# Verifica contenuto
ls -la

# Esegui installazione
chmod +x install.sh
./install.sh biomedicinaintegrata.it
```

## Script di Controllo Pre-Upload

Crea questo script per verificare che tutto sia pronto:

**check-deployment.sh**:
```bash
#!/bin/bash

echo "🔍 Verifica Pacchetto Deployment"
echo "================================"

# Verifica struttura
echo "📁 Verifica struttura directory..."
required_dirs=("client" "server" "shared" "public")
for dir in "${required_dirs[@]}"; do
    if [ -d "gestionale-sanitario/$dir" ]; then
        echo "✅ $dir"
    else
        echo "❌ $dir mancante"
    fi
done

# Verifica file essenziali
echo -e "\n📄 Verifica file essenziali..."
required_files=("package.json" "install.sh" "docker-compose.yml" ".env.example")
for file in "${required_files[@]}"; do
    if [ -f "gestionale-sanitario/$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file mancante"
    fi
done

# Verifica dimensioni
echo -e "\n📊 Dimensioni pacchetto:"
if [ -f "gestionale-sanitario-deployment.tar.gz" ]; then
    size=$(du -h gestionale-sanitario-deployment.tar.gz | cut -f1)
    echo "✅ gestionale-sanitario-deployment.tar.gz ($size)"
else
    echo "❌ Archivio non creato"
fi

echo -e "\n🎯 Tutto pronto per il deployment!"
```

## Risoluzione Problemi Comuni

### Errore: File Troppo Grande
```bash
# Rimuovi node_modules se presente
rm -rf gestionale-sanitario/node_modules

# Ricrea archivio
tar -czf gestionale-sanitario-deployment.tar.gz gestionale-sanitario/
```

### Errore: Permessi
```bash
# Sul server, dopo estrazione
chown -R root:root gestionale-sanitario/
chmod +x gestionale-sanitario/install.sh
```

### Verifica Finale
Sul server, dopo installazione:
```bash
# Test servizi
systemctl status nginx
pm2 status

# Test accesso
curl -I https://biomedicinaintegrata.it
```

## Supporto

Se incontri problemi durante il processo:
- Email: zambelli.andrea.1973@gmail.com
- Includi sempre i log di errore
- Specifica il passo dove si verifica il problema