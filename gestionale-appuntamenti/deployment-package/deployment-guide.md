# Gestionale Sanitario - Guida Deployment VPS

## Preparazione Server

### Requisiti Minimi
- **OS**: Ubuntu 20.04 LTS o superiore
- **RAM**: 4GB (minimo 2GB)
- **Storage**: 20GB SSD
- **CPU**: 2 vCPU
- **Banda**: 100 Mbps

### DNS Configuration
Prima dell'installazione, configura il DNS per puntare al tuo server:
```
A     biomedicinaintegrata.it     → IP_SERVER
A     www.biomedicinaintegrata.it → IP_SERVER
```

## Installazione Automatica

### Metodo 1: Script di Installazione (Consigliato)

1. **Accesso al server**:
```bash
ssh root@biomedicinaintegrata.it
```

2. **Download del pacchetto**:
```bash
wget https://github.com/tuorepo/gestionale-sanitario/releases/latest/download/gestionale-sanitario.tar.gz
tar -xzf gestionale-sanitario.tar.gz
cd gestionale-sanitario
```

3. **Esecuzione installazione**:
```bash
chmod +x install.sh
sudo ./install.sh biomedicinaintegrata.it
```

### Metodo 2: Docker Deployment

1. **Installazione Docker**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose -y
```

2. **Configurazione environment**:
```bash
cp .env.example .env
# Modifica .env con i tuoi parametri
nano .env
```

3. **Avvio servizi**:
```bash
docker-compose up -d
```

## Post-Installazione

### 1. Verifica Servizi
```bash
# Stato applicazione
pm2 status

# Stato database
sudo systemctl status postgresql

# Stato web server
sudo systemctl status nginx

# Test SSL
curl -I https://biomedicinaintegrata.it
```

### 2. Primo Accesso
- URL: https://biomedicinaintegrata.it
- Username: `admin`
- Password: (mostrata durante installazione)

### 3. Configurazione Iniziale

**Impostazioni Studio**:
- Nome studio: "Biomedicina Integrata"
- Email: admin@biomedicinaintegrata.it
- Telefono: il tuo numero
- Sito web: biomedicinaintegrata.it

**Upload Logo**:
- Formato: PNG/JPG
- Dimensioni: 200x200px minimo
- Massimo: 2MB

### 4. Configurazione Email

Modifica `/var/www/gestionale-sanitario/.env`:
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@biomedicinaintegrata.it
EMAIL_PASS=password-app-gmail
```

Riavvia:
```bash
pm2 restart gestionale-sanitario
```

### 5. Backup Setup

Il sistema include backup automatici:
- **Database**: ogni notte alle 2:00
- **Files**: settimanalmente
- **Location**: `/var/backups/gestionale-sanitario/`
- **Retention**: 30 giorni

Verifica backup manuale:
```bash
/usr/local/bin/backup-gestionale.sh
ls -la /var/backups/gestionale-sanitario/
```

## Monitoraggio

### Log Files
```bash
# Application logs
tail -f /var/log/gestionale-sanitario/combined.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# Sistema
htop
df -h
free -h
```

### Database Monitoring
```bash
# Connessioni attive
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Dimensione database
sudo -u postgres psql -c "\l+"
```

## Maintenance

### Aggiornamenti
```bash
cd /var/www/gestionale-sanitario
git pull origin main
npm install --production
npm run build
pm2 restart gestionale-sanitario
```

### Backup Manuale
```bash
# Database
pg_dump -U gestionale_user -h localhost gestionale_sanitario > backup.sql

# Files
tar -czf files-backup.tar.gz /var/www/gestionale-sanitario/
```

### Restore da Backup
```bash
# Database
sudo -u postgres psql gestionale_sanitario < backup.sql

# Files
tar -xzf files-backup.tar.gz -C /
```

## Troubleshooting

### App non raggiungibile
```bash
# Verifica servizi
systemctl status nginx
pm2 status

# Restart servizi
systemctl restart nginx
pm2 restart gestionale-sanitario
```

### Problemi SSL
```bash
# Rinnovo certificato
certbot renew --dry-run
certbot renew

# Restart nginx
systemctl restart nginx
```

### Database Issues
```bash
# Restart PostgreSQL
systemctl restart postgresql

# Check connessioni
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### Performance Issues
```bash
# Memory usage
free -h
pm2 monit

# Disk space
df -h

# Database size
sudo -u postgres psql -c "\l+"
```

## Security

### Firewall
```bash
# Status
ufw status

# Allow only necessary ports
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

### SSL Certificate Renewal
Il rinnovo è automatico, ma puoi verificare:
```bash
certbot certificates
systemctl status certbot.timer
```

### Database Security
```bash
# Change default passwords
sudo -u postgres psql
ALTER USER gestionale_user PASSWORD 'new_secure_password';
```

## Supporto

Per assistenza tecnica:
- Email: zambelli.andrea.1973@gmail.com
- Documentazione: inclusa nel pacchetto
- Log files: `/var/log/gestionale-sanitario/`

---

**Importante**: Salva sempre le credenziali di accesso e i backup in luogo sicuro!