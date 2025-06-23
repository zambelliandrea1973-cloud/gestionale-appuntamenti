# Gestionale Sanitario - Versione PHP

Versione PHP/MySQL del gestionale sanitario ottimizzata per hosting condiviso SiteGround.

## Installazione

1. Carica tutti i file nella directory principale del dominio
2. Crea un database MySQL dal pannello SiteGround
3. Modifica le credenziali in `includes/config.php`
4. Visita il sito - il database si inizializzerà automaticamente

## Credenziali di default
- Username: `admin`
- Password: `coverde79`

## Funzionalità
- Gestione clienti
- Sistema appuntamenti
- Generazione codici QR
- Accesso clienti tramite QR
- Interfaccia responsive
- PWA ready

## Configurazione Database
Modifica `includes/config.php` con i dati del tuo database SiteGround:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'il_tuo_database');
define('DB_USER', 'il_tuo_username');
define('DB_PASS', 'la_tua_password');
```

