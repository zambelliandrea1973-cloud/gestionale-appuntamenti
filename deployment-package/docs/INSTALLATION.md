# Guida Installazione Dettagliata

## Pre-Requisiti

### 1. Node.js e npm
Scarica e installa Node.js dalla pagina ufficiale: https://nodejs.org
- Versione minima richiesta: 18.0.0
- npm verrà installato automaticamente con Node.js

### 2. Database (Opzionale)
Per installazioni professionali, si raccomanda PostgreSQL:
- Scarica PostgreSQL: https://www.postgresql.org/download/
- Versione minima: 13.0
- Crea un database vuoto per il gestionale

## Installazione Passo-Passo

### 1. Preparazione
```bash
# Estrai il pacchetto di installazione
unzip gestionale-sanitario-completo.zip
cd gestionale-sanitario-completo

# Verifica i requisiti
node --version  # Deve essere >= 18.0.0
npm --version   # Deve essere >= 8.0.0
```

### 2. Installazione Dipendenze
```bash
npm install
```

### 3. Configurazione Iniziale
```bash
npm run setup
```

Il wizard di configurazione ti guiderà attraverso:
- Configurazione database (PostgreSQL o file JSON)
- Creazione account amministratore
- Configurazione email (opzionale)
- Configurazione pagamenti (opzionale)

### 4. Test Installazione
```bash
npm run start
```

Apri il browser su: http://localhost:3000

## Configurazioni Avanzate

### Database PostgreSQL
Se scegli PostgreSQL durante l'installazione, inserisci:
- **Host**: Indirizzo del server database
- **Porta**: Di solito 5432
- **Nome Database**: Nome del database creato
- **Username/Password**: Credenziali di accesso

### Configurazione Email
Per attivare le notifiche email, configura nel file `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tua-email@gmail.com
SMTP_PASS=password-app-gmail
```

### Configurazione Hosting
Per hosting su server remoto:

1. **Variabili Ambiente**:
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
```

2. **Avvio Produzione**:
```bash
npm run build
npm run start
```

3. **Process Manager** (raccomandato):
```bash
npm install -g pm2
pm2 start "npm run start" --name gestionale
pm2 startup
pm2 save
```

## Troubleshooting

### Errore "Port already in use"
```bash
# Cambia porta nel file .env
PORT=3001
```

### Errore database connection
1. Verifica che PostgreSQL sia in esecuzione
2. Controlla le credenziali nel file .env
3. Testa la connessione manualmente

### Errore npm install
```bash
# Pulisci cache npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Aggiornamenti

Per aggiornare il sistema:
1. Ferma il servizio
2. Backup del database e configurazioni
3. Estrai la nuova versione
4. Esegui `npm install`
5. Riavvia il servizio
