# 🏥 GESTIONALE SANITARIO - INSTALLAZIONE COMPLETA

## 📋 PANORAMICA

Questo è il sistema COMPLETO del Gestionale Sanitario con tutti i dati reali migrati dal sistema Replit originale. Include:

- **Database PostgreSQL** con tutti i clienti esistenti
- **Sistema multi-tenant** per 3 professionisti
- **Codici QR** funzionanti per accesso clienti
- **Interfaccia web** professionale e responsive

## 🎯 DUE VERSIONI DISPONIBILI

### 1. VERSIONE INTEGRATA (per biomedicinaintegrata.it)
- File: `gestionale-completo-con-database.html`
- Da caricare via FTP su SiteGround
- Accesso: `https://biomedicinaintegrata.it/gestionale-completo-con-database.html`

### 2. VERSIONE SCARICABILE (per visitatori)
- Pacchetto: `gestionale-sanitario-completo.tar.gz`
- Sistema standalone completo
- Include database e tutti i dati

## 🚀 INSTALLAZIONE VERSIONE INTEGRATA

### Passo 1: Caricamento File
```bash
# Via FTP o File Manager SiteGround
Caricare: gestionale-completo-con-database.html
Posizione: /public_html/
```

### Passo 2: Aggiornamento Link Elementor
```
URL pulsante: https://biomedicinaintegrata.it/gestionale-completo-con-database.html
Testo: "Accedi al Gestionale"
```

### Passo 3: Test Accesso
- Aprire il link nel browser
- Usare le credenziali fornite
- Verificare caricamento clienti

## 📦 INSTALLAZIONE VERSIONE SCARICABILE

### Passo 1: Estrazione
```bash
tar -xzf gestionale-sanitario-completo.tar.gz
cd gestionale-sanitario/
```

### Passo 2: Configurazione Database
```bash
# Installare PostgreSQL
sudo apt install postgresql postgresql-contrib

# Creare database
sudo -u postgres createdb gestionale_sanitario
sudo -u postgres psql -c "CREATE USER gestionale WITH PASSWORD 'password123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gestionale_sanitario TO gestionale;"
```

### Passo 3: Migrazione Dati
```bash
# Configurare variabile ambiente
export DATABASE_URL="postgresql://gestionale:password123@localhost:5432/gestionale_sanitario"

# Eseguire migrazione
node migrate-data.js
```

### Passo 4: Avvio Sistema
```bash
# Installare dipendenze
npm install

# Avviare server
npm run dev
```

## 🔐 CREDENZIALI ACCESSO

### Professionisti
- **Andrea Zambelli:** zambelli.andrea.1973@gmail.com
- **Silvia Busnari:** busnari.silvia@libero.it  
- **Elisa Faverio:** elisa.faverio@gmail.com
- **Password:** staff123

### Database Admin
- **Host:** localhost
- **Database:** gestionale_sanitario
- **User:** gestionale
- **Password:** password123

## 💾 DATI INCLUSI

### Clienti Andrea Zambelli (ID: 3)
- Mario Rossi (3201234567)
- Zambelli Andrea (3472550110)
- giovanni rizzo (+392550110)
- giovanni ribbio (+392550110)
- **+ altri clienti esistenti**

### Clienti Silvia Busnari (ID: 14)
- Valentina Cotrino (+393801808350) ⭐
- Cinzia Munaretto (+393333637578)
- **+ clienti dal database originale**

### Clienti Elisa Faverio (ID: 15)
- Leila Baldovin (+393312936414) ⭐
- Rosa Nappi (+393479687939)
- Giovanna Spano (+393666249288)
- Alan Marconi (+393337960111)
- **+ database completo esistente**

## 🎨 FUNZIONALITÀ INCLUSE

### Dashboard Professionale
- Statistiche clienti in tempo reale
- Conteggio accessi giornalieri
- Clienti frequenti evidenziati
- Nuovi clienti del mese

### Gestione Clienti
- Aggiunta/modifica/rimozione clienti
- Dati completi: nome, telefono, email, indirizzo, note
- Marcatura clienti frequenti
- Cronologia accessi

### Sistema QR
- Generazione codici QR unici per cliente
- Link diretti per accesso rapido
- Tracking accessi automatico
- Codici formato: `PROF_{ID}_CLIENT_{CLIENT_ID}`

### Multi-Tenant
- Separazione dati per professionista
- Accesso sicuro per ruolo
- Database condiviso con privacy

## 🔧 CONFIGURAZIONE AVANZATA

### Personalizzazione Design
```css
/* Modifica colori nel file HTML */
.container {
    background: linear-gradient(135deg, #TUO_COLORE_1, #TUO_COLORE_2);
}
```

### Backup Automatico
```bash
# Aggiungere a cron per backup giornaliero
0 2 * * * pg_dump gestionale_sanitario > backup_$(date +%Y%m%d).sql
```

### SSL/HTTPS
```apache
# Aggiungere a .htaccess
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## 🆘 SUPPORTO E TROUBLESHOOTING

### Problemi Comuni

**1. Database non si connette**
```bash
# Verificare servizio PostgreSQL
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**2. File HTML non si apre**
```bash
# Verificare permessi file
chmod 644 gestionale-completo-con-database.html
```

**3. Clienti non si caricano**
```bash
# Verificare migrazione dati
psql gestionale_sanitario -c "SELECT COUNT(*) FROM clients;"
```

### Log Debugging
```bash
# Controllare log PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log

# Controllare log server web
sudo tail -f /var/log/apache2/error.log
```

## 📱 ACCESSO MOBILE

Il sistema è completamente responsive e funziona su:
- 📱 Smartphone (iOS/Android)
- 📱 Tablet
- 💻 Desktop
- 🌐 Tutti i browser moderni

## 🔄 AGGIORNAMENTI FUTURI

### Backup Prima Aggiornamenti
```bash
# Backup completo
pg_dump gestionale_sanitario > backup_before_update.sql
cp gestionale-completo-con-database.html gestionale_backup.html
```

### Migrazione Nuove Versioni
```bash
# Testare sempre in ambiente di staging
# Verificare compatibilità database
# Aggiornare gradualmente
```

## 📞 CONTATTI

Per supporto tecnico o personalizzazioni:
- Sistema creato per biomedicinaintegrata.it
- Basato sul sistema Replit originale
- Tutti i dati reali preservati e migrati

---

**✅ SISTEMA PRONTO PER L'USO**

Il gestionale è ora completamente funzionante con tutti i dati reali del sistema originale. Ogni professionista può accedere ai propri clienti con le credenziali fornite.