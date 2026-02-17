# Guida Installazione SiteGround - Gestionale Sanitario

## Prerequisiti
- Account SiteGround attivo
- Accesso al cPanel
- File `gestionale-sanitario-completo.zip` scaricato (8MB)

## Passo 1: Accesso SiteGround

1. **Login SiteGround**
   - Vai su https://my.siteground.com
   - Inserisci le tue credenziali
   - Clicca su "Vai a cPanel" del tuo dominio

2. **Apri File Manager**
   - Nel cPanel, cerca "File Manager"
   - Clicca per aprire

## Passo 2: Preparazione Directory

1. **Naviga alla directory pubblica**
   - Clicca su `public_html` (per il dominio principale)
   - Oppure su `public_html/sottocartella` per sottodirectory

2. **Crea cartella per il gestionale** (opzionale)
   - Clicca "Nuova Cartella"
   - Nome: `gestionale` (o quello che preferisci)
   - Entra nella cartella creata

## Passo 3: Caricamento File

1. **Carica il file ZIP**
   - Clicca "Carica" nella toolbar
   - Seleziona `gestionale-sanitario-completo.zip`
   - Aspetta il completamento (8MB)

2. **Estrai il file ZIP**
   - Clicca con il tasto destro sul file ZIP
   - Seleziona "Extract" (Estrai)
   - Conferma l'estrazione
   - Elimina il file ZIP per liberare spazio

## Passo 4: Configurazione Database (Opzionale)

**Se vuoi usare MySQL invece di file JSON:**

1. **Crea Database MySQL**
   - Torna al cPanel
   - Apri "MySQL Databases"
   - Crea nuovo database: `gestionale_db`
   - Crea utente: `gestionale_user`
   - Assegna tutti i privilegi

2. **Configura connessione**
   - Torna al File Manager
   - Apri il file `.env` nel gestionale
   - Aggiungi: `DATABASE_URL=mysql://user:password@localhost/gestionale_db`

## Passo 5: Configurazione PHP

1. **Verifica versione PHP**
   - Nel cPanel, vai su "PHP Manager"
   - Assicurati di usare PHP 8.1 o superiore
   - Abilita le estensioni: `mysqli`, `pdo_mysql`, `curl`, `json`

2. **Configura limiti PHP**
   - Aumenta `max_execution_time` a 300
   - Aumenta `memory_limit` a 256M
   - Aumenta `upload_max_filesize` a 32M

## Passo 6: Installazione Node.js (Se supportato)

**Solo se SiteGround supporta Node.js sul tuo piano:**

1. **Installa Node.js**
   - Nel cPanel, cerca "Node.js"
   - Crea nuova applicazione Node.js
   - Seleziona la directory del gestionale
   - Versione Node.js: 18 o superiore

2. **Installa dipendenze**
   - Apri il terminale Node.js
   - Esegui: `npm install`
   - Esegui: `npm run build`

## Passo 7: Configurazione Web Server

### Opzione A: Hosting con Node.js
```javascript
// Nel cPanel Node.js, imposta:
// Startup File: server/index.js
// Application Mode: Production
```

### Opzione B: Solo PHP (Più comune)
1. **Crea file index.php** nella directory principale:
```php
<?php
// Reindirizza al file HTML principale
header('Location: gestionale-completo-con-database.html');
exit();
?>
```

## Passo 8: Configurazione Domini

1. **Configura sottodominio** (raccomandato)
   - Nel cPanel, vai su "Subdomains"
   - Crea: `gestionale.tuodominio.com`
   - Punta alla directory del gestionale

2. **Configura SSL**
   - Vai su "SSL/TLS"
   - Attiva SSL per il sottodominio

## Passo 9: Test Installazione

1. **Accedi al sistema**
   - Apri: `https://gestionale.tuodominio.com`
   - Oppure: `https://tuodominio.com/gestionale`

2. **Login di test**
   - Email: `admin@gestionale.local`
   - Password: `admin123`

3. **Verifica funzionalità**
   - Dashboard caricata
   - Lista clienti visibile
   - QR codes funzionanti

## Passo 10: Configurazione Email (Opzionale)

1. **Configura SMTP**
   - Nel File Manager, apri `.env`
   - Aggiungi le impostazioni SMTP di SiteGround:
   ```
   SMTP_HOST=mail.tuodominio.com
   SMTP_PORT=587
   SMTP_USER=noreply@tuodominio.com
   SMTP_PASS=password_email
   ```

## Risoluzione Problemi Comuni

### Errore 500 Internal Server Error
- Controlla i log degli errori nel cPanel
- Verifica permessi file (644 per file, 755 per cartelle)
- Controlla sintassi del file .htaccess

### Database non si connette
- Verifica credenziali MySQL
- Controlla che l'utente abbia tutti i privilegi
- Prova connessione da phpMyAdmin

### Node.js non disponibile
- Usa la versione PHP pura
- Tutti i file HTML funzionano senza Node.js
- Il sistema è completamente autocontenuto

### File upload non funziona
- Controlla limiti PHP (upload_max_filesize)
- Verifica permessi directory (775)
- Controlla spazio disco disponibile

## Backup e Sicurezza

1. **Backup automatico**
   - SiteGround fa backup giornalieri automatici
   - Puoi creare backup manuali dal cPanel

2. **Sicurezza**
   - Cambia password admin predefinita
   - Attiva SSL
   - Monitora accessi nei log

## Supporto

- **Email**: admin@gestionale.local
- **Documentazione**: Inclusa nel pacchetto
- **Video tutorial**: Disponibili nella cartella docs

---

**Il tuo gestionale sanitario è ora installato e funzionante su SiteGround!**