# 🔍 Analisi Logo PWA: Replit vs Sliplane

## 📊 Situazione Attuale

### ✅ REPLIT (Funzionante)
- Logo personalizzato visualizzato correttamente
- Icone caricate dal database PostgreSQL

### ❌ SLIPLANE (Problema)
- Mostra icona di default "Fleur de Vie" invece del logo personalizzato
- **PRIORITÀ**: Identificare perché non carica il logo dal database

---

## 🗺️ Percorsi e Script Chiave

### 1. **Database PostgreSQL - Archiviazione Icone**

**Tabella:** `user_icons`
- **user_id**: ID dell'utente/professionista
- **icon_base64**: Immagine in formato base64 (data:image/jpeg;base64,...)
- **created_at**: Data creazione
- **updated_at**: Data ultima modifica

**Verifica Dati (Replit):**
```sql
SELECT user_id, LENGTH(icon_base64) as icon_size, created_at 
FROM user_icons 
ORDER BY user_id;

RISULTATO:
 user_id | icon_size |         created_at         
---------+-----------+----------------------------
       3 |    212927 | 2025-10-17 12:22:51.150232
      14 |    837291 | 2025-10-17 12:22:51.44779  ← SILVIA BUSNARI
      16 |      4123 | 2025-10-17 12:22:51.820521
```

✅ **User 14 (Silvia Busnari) ha un'icona di 837 KB nel database**

**🔥 VERIFICA CRITICA SU SLIPLANE:**
```bash
# Esegui questo comando su Sliplane per verificare se i dati ci sono
psql $DATABASE_URL -c "SELECT user_id, LENGTH(icon_base64) as icon_size FROM user_icons;"
```

---

### 2. **Server - Route Proxy Icone**

**File:** `server/icon-proxy.ts`

**Route:** `GET /pwa-icon/:size`

**Parametri:**
- `:size` - Dimensione icona (96x96, 192x192, 512x512)
- `?owner=X` - User ID del proprietario
- `?bust=X` - Cache busting timestamp

**Flusso Logica:**
```javascript
1. Riceve richiesta: /pwa-icon/192x192?owner=14
2. Carica icona dal database: storage.getUserIcon(14)
3. Se trovata → Ridimensiona con Sharp a 192x192
4. Se non trovata → Fallback a /public/icons/app_icon.jpg (Fleur de Vie)
5. Servi icona con headers Cache-Control
```

**Log Chiave da Cercare:**
```
🖼️ ICON PROXY DB: Richiesta icona 192x192 per owner 14
🖼️ ICON PROXY DB: Icona trovata per user 14: SÌ
✅ ICON PROXY DB: Servendo icona 192x192 per owner 14, dimensione: 245632 bytes
```

**Oppure (SE FALLBACK):**
```
🖼️ ICON PROXY DB: Icona trovata per user 14: NO
🖼️ ICON PROXY DB: Usando icona default per owner 14
📁 ICON PROXY DB: Fallback a icona statica: /public/icons/app_icon.jpg
```

---

### 3. **Server - Manifest Dinamico PWA Cliente**

**File:** `server/dynamic-manifest.ts`

**Route:** `GET /manifest.json`

**Parametri Query:**
- `?ownerId=14` - ID proprietario
- `?clientToken=PROF_014_...` - Token cliente completo
- `?v=timestamp` - Cache busting

**Generazione URL Icone:**
```javascript
const iconTimestamp = Date.now() + Math.random();
const iconBaseUrl = `/pwa-icon`;
const iconParams = `?owner=${ownerUserId || 'default'}&v=${iconTimestamp}&android=1`;

// Risultato:
"src": "/pwa-icon/192x192?owner=14&v=1729607832145.567&android=1"
```

**Log Chiave da Cercare:**
```
📱 PWA MANIFEST: Owner ID da query param: 14
📱 MANIFEST DINAMICO: Servendo manifest per Silvia Busnari (owner 14)
📱 MANIFEST ICONE: ["/pwa-icon/96x96?owner=14&v=...", ...]
```

---

### 4. **Frontend - HTML Head (Inizializzazione)**

**File:** `client/index.html` (righe 22-53)

**Script Inizializzazione Manifest:**
```javascript
// Estrae clientToken dall'URL
const pathMatch = window.location.pathname.match(/\/client\/(PROF_\d+_...)/);
const clientToken = pathMatch ? pathMatch[1] : null;

// Estrae ownerId dal token
let ownerId = localStorage.getItem('ownerId');
if (!ownerId && clientToken) {
  const ownerMatch = clientToken.match(/^PROF_(\d{2,3})_/);
  if (ownerMatch) {
    ownerId = ownerMatch[1]; // Esempio: "14"
  }
}

// Costruisce URL manifest con parametri
let manifestUrl = '/manifest.json?v=' + Date.now();
if (ownerId) {
  manifestUrl += '&ownerId=' + ownerId;
}
if (clientToken) {
  manifestUrl += '&clientToken=' + clientToken;
}

// Crea <link rel="manifest">
const manifestLink = document.createElement('link');
manifestLink.rel = 'manifest';
manifestLink.href = manifestUrl;
document.head.appendChild(manifestLink);
```

**URL Risultante Esempio:**
```
/manifest.json?v=1729607832145&ownerId=14&clientToken=PROF_014_9C1F_CLIENT_1750163505034_340F
```

---

### 5. **Frontend - Caricamento Icona (Componente)**

**File:** `client/src/components/AppIconUploader.tsx`

**Endpoint API:**
- `GET /api/client-app-info` - Ottiene info icona corrente
- `POST /api/reset-app-icon` - Ripristina icona default
- `GET /api/default-app-icon` - Info icona Fleur de Vie

**Flusso Caricamento:**
```javascript
1. Richiesta: GET /api/client-app-info
2. Risposta: { icon: "data:image/jpeg;base64,..." }
3. Verifica se è Fleur de Vie (lunghezza > 50000 bytes)
4. Mostra preview icona
```

**Log da Cercare:**
```javascript
console.log('🖼️ ICONA DEBUG:', {
  url: iconUrl.substring(0, 50) + '...',
  length: iconUrl.length,
  isFleurDeVie: isDefaultFleurDeVie,
  type: iconUrl.split(';')[0]
});
```

---

### 6. **Backend - Storage (Recupero Icona)**

**File:** `server/storage.ts` (righe 4712-4724)

**Metodo:** `getUserIcon(userId: number)`

```typescript
async getUserIcon(userId: number): Promise<string | undefined> {
  try {
    const [result] = await db
      .select()
      .from(userIcons)
      .where(eq(userIcons.userId, userId));
    
    return result?.iconBase64;
  } catch (error) {
    console.error(`Error getting icon for user ${userId}:`, error);
    return undefined;
  }
}
```

**Log da Cercare:**
```
Error getting icon for user 14: <errore database>
```

---

## 🔥 PUNTI CRITICI DA VERIFICARE SU SLIPLANE

### ✅ CHECKLIST DEBUGGING

#### 1. **DATABASE_URL Configurato?**
```bash
# Su Sliplane
echo $DATABASE_URL
# Deve essere lo stesso di Replit per database condiviso
```

#### 2. **Dati Icone Presenti nel Database?**
```bash
# Su Sliplane
psql $DATABASE_URL -c "SELECT user_id, LENGTH(icon_base64) as icon_size FROM user_icons WHERE user_id = 14;"

# ATTESO:
# user_id | icon_size 
# --------|----------
#      14 |    837291
```

#### 3. **Log Server Icon-Proxy**
Cerca nei log di Sliplane:
```bash
grep "ICON PROXY DB" /var/log/sliplane/app.log
grep "Icona trovata per user 14" /var/log/sliplane/app.log
```

**Scenari Possibili:**

**A) Icona Trovata:**
```
🖼️ ICON PROXY DB: Icona trovata per user 14: SÌ
✅ ICON PROXY DB: Servendo icona 192x192 per owner 14
```
→ **PROBLEMA RISOLTO**

**B) Icona NON Trovata:**
```
🖼️ ICON PROXY DB: Icona trovata per user 14: NO
🖼️ ICON PROXY DB: Usando icona default
```
→ **Dati non nel database** → Verifica DATABASE_URL

**C) Errore Database:**
```
Error getting icon for user 14: connect ECONNREFUSED
```
→ **DATABASE_URL sbagliato** → Verifica variabili ambiente

#### 4. **Log Manifest Dinamico**
Cerca nei log:
```bash
grep "MANIFEST DINAMICO" /var/log/sliplane/app.log
grep "Owner ID da query" /var/log/sliplane/app.log
```

**Verifica Che Riceva:**
```
📱 PWA MANIFEST: Owner ID da query param: 14
📱 MANIFEST ICONE: ["/pwa-icon/192x192?owner=14&v=..."]
```

#### 5. **Path Icone Statiche**
Verifica che esistano i file di fallback:
```bash
# Su Sliplane
ls -lh /path/to/app/public/icons/app_icon.jpg
ls -lh /path/to/app/public/icons/icon-192x192.png
```

---

## 🛠️ SOLUZIONI POSSIBILI

### Scenario 1: DATABASE_URL Non Configurato
**Sintomo:** Errori "Error getting icon"

**Soluzione:**
```bash
# Su Sliplane - Aggiungi variabile ambiente
export DATABASE_URL="postgresql://..."
# Riavvia app
pm2 restart gestionale-app
```

### Scenario 2: Dati Non nel Database
**Sintomo:** "Icona trovata: NO" ma Replit funziona

**Soluzione:**
```bash
# Verifica che Sliplane usi lo STESSO database di Replit
# DATABASE_URL deve essere identico su entrambi

# Se database separati, sincronizza manualmente:
psql $DATABASE_URL_SLIPLANE << EOF
DELETE FROM user_icons WHERE user_id = 14;
INSERT INTO user_icons (user_id, icon_base64, created_at, updated_at)
SELECT user_id, icon_base64, created_at, updated_at
FROM dblink('host=... dbname=... user=...', 
  'SELECT user_id, icon_base64, created_at, updated_at FROM user_icons WHERE user_id = 14')
AS t(user_id int, icon_base64 text, created_at timestamp, updated_at timestamp);
EOF
```

### Scenario 3: Cache Browser/Service Worker
**Sintomo:** Tutto corretto ma icona vecchia

**Soluzione:**
```javascript
// Forza aggiornamento Service Worker
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});

// Cancella cache
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});

// Ricarica hard
location.reload(true);
```

### Scenario 4: Sharp Non Installato su Sliplane
**Sintomo:** "Errore generazione icona"

**Soluzione:**
```bash
# Su Sliplane
npm install sharp --platform=linux --arch=x64
pm2 restart gestionale-app
```

---

## 📋 COMANDO DIAGNOSTICO COMPLETO PER SLIPLANE

```bash
#!/bin/bash
echo "🔍 DIAGNOSTICA ICONE PWA SU SLIPLANE"
echo "===================================="
echo ""

echo "1️⃣ VERIFICA DATABASE_URL"
echo "DATABASE_URL configurato: ${DATABASE_URL:+SÌ}"
echo ""

echo "2️⃣ VERIFICA CONNESSIONE DATABASE"
psql $DATABASE_URL -c "SELECT version();" 2>&1 | head -1
echo ""

echo "3️⃣ VERIFICA DATI ICONE NEL DATABASE"
psql $DATABASE_URL -c "SELECT user_id, LENGTH(icon_base64) as icon_size, created_at FROM user_icons WHERE user_id = 14;" 2>&1
echo ""

echo "4️⃣ VERIFICA FILE ICONE DEFAULT"
ls -lh public/icons/app_icon.jpg 2>&1
ls -lh public/icons/icon-192x192.png 2>&1
echo ""

echo "5️⃣ ULTIMI LOG SERVER (ultime 50 righe con ICON o MANIFEST)"
tail -100 /var/log/sliplane/app.log | grep -E "ICON|MANIFEST" | tail -20
echo ""

echo "6️⃣ TEST ROUTE /pwa-icon/192x192?owner=14"
curl -I "http://localhost:5000/pwa-icon/192x192?owner=14" 2>&1 | head -10
echo ""

echo "✅ DIAGNOSTICA COMPLETATA"
```

---

## 🎯 DIFFERENZE CHIAVE REPLIT vs SLIPLANE

| Aspetto | Replit | Sliplane | Note |
|---------|--------|----------|------|
| **DATABASE_URL** | ✅ Configurato | ❓ Da Verificare | Deve essere identico |
| **Dati userIcons** | ✅ Presenti (user 14: 837 KB) | ❓ Da Verificare | Query SQL necessaria |
| **Sharp Installato** | ✅ Sì | ❓ Da Verificare | Necessario per ridimensionamento |
| **File Default** | ✅ `/public/icons/app_icon.jpg` | ❓ Da Verificare | Fallback se DB fail |
| **Log Visibili** | ✅ Console Replit | ❓ `/var/log/sliplane/` | Path log da verificare |
| **Service Worker** | ✅ Stesso dominio | ❓ Cross-origin? | Verifica CORS |

---

## 📝 PROSSIMI PASSI

### 1. **Esegui Diagnostica su Sliplane**
```bash
# Salva lo script sopra come diagnostic.sh
chmod +x diagnostic.sh
./diagnostic.sh > diagnostic_output.txt

# Invia output a te per analisi
cat diagnostic_output.txt
```

### 2. **Confronta Log Replit vs Sliplane**
- Accedi a un cliente con QR code
- Confronta log console browser
- Confronta log server backend

### 3. **Test Manuale Route Icona**
```bash
# Su Sliplane
curl "http://localhost:5000/pwa-icon/192x192?owner=14" > test-icon.png
file test-icon.png
ls -lh test-icon.png
```

Se è PNG valido di 192x192 → **ICONA FUNZIONA**
Se è HTML/JSON error → **PROBLEMA ROUTE/DATABASE**

---

## ✅ RISULTATO ATTESO

Dopo la risoluzione:
- ✅ Logo personalizzato di Silvia Busnari visibile su PWA cliente
- ✅ Stessa icona su programma principale
- ✅ Nessun "Fleur de Vie" se logo personalizzato caricato
- ✅ Sincronizzazione Replit ↔ Sliplane perfetta

---

**Creato:** 22 Ottobre 2025  
**Versione:** 1.0  
**Autore:** Replit Agent
