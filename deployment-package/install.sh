#!/bin/bash

# Gestionale Sanitario - Script Installazione Automatica
# Per biomedicinaintegrata.it

set -e

echo "🏥 Gestionale Sanitario - Installazione Automatica"
echo "=================================================="

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni di utilità
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica privilegi root
if [[ $EUID -ne 0 ]]; then
   log_error "Questo script deve essere eseguito come root (sudo)"
   exit 1
fi

# Variabili configurazione
DOMAIN=${1:-"biomedicinaintegrata.it"}
APP_DIR="/var/www/gestionale-sanitario"
DB_NAME="gestionale_sanitario"
DB_USER="gestionale_user"
DB_PASS=$(openssl rand -base64 32)
ADMIN_PASS=$(openssl rand -base64 16)
NODE_VERSION="18"

log_info "Configurazione:"
log_info "  Dominio: $DOMAIN"
log_info "  Directory app: $APP_DIR"
log_info "  Database: $DB_NAME"

# 1. Aggiornamento sistema
log_info "Aggiornamento sistema..."
apt update && apt upgrade -y

# 2. Installazione Node.js
log_info "Installazione Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# 3. Installazione PostgreSQL
log_info "Installazione PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# 4. Installazione Nginx
log_info "Installazione Nginx..."
apt-get install -y nginx

# 5. Installazione PM2 per gestione processi
log_info "Installazione PM2..."
npm install -g pm2

# 6. Installazione Certbot per SSL
log_info "Installazione Certbot..."
apt-get install -y certbot python3-certbot-nginx

# 7. Configurazione PostgreSQL
log_info "Configurazione database..."
sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

# 8. Creazione directory applicazione
log_info "Creazione directory applicazione..."
mkdir -p $APP_DIR
cd $APP_DIR

# 9. Copia files applicazione (assumendo che siano nella stessa directory dello script)
log_info "Installazione files applicazione..."
cp -r ../gestionale-sanitario/* .

# 10. Installazione dipendenze
log_info "Installazione dipendenze Node.js..."
npm install --production

# 11. Configurazione environment
log_info "Configurazione environment..."
cat > .env <<EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME

# App Configuration
NODE_ENV=production
PORT=3000
DOMAIN=$DOMAIN

# Security
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASS

# Email Configuration (da configurare successivamente)
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

# SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/$DOMAIN/privkey.pem
EOF

# 12. Build applicazione
log_info "Build applicazione..."
npm run build

# 13. Configurazione Nginx
log_info "Configurazione Nginx..."
cat > /etc/nginx/sites-available/gestionale-sanitario <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration (sarà configurato da Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Static files
    location /static/ {
        alias $APP_DIR/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # App proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 14. Attivazione sito Nginx
ln -sf /etc/nginx/sites-available/gestionale-sanitario /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# 15. Configurazione PM2
log_info "Configurazione PM2..."
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'gestionale-sanitario',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/gestionale-sanitario/error.log',
    out_file: '/var/log/gestionale-sanitario/out.log',
    log_file: '/var/log/gestionale-sanitario/combined.log',
    time: true
  }]
};
EOF

# 16. Creazione directory log
mkdir -p /var/log/gestionale-sanitario
chown -R www-data:www-data /var/log/gestionale-sanitario

# 17. Setup database schema
log_info "Inizializzazione database..."
npm run db:push

# 18. Creazione utente admin
log_info "Creazione utente amministratore..."
node -e "
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('$ADMIN_PASS', 10);
  await pool.query(
    'INSERT INTO users (username, password, user_type, first_name, last_name) VALUES (\$1, \$2, \$3, \$4, \$5) ON CONFLICT (username) DO NOTHING',
    ['admin', hashedPassword, 'staff', 'Amministratore', 'Sistema']
  );
  console.log('Utente admin creato');
  process.exit(0);
}

createAdmin().catch(console.error);
"

# 19. Configurazione SSL con Let's Encrypt
log_info "Configurazione SSL..."
systemctl stop nginx
certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --agree-tos --non-interactive --email admin@$DOMAIN
systemctl start nginx

# 20. Avvio servizi
log_info "Avvio servizi..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

systemctl restart nginx
systemctl enable nginx

# 21. Configurazione firewall
log_info "Configurazione firewall..."
ufw allow 'Nginx Full'
ufw allow ssh
ufw --force enable

# 22. Setup backup automatico
log_info "Configurazione backup automatico..."
cat > /usr/local/bin/backup-gestionale.sh <<EOF
#!/bin/bash
BACKUP_DIR="/var/backups/gestionale-sanitario"
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR

# Backup database
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > \$BACKUP_DIR/db_\$DATE.sql.gz

# Backup files
tar -czf \$BACKUP_DIR/files_\$DATE.tar.gz -C $APP_DIR .

# Cleanup vecchi backup (mantieni 30 giorni)
find \$BACKUP_DIR -name "*.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-gestionale.sh

# Crontab per backup giornaliero
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-gestionale.sh") | crontab -

# 23. Configurazione logrotate
cat > /etc/logrotate.d/gestionale-sanitario <<EOF
/var/log/gestionale-sanitario/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload gestionale-sanitario
    endscript
}
EOF

# 24. Test finale
log_info "Test configurazione..."
nginx -t
pm2 status

log_success "🎉 Installazione completata!"
echo ""
echo "============================================"
echo "📋 INFORMAZIONI ACCESSO:"
echo "============================================"
echo "🌐 URL: https://$DOMAIN"
echo "👤 Username: admin"
echo "🔑 Password: $ADMIN_PASS"
echo ""
echo "============================================"
echo "📋 INFORMAZIONI TECNICHE:"
echo "============================================"
echo "📁 Directory app: $APP_DIR"
echo "🗄️  Database: $DB_NAME"
echo "📊 Monitoraggio: pm2 status"
echo "📝 Log: /var/log/gestionale-sanitario/"
echo "💾 Backup: /var/backups/gestionale-sanitario/"
echo ""
echo "============================================"
echo "⚠️  AZIONI SUCCESSIVE:"
echo "============================================"
echo "1. Configura DNS per puntare a questo server"
echo "2. Testa accesso: https://$DOMAIN"
echo "3. Configura email in .env"
echo "4. Personalizza nome studio"
echo "5. Aggiungi primi clienti"
echo ""
log_warning "SALVA QUESTE CREDENZIALI IN UN POSTO SICURO!"
echo ""