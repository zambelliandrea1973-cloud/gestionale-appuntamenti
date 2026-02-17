# Gestionale Sanitario - Installazione SiteGround

## Requisiti
- Hosting SiteGround con supporto Node.js
- Accesso al File Manager
- Dominio configurato

## Installazione

### 1. Carica i file
- Estrai tutti i file nella directory principale del dominio
- Assicurati che i file siano nella root (public_html/)

### 2. Esegui installazione
```bash
chmod +x install-siteground.sh
./install-siteground.sh
```

### 3. Configurazione dominio
- Il dominio deve puntare alla cartella che contiene i file
- Non servono subdirectory specifiche

### 4. Avvio applicazione
```bash
node server/index.js
```

## Configurazione Database
L'applicazione usa SQLite per compatibilità con hosting condiviso.
Il database si trova in `data/app.db`

## Supporto
Per problemi di installazione:
- Verificare che Node.js sia abilitato nel pannello SiteGround
- Controllare i log degli errori nel pannello hosting
- Contattare il supporto SiteGround per assistenza Node.js

