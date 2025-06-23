# 🏥 GESTIONALE SANITARIO - ISTRUZIONI INSTALLAZIONE

## File da utilizzare: `gestionale-auto-installer.php`

Questo file contiene un installer autoinstallante completo che creerà automaticamente tutto il gestionale sanitario sul tuo sito.

## PROCEDURA DI INSTALLAZIONE

### 1. Upload del File
- Carica il file `gestionale-auto-installer.php` nella root del tuo sito web
- Assicurati che sia accessibile via browser

### 2. Accesso all'Installer
- Visita: **https://biomedicinaintegrata.it/gestionale-auto-installer.php**
- Si aprirà una pagina con form di installazione

### 3. Configurazione Database
Inserisci le credenziali del tuo database MySQL:

**Per SiteGround/hosting condiviso:**
- Host Database: `localhost`
- Nome Database: `dbv5hshva16sx` (o il nome che hai)
- Username Database: `ug87lyqbcduwf` (o il tuo username)
- Password Database: (lascia vuoto se non ce l'hai)

### 4. Installazione Automatica
- Clicca "Installa Gestionale Sanitario"
- Attendi qualche minuto per il completamento
- L'installer creerà automaticamente:
  - Tutte le cartelle necessarie
  - Tutti i file PHP, CSS, JavaScript
  - Le tabelle del database
  - L'utente amministratore

### 5. Accesso al Gestionale
Una volta completata l'installazione:

**URL Gestionale:** https://biomedicinaintegrata.it/gestionale-sanitario/

**Credenziali di accesso:**
- Username: `admin`
- Password: `coverde79`

## FUNZIONALITÀ INCLUSE

### Dashboard Amministrativa
- Gestione clienti completa
- Calendario appuntamenti
- Statistiche e report
- Configurazioni sistema

### Sistema QR Code
- Ogni cliente ottiene un codice QR unico
- Accesso diretto senza password
- Area clienti personalizzata

### App PWA per Clienti
- Accesso via QR: `https://biomedicinaintegrata.it/gestionale-sanitario/client-access.php?token=CODICE_QR`
- Visualizzazione appuntamenti personali
- Informazioni di contatto
- Installabile come app su smartphone

### API Complete
- `/api/dashboard.php` - Statistiche
- `/api/clients.php` - Gestione clienti
- `/api/appointments.php` - Appuntamenti
- `/api/qr-codes.php` - Codici QR

## SICUREZZA

### File Protetti
- `.htaccess` configurato per sicurezza
- File di configurazione protetti
- Headers di sicurezza attivati

### Accesso Clienti
- Accesso solo tramite token QR univoci
- Nessuna password richiesta per i clienti
- Isolamento completo tra clienti

## PERSONALIZZAZIONE

### Informazioni Azienda
Dopo l'installazione, accedi alle impostazioni per modificare:
- Nome attività
- Email di contatto
- Telefono
- Sito web

### Colori e Stili
I file CSS sono completamente personalizzabili:
- `css/style.css` - Interfaccia amministrativa
- `css/client-style.css` - Area clienti

## SUPPORTO

Se l'installazione non dovesse completarsi:

1. Verifica le credenziali del database
2. Controlla che PHP abbia i permessi di scrittura
3. Assicurati che MySQL sia attivo
4. Contatta il supporto hosting se necessario

## PULIZIA

Dopo l'installazione avvenuta con successo, puoi:
- Eliminare il file `gestionale-auto-installer.php`
- L'applicazione funzionerà indipendentemente

---

**Il gestionale è ora pronto per l'uso!**

Accedi con admin/coverde79 e inizia a configurare clienti e appuntamenti.