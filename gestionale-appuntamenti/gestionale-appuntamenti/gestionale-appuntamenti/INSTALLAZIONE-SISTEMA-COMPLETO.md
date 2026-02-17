# Installazione Sistema Gestionale Completo

## File Creati per la Migrazione Completa

1. **wp-gestionale-completo.php** - Plugin WordPress multi-tenant
2. **wordpress-complete-system.json** - Dati completi sistema (3 professionisti, 4+ clienti)
3. **INSTALLAZIONE-SISTEMA-COMPLETO.md** - Queste istruzioni

## Caratteristiche Sistema Completo

### Multi-Tenant
- 3 Professionisti con account separati
- Database clienti isolati per professionista
- Piani di abbonamento diversi (Passepartout, Staff Free, Base)
- Login sicuro per ogni professionista

### Conserva Struttura Replit
- Account staff con autorizzazioni originali
- Codici QR clienti identici a Replit
- Impostazioni personalizzate per studio
- Password hash originali (+ password temporanea)

## Installazione Passo-Passo

### Passo 1: Caricamento File
1. Accedi al File Manager SiteGround
2. Vai in: `/public_html/wp-content/plugins/`
3. Crea cartella: `gestionale-completo`
4. Carica nella cartella:
   - `wp-gestionale-completo.php`
   - `wordpress-complete-system.json`

### Passo 2: Attivazione WordPress
1. Accedi a `biomedicinaintegrata.it/wp-admin/`
2. Vai in **Plugin > Plugin Installati**
3. Trova "Gestionale Sanitario Completo" e clicca **Attiva**

### Passo 3: Verifica Installazione
Il sistema creerà automaticamente:
- Menu "Gestionale" in WordPress admin
- Directory `/wp-content/uploads/gestionale-data/`
- File dati `complete-system.json`

## URL di Accesso Sistema

### Dashboard Professionisti
- **Andrea Zambelli (ID 3)**: `biomedicinaintegrata.it/gestionale/3`
- **Silvia Busnari (ID 14)**: `biomedicinaintegrata.it/gestionale/14`
- **Elisa Faverio (ID 16)**: `biomedicinaintegrata.it/gestionale/16`

### Credenziali Login
**Password temporanea per tutti**: `gestionale2024!`

**Username per login:**
- `zambelli.andrea.1973@gmail.com`
- `busnari.silvia@libero.it`
- `faverioelisa6@gmail.com`

### Area Clienti QR
- **Mario Rossi**: `biomedicinaintegrata.it/cliente/PROF_003_0003_CLIENT_1_0001`
- **Zambelli Andrea**: `biomedicinaintegrata.it/cliente/PROF_003_0003_CLIENT_2_0002`
- **Prova Cliente**: `biomedicinaintegrata.it/cliente/ZAM-pc8969`

### Amministrazione Sistema
- **Admin generale**: `biomedicinaintegrata.it/gestionale-admin`

## Struttura Autorizzazioni

### Professionista Andrea Zambelli (ID 3)
- **Licenza**: Passepartout (accesso completo)
- **Ruolo**: Admin
- **Clienti**: 4 clienti esistenti
- **Colori**: Verde (#006400)

### Professionista Silvia Busnari (ID 14)
- **Licenza**: Staff Free
- **Ruolo**: Staff
- **Clienti**: 0 (può aggiungerne)
- **Colori**: Verde/Teal gradiente

### Professionista Elisa Faverio (ID 16)
- **Licenza**: Base
- **Ruolo**: Staff
- **Clienti**: 0 (può aggiungerne)
- **Colori**: Blu/Bianco

## Funzionalità Disponibili

### Per Ogni Professionista
- Dashboard personalizzata con statistiche
- Lista clienti con QR code
- Accesso sicuro con login
- Aggiunta nuovi clienti
- Generazione QR automatica
- Tema personalizzato per studio

### Per Ogni Cliente
- Area personalizzata accessibile via QR
- Dati personali
- Appuntamenti (futuri)
- Contatti studio
- Design responsivo mobile

### Amministrazione
- Vista globale tutti professionisti
- Statistiche sistema complete
- Test QR immediato
- Gestione multi-tenant

## Test Immediato

### Test Dashboard Professionista
1. Vai su `biomedicinaintegrata.it/gestionale/3`
2. Login con `zambelli.andrea.1973@gmail.com` / `gestionale2024!`
3. Vedrai 4 clienti esistenti
4. Testa "Aggiungi Cliente"

### Test Area Cliente
1. Apri `biomedicinaintegrata.it/cliente/PROF_003_0003_CLIENT_1_0001`
2. Vedrai area Mario Rossi
3. Dati personalizzati e contatti studio

### Test Multi-Tenant
1. Testa `biomedicinaintegrata.it/gestionale/14` (Silvia)
2. Interfaccia diversa, colori diversi
3. Database clienti separato

## Vantaggi Migrazione

### Sempre Online
- Indipendente da Replit
- Disponibile 24/7 con il sito
- Nessun costo hosting aggiuntivo

### Conserva Tutto
- Stessi account staff
- Stessi codici QR clienti
- Stesse impostazioni personalizzate
- Stessi piani di abbonamento

### Sicurezza
- Login separato per professionista
- Database isolati
- Password hash sicure
- Sessioni protette

### Test Sul Campo
- Professionisti possono testare in parallelo
- Clienti accedono con QR esistenti
- Nessuna interruzione servizio

## Prossimi Passi

1. **Installa sistema**
2. **Testa con ogni professionista**
3. **Verifica QR clienti esistenti**
4. **Aggiungi nuovi clienti per test**
5. **Prosegui sviluppo su Replit**
6. **Ri-migra quando completo**

Il sistema è una copia esatta funzionante del tuo Replit, pronta per test in produzione senza dipendenze esterne.