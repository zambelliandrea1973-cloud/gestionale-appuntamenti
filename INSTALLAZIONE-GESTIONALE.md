# Installazione Gestionale Sanitario WordPress

## Istruzioni per l'Installazione

### Passo 1: Download del Plugin
1. Scarica il file `wp-gestionale-plugin.php` dal tuo computer
2. Rinominalo in `gestionale-sanitario.php`

### Passo 2: Caricamento via FTP
1. Accedi al tuo hosting SiteGround tramite FTP o File Manager
2. Naviga in: `/public_html/wp-content/plugins/`
3. Crea una nuova cartella chiamata `gestionale-sanitario`
4. Carica il file `gestionale-sanitario.php` dentro questa cartella

### Passo 3: Attivazione Plugin
1. Accedi alla bacheca WordPress di biomedicinaintegrata.it
2. Vai in **Plugin > Plugin Installati**
3. Trova "Gestionale Sanitario" e clicca **Attiva**

### Passo 4: Verifica Installazione
Dopo l'attivazione dovresti vedere:
- Un nuovo menu "Gestionale" nella sidebar di WordPress
- Messaggio di successo dell'installazione

## Come Usare il Gestionale

### Accesso Amministratore
- Vai nel menu WordPress: **Gestionale**
- Oppure vai su: `biomedicinaintegrata.it/gestionale-admin`
- **Credenziali:**
  - Email: `busnari.silvia@libero.it`
  - Password: `gestionale2024!`

### URL Clienti QR
I clienti accedono tramite URL del tipo:
- `biomedicinaintegrata.it/cliente/CLI001`
- `biomedicinaintegrata.it/cliente/CLI002`

### Funzionalità Disponibili
1. **Dashboard**: Statistiche clienti e appuntamenti
2. **Gestione Clienti**: Aggiungi, modifica, visualizza clienti
3. **QR Code**: Genera codici QR per l'accesso clienti
4. **Area Cliente**: Pagina personalizzata per ogni cliente
5. **Contatti Studio**: Informazioni sempre aggiornate

## Test del Sistema

### Test Clienti di Esempio
Puoi testare immediatamente con questi clienti:
- **Cliente 1**: `biomedicinaintegrata.it/cliente/CLI001` (Mario Rossi)
- **Cliente 2**: `biomedicinaintegrata.it/cliente/CLI002` (Anna Verdi)

### Aggiungere Nuovi Clienti
1. Entra nel Gestionale (menu WordPress)
2. Clicca "Aggiungi Cliente"
3. Inserisci i dati del cliente
4. Il sistema genera automaticamente un codice QR unico
5. L'URL del cliente sarà: `biomedicinaintegrata.it/cliente/CODICE_QR`

## Vantaggi di questa Soluzione

### Sempre Online
- Il gestionale funziona 24/7 quando il tuo sito è online
- Nessuna dipendenza da Replit
- I tuoi staff possono accedervi sempre

### Integrazione WordPress
- Si integra perfettamente con il sito esistente
- Non interferisce con le funzionalità attuali
- Usa lo stesso hosting che già paghi

### Sicurezza
- Sistema di autenticazione integrato
- Dati salvati in modo sicuro sul tuo server
- Accesso clienti solo tramite codici QR specifici

### Gestione Semplice
- Interfaccia familiare WordPress
- Aggiunta clienti con pochi click
- QR code generati automaticamente

## Prossimi Passi

Una volta installato e testato, possiamo:
1. **Personalizzare**: Aggiungere il tuo logo e colori
2. **Espandere**: Aggiungere calendario appuntamenti
3. **Ottimizzare**: Migliorare l'interfaccia mobile
4. **Automatizzare**: Invio email con QR code

## Supporto

Se hai problemi:
1. Verifica che WordPress sia aggiornato
2. Controlla che la cartella del plugin abbia i permessi corretti (755)
3. Se vedi errori, attiva il debug WordPress temporaneamente

Il gestionale è progettato per essere stabile e non interferire con il sito esistente.