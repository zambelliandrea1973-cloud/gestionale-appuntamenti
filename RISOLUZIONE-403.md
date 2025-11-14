# RISOLUZIONE ERRORE 403 - BIOMEDICINAINTEGRATA.IT

## PROBLEMA
Il sito mostra "403 - Proibito" invece della homepage ripristinata.

## CAUSE POSSIBILI
1. **Permessi file errati** - index.php non ha permessi di lettura
2. **File mancante** - index.php non è nella directory corretta
3. **Cache server** - SiteGround ha cache attiva
4. **Configurazione .htaccess** - Regole che bloccano l'accesso

## SOLUZIONI IMMEDIATE

### Soluzione 1: Verifica Permessi File
Nel File Manager SiteGround:
1. **Tasto destro su `index.php`**
2. **Clicca "Permessi" o "Permissions"**
3. **Imposta su `644`** (lettura per tutti)
4. **Salva**

### Soluzione 2: Verifica Posizione File
Controlla che `index.php` sia in:
- `/public_html/` (directory root)
- NON in sottocartelle
- Il percorso deve essere esatto: `/public_html/index.php`

### Soluzione 3: Svuota Cache SiteGround
1. **Pannello SiteGround** → "Speed" → "Caching"
2. **Clicca "Flush Cache"** per svuotare cache
3. **Attendi 2-3 minuti**
4. **Riprova ad accedere al sito**

### Soluzione 4: Crea File .htaccess
Nel File Manager, crea nuovo file `.htaccess` con contenuto:
```
DirectoryIndex index.php index.html
Options +Indexes +FollowSymLinks
<Files "index.php">
    Require all granted
</Files>
```

### Soluzione 5: Verifica Nome File
Assicurati che il file si chiami esattamente:
- `index.php` (tutto minuscolo)
- NON `Index.php` o `INDEX.php`
- Estensione `.php` corretta

## TEST ALTERNATIVO

Se il problema persiste, testa direttamente il gestionale:
**Vai su `biomedicinaintegrata.it/gestionale-standalone.php`**

Se questo funziona, il problema è solo con index.php.

## VERIFICA RAPIDA

Per verificare se i file sono caricati correttamente:
1. Nel File Manager, clicca su `index.php`
2. Dovresti vedere il contenuto HTML/PHP
3. Controlla che la dimensione non sia 0 KB

## FALLBACK: File HTML Semplice

Se continua il problema, crea un file `index.html` invece di `index.php`:
```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Test Funzionamento</h1></body>
</html>
```

Se questo funziona, il problema è con PHP.

## SUPPORTO SITEGROUND

Se nulla funziona:
1. Contatta supporto SiteGround
2. Spiega: "Il mio sito mostra errore 403 dopo aver caricato index.php"
3. Chiedi di verificare permessi e configurazione PHP