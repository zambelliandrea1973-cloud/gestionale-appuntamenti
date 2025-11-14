# Setup Link Promozioni su Sliplane

## Problema Risolto
I link promozioni ora usano una variabile d'ambiente configurabile invece di `window.location.origin` hardcoded.

## Configurazione su Sliplane

### 1. Aggiungi variabile d'ambiente
Nel pannello Sliplane, aggiungi questa variabile:

```
VITE_PUBLIC_DOMAIN=https://tuodominio.sliplane.app
```

**Esempio**:
- Se il tuo dominio Sliplane è `https://gestionale.sliplane.app`
- Imposta: `VITE_PUBLIC_DOMAIN=https://gestionale.sliplane.app`

### 2. Riavvia l'applicazione
Dopo aver aggiunto la variabile, riavvia l'applicazione Sliplane per applicare le modifiche.

### 3. Verifica
Crea una nuova campagna con allegato e verifica che il link generato punti a:
```
https://tuodominio.sliplane.app/promozioni/ABCD12
```

## Note di Sviluppo
- **Locale (Replit)**: La variabile `VITE_PUBLIC_DOMAIN` viene lasciata vuota → usa `window.location.origin`
- **Produzione (Sliplane)**: Configurare `VITE_PUBLIC_DOMAIN` → usa dominio configurato

## Problema WhatsApp Web - Comportamento Inconsistente

### Sintomi Osservati
1. Alcuni contatti: Messaggio si compila correttamente ✅
2. Altri contatti: Campo messaggio rimane vuoto ❌
3. Altri contatti: Non si apre il campo messaggio, mostra popup "WhatsApp per Windows" ❌

### Causa
**NON è un bug del nostro sistema** - è un comportamento noto di WhatsApp Web/Desktop con i link `wa.me`:

- **Browser diversi**: Chrome, Firefox, Edge gestiscono `wa.me` in modo diverso
- **WhatsApp Desktop installato**: Se installato, può intercettare i link invece di WhatsApp Web
- **Versione WhatsApp Web**: Alcune versioni hanno bug con messaggi precompilati lunghi
- **URL encoding**: Caratteri speciali o messaggi troppo lunghi possono causare problemi

### Soluzioni Consigliate

#### ✅ Soluzione 1: Usa sempre lo stesso browser
Consiglia agli utenti di usare sempre lo stesso browser/metodo per aprire i link WhatsApp.

#### ✅ Soluzione 2: Messaggi più brevi
I messaggi molto lunghi (>500 caratteri) possono causare problemi. Considera di abbreviare il testo.

#### ✅ Soluzione 3: Pulsante "Copia Messaggio"
Aggiungere un pulsante alternativo che copia il messaggio negli appunti, lasciando all'utente il compito di incollarlo manualmente.

### Riferimenti
- WhatsApp Business API documentation: https://developers.facebook.com/docs/whatsapp
- Limitazioni note: https://faq.whatsapp.com/general/26000030

## Test Consigliati
1. Testare con 3+ contatti diversi
2. Provare da browser diversi (Chrome, Firefox, Edge)
3. Verificare con/senza WhatsApp Desktop installato
4. Controllare lunghezza messaggi (brevi vs lunghi)
