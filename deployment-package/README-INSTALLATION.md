# Gestionale Sanitario - Guida Installazione

## Requisiti Sistema
- **Server**: Linux (Ubuntu 20.04+ consigliato)
- **Node.js**: Versione 18 o superiore
- **Database**: PostgreSQL 12+
- **SSL**: Certificato valido (Let's Encrypt consigliato)
- **Memoria RAM**: Minimo 2GB, consigliato 4GB
- **Spazio Disco**: Minimo 10GB

## Installazione Rapida

### 1. Download e Preparazione
```bash
# Scarica il pacchetto sul server
wget https://biomedicinaintegrata.it/gestionale-sanitario.tar.gz
tar -xzf gestionale-sanitario.tar.gz
cd gestionale-sanitario
```

### 2. Installazione Automatica
```bash
# Rendi eseguibile lo script di installazione
chmod +x install.sh

# Esegui l'installazione
sudo ./install.sh
```

### 3. Configurazione Database
Il sistema creerà automaticamente:
- Database PostgreSQL dedicato
- Utente database con privilegi limitati
- Tabelle e indici necessari
- Backup automatico giornaliero

### 4. Configurazione SSL
```bash
# Se usi Let's Encrypt
sudo certbot --nginx -d tuodominio.com
```

### 5. Avvio Servizi
```bash
# Avvia il gestionale
sudo systemctl start gestionale-sanitario
sudo systemctl enable gestionale-sanitario

# Verifica stato
sudo systemctl status gestionale-sanitario
```

## Accesso Iniziale
- **URL**: https://tuodominio.com
- **Username**: admin
- **Password**: Verrà generata durante l'installazione e mostrata nel log

## Configurazione Post-Installazione

### 1. Personalizzazione Studio
- Configura nome studio e contatti
- Carica logo aziendale
- Imposta fuso orario

### 2. Setup Clienti
- Aggiungi primi clienti
- Genera QR code di accesso
- Testa accesso PWA mobile

### 3. Backup
Il sistema include backup automatici:
- Database: ogni notte alle 2:00
- Files: ogni settimana
- Retention: 30 giorni

## Supporto
Per assistenza tecnica: zambelli.andrea.1973@gmail.com

## Caratteristiche Include
✓ Gestione clienti con QR code
✓ Area clienti PWA (offline-ready)
✓ Sistema appuntamenti
✓ Fatturazione automatica
✓ Gestione magazzino PRO
✓ Report e statistiche
✓ Backup automatici
✓ SSL incluso
✓ Aggiornamenti automatici