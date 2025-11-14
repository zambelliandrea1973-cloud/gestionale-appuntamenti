# GUIDA COMPLETA: Caricamento su SiteGround

## 🚨 PROBLEMA RISOLTO: Procedura Passo-Passo

### FASE 1: TEST DI CONNESSIONE

1. **Carica il file di test** `test-siteground.html` su SiteGround
   - Vai nel **File Manager** di SiteGround
   - Cartella: `public_html/`
   - Carica: `test-siteground.html`

2. **Testa la connessione**
   - URL: `https://biomedicinaintegrata.it/test-siteground.html`
   - Se vedi la pagina colorata con "Connessione Riuscita!" = OK
   - Se NON funziona = problema di caricamento base

### FASE 2: CARICAMENTO SISTEMA COMPLETO

Solo DOPO che il test funziona:

1. **Carica il gestionale completo**
   - File: `gestionale-completo-con-database.html`
   - Dove: `public_html/` (stessa cartella del test)
   - Nome finale: `gestionale-completo-con-database.html`

2. **URL finale**
   ```
   https://biomedicinaintegrata.it/gestionale-completo-con-database.html
   ```

### FASE 3: AGGIORNAMENTO WORDPRESS

1. **Modifica il pulsante Elementor**
   - Accedi a WordPress Admin
   - Trova la pagina con il pulsante gestionale
   - Modifica con Elementor
   - Trova il pulsante "Accedi al Gestionale"
   - Cambia URL con: `https://biomedicinaintegrata.it/gestionale-completo-con-database.html`

### FASE 4: VERIFICA FUNZIONALITÀ

1. **Test accesso**
   - Clicca sul pulsante dal sito
   - Dovrebbe aprire il gestionale
   - Prova login con: `zambelli.andrea.1973@gmail.com` / `staff123`

## 🔧 POSSIBILI PROBLEMI

### Problema: "File non trovato" (404)
**Causa**: File non caricato o nome sbagliato
**Soluzione**: 
- Verifica il file sia in `public_html/`
- Controlla il nome esatto del file
- URL deve essere identico al nome file

### Problema: "Pagina bianca"
**Causa**: File corrotto o incompleto
**Soluzione**:
- Ricarica il file completamente
- Verifica dimensione file (deve essere ~32KB)
- Prova prima con `test-siteground.html`

### Problema: "Accesso negato" (403)
**Causa**: Permessi file
**Soluzione**:
- Imposta permessi a 644
- Verifica proprietario file

## 📋 CHECKLIST COMPLETA

- [ ] Test connessione con `test-siteground.html`
- [ ] Caricamento `gestionale-completo-con-database.html`
- [ ] Verifica URL accessibile
- [ ] Aggiornamento pulsante Elementor
- [ ] Test login sistema
- [ ] Verifica dati clienti presenti

## 🆘 SE TUTTO FALLISCE

Se nessuna delle soluzioni funziona:

1. **Prova URL diretto nel browser**
2. **Controlla log errori SiteGround**
3. **Verifica .htaccess non blocchi file HTML**
4. **Contatta supporto SiteGround se persistono problemi**

---

**NOTA**: Il file `gestionale-completo-con-database.html` è completo e funzionale. Include tutti i dati reali dei clienti e non richiede server esterno per funzionare.