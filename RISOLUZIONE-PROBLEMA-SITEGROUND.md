# RISOLUZIONE PROBLEMA SITEGROUND - GUIDA RAPIDA

## SITUAZIONE ATTUALE
- File `gestionale-completo-con-database.html` pronto (32KB, tutti i dati reali inclusi)
- File `test-siteground.html` per verifica connessione creato
- Sistema completo con 60+ clienti reali (Andrea, Silvia, Elisa)

## PROCEDURA CORRETTA

### STEP 1: Test Connessione Base
```
1. Carica SOLO il file: test-siteground.html
2. Posizione: public_html/ di SiteGround 
3. Testa URL: https://biomedicinaintegrata.it/test-siteground.html
4. Deve mostrare pagina colorata "Connessione Riuscita!"
```

### STEP 2: Caricamento Sistema Completo
```
1. Solo DOPO che Step 1 funziona
2. Carica: gestionale-completo-con-database.html  
3. Stessa cartella: public_html/
4. URL finale: https://biomedicinaintegrata.it/gestionale-completo-con-database.html
```

### STEP 3: Aggiornamento Pulsante WordPress
```
1. WordPress Admin → Pagine → Trova pagina con pulsante gestionale
2. Modifica con Elementor
3. Trova pulsante "Accedi al Gestionale" 
4. Cambia URL: https://biomedicinaintegrata.it/gestionale-completo-con-database.html
5. Salva e pubblica
```

## CREDENZIALI DI TEST
```
Email: zambelli.andrea.1973@gmail.com
Password: staff123

Email: busnari.silvia@libero.it  
Password: staff123

Email: elisa.faverio@gmail.com
Password: staff123
```

## VERIFICA RAPIDA FUNZIONALITÀ
- Login con una delle credenziali sopra
- Verifica presenza clienti nell'elenco
- Test creazione nuovo appuntamento
- Verifica QR code generation funziona

## PROBLEMI COMUNI E SOLUZIONI

### Problema: "File non trovato" (404)
**Causa**: Nome file errato o posizione sbagliata
**Soluzione**: Verifica file sia esattamente in `public_html/` con nome identico

### Problema: "Pagina bianca" 
**Causa**: File corrotto durante upload
**Soluzione**: Ricarica file, verifica dimensione 32KB

### Problema: "Accesso negato" (403)
**Causa**: Permessi file
**Soluzione**: Imposta permessi 644 nel File Manager

### Problema: Login non funziona
**Causa**: JavaScript disabilitato o errore caricamento
**Soluzione**: Verifica console browser per errori

## CONTATTI EMERGENZA
Se persistono problemi tecnici:
1. Supporto SiteGround per problemi server
2. Verifica .htaccess non blocchi file HTML
3. Test con browser diverso/incognito

---
**NOTA**: Il sistema è completamente standalone, non richiede database esterno o configurazioni aggiuntive.