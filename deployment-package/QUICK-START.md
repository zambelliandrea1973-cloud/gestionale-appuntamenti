# 🚀 Quick Start Deployment biomedicinaintegrata.it

## Processo Completo in 5 Passi

### 1. Download Codice da Replit
```bash
# Nel browser: vai al tuo progetto Replit
# Clicca sui tre puntini (...) → "Download as ZIP"
# Salva gestionale-sanitario.zip
```

### 2. Preparazione Locale
```bash
# Estrai e prepara
unzip gestionale-sanitario.zip
cd gestionale-sanitario

# Copia gli script di deployment nella directory
cp ../deployment-package/* .

# Rendi eseguibile lo script di verifica
chmod +x check-deployment.sh

# Verifica che tutto sia pronto
./check-deployment.sh
```

### 3. Pulizia (Opzionale ma Consigliato)
```bash
# Rimuovi file non necessari per production
rm -rf .replit replit.nix temp_test_app logs attached_assets
rm -f storage_data_backup_*.json
rm -rf node_modules  # Verrà reinstallato sul server
```

### 4. Creazione Pacchetto
```bash
# Torna alla directory padre
cd ..

# Crea archivio finale
tar -czf gestionale-sanitario-deployment.tar.gz gestionale-sanitario/

# Verifica dimensioni
ls -lh gestionale-sanitario-deployment.tar.gz
```

### 5. Deploy sul Server
```bash
# Upload al server
scp gestionale-sanitario-deployment.tar.gz root@biomedicinaintegrata.it:/root/

# Connessione e installazione
ssh root@biomedicinaintegrata.it
tar -xzf gestionale-sanitario-deployment.tar.gz
cd gestionale-sanitario
./install.sh biomedicinaintegrata.it
```

## Risultato Finale

Dopo l'installazione:
- ✅ **URL**: https://biomedicinaintegrata.it
- ✅ **Login**: admin / (password mostrata durante installazione)
- ✅ **SSL**: Certificato automatico Let's Encrypt
- ✅ **Backup**: Automatici in `/var/backups/gestionale-sanitario/`
- ✅ **Monitoraggio**: `pm2 status` e `systemctl status nginx`

## Configurazione Post-Installazione

1. **Personalizza Studio**:
   - Nome: "Biomedicina Integrata"
   - Email: admin@biomedicinaintegrata.it
   - Carica logo aziendale

2. **Configura Email SMTP**:
   - Modifica `/var/www/gestionale-sanitario/.env`
   - Riavvia: `pm2 restart gestionale-sanitario`

3. **Primi Clienti**:
   - Aggiungi clienti di test
   - Genera QR code
   - Testa accesso PWA mobile

## Troubleshooting Rapido

**Servizi non attivi:**
```bash
systemctl restart nginx
pm2 restart gestionale-sanitario
```

**Problemi SSL:**
```bash
certbot renew
systemctl restart nginx
```

**Verifica funzionamento:**
```bash
curl -I https://biomedicinaintegrata.it
pm2 logs gestionale-sanitario
```

## Supporto

Email: zambelli.andrea.1973@gmail.com
Include sempre log di errore e passo dove si verifica il problema.