# Medical Practice Management System

## Overview
This React, TypeScript, and Node.js-based Progressive Web App (PWA) streamlines medical practice operations. It provides comprehensive features for patient, appointment, and staff management, QR code access, billing, multi-language support, and a staff referral and commission system. The system enhances patient engagement and offers efficient administrative tools, serving as a multi-platform solution for modern medical practice management with a focus on business growth through PRO and BUSINESS plans.

## User Preferences
- Preferred communication style: Simple, everyday language
- Development approach: Evaluate 2-3 alternatives before choosing the simplest, most robust solution
- Always focus on production-ready, battle-tested implementations
- Work independently and efficiently
- Keep dev and production environments synchronized

## ⚠️ NOTE IMPORTANTI - DIFFERENZE TRA AMBIENTI

### ENCRYPTION_KEY
- **Sliplane (produzione)**: Chiave di produzione configurata
- **Replit (sviluppo)**: NON configurata (usa chiave di default)
- Le password email cifrate su Sliplane NON sono leggibili su Replit (chiavi diverse)
- Per test email su Replit, reinserire la password manualmente

### Stripe (da completare)
1. **Vai su Stripe Dashboard** → https://dashboard.stripe.com/apikeys
2. **Modalità LIVE** (non Test)
3. **Aggiorna su Sliplane:**
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `VITE_STRIPE_PUBLIC_KEY` = `pk_live_...`
4. **Verifica `PAYMENT_MODE` = `production`**

### TODO: Richiesta OAuth Contatti Google (dopo i test)
- **Stato attuale**: Scope `contacts.readonly` disponibile solo per email tester
- **Azione richiesta**: Dopo completamento fase test Google Play (14 giorni), richiedere verifica OAuth per scope contatti
- **Dove**: Google Cloud Console → OAuth consent screen → Submit for verification
- **Scope da richiedere**: `https://www.googleapis.com/auth/contacts.readonly`
- **Callback URL da aggiungere**: `https://gestionale-appuntamenti.sliplane.app/api/google-auth/contacts/callback`

### TODO: Icone PWA multiple per stesso cliente (dopo i test)
- **Problema**: Se un cliente installa PWA di più professionisti, le icone si sovrascrivono (cache Android)
- **Soluzione proposta**: Modificare Service Worker per cache icone separate per ownerId
- **Rischio**: Modifica delicata, da fare solo dopo fase test completata
- **Workaround attuale**: Il nome sotto l'icona è diverso per ogni professionista

### TODO: Pricing geolocalizzato per paese (PPP - Purchasing Power Parity)
- **Stato**: Idea utente del 23 apr 2026 — DA VALUTARE dopo aver stabilizzato registrazioni Italia
- **Problema osservato**: 85% install da India/Etiopia/Congo con CPI €0,01 ma 0% conversione abbonamento perché €20/mese = troppo per quei mercati
- **Soluzione**: rilevare paese da IP (NON da lingua selezionata, altrimenti frode garantita) e applicare pricing differenziato
- **REGOLA CHIAVE SaaS**: prezzo sostenibile = 0,5% – 2% dello stipendio mensile target
  - Sotto 0,5% → lasci soldi sul tavolo
  - Sopra 2% → perdi conversioni
- **Fasce raffinate (ricerca utente 23 apr 2026 con stipendi medi reali)**:
  - 🇪🇺 Europa Ovest (IT/DE/FR/CH/ES) — stipendio medio €1.900-2.800
    - FREE: limitato (acquisizione)
    - PRO: €12-15/mese (sweet spot, 0,5-0,8% stipendio)
    - ANNUALE: €99-149/anno (sconto 30-40%)
  - 🇪🇺 Europa Est (RO/PL/HU/BG) — stipendio medio €700-1.200
    - PRO: €7-9/mese
    - ANNUALE: €59-79/anno
  - 🇨🇳 Cina — stipendio medio €1.300
    - PRO: €8/mese
    - ANNUALE: €69/anno
  - 🇷🇺🇹🇷 CIS/Turchia — stipendio medio €500-800
    - PRO: €5/mese
    - ANNUALE: €39/anno
  - 🇮🇳 India — stipendio medio €280-460 (4-5x meno di Cina)
    - PRO: €3/mese
    - ANNUALE: €29/anno
  - 🇵🇭🇮🇩🇲🇽🇧🇷 Altri emergenti — stipendio medio €400-700
    - PRO: €4/mese
    - ANNUALE: €35/anno
  - 🇪🇹🇨🇩🇳🇬 Africa — stipendio medio €100-300
    - PRO: €2/mese
    - ANNUALE: €19/anno
- **Concorrenti benchmark**: Booksy €20-30/mese, Fresha (free + commissioni), Treatwell (fee elevate)
- **Strategia obiettivo fase attuale**: NON massimizzare prezzo, ma trovare il prezzo massimo che NON blocca crescita
  - Parti basso → raccogli 100-200 utenti → alzi gradualmente
  - Freemium con limitazioni (clienti/appuntamenti) per acquisizione
- **Implementazione tecnica**:
  - Servizio geolocation IP: MaxMind GeoLite2 (gratis) o ipapi.co
  - Mappa paese → tier prezzo nel backend
  - Creare multipli `Price` objects su Stripe (Adaptive Pricing)
  - Mostrare prezzo localizzato in checkout
  - Bloccare cambio paese dopo iscrizione (anti-frode)
  - Verifica metodo pagamento (carta italiana → forza prezzo italiano)
- **Tempo stimato**: 2-3 giorni di sviluppo
- **Rischio frode VPN**: 5-10% leakage accettabile come costo del business
- **QUANDO IMPLEMENTARE**: dopo aver visto stabilizzazione registrazioni Italia con form semplificato

### TODO: Versione Hindi (हिन्दी) per mercato indiano
- **Stato**: Idea utente del 23 apr 2026 — DA VALUTARE solo se India mostra install ricorrenti dopo pricing PPP
- **Contesto**: India = 600M parlanti Hindi, ma professionisti business parlano già inglese (lingua business in India)
- **Complessità tecnica**: BASSA (sistema multilingua già pronto con file JSON)
  - Creare `client/src/locales/hi.json` con ~1500-3000 stringhe
  - Traduzione automatica iniziale via Claude/GPT in batch (1-2h)
  - Revisione madrelingua su Fiverr (€100-200, 2-3 giorni)
  - Font Devanagari già supportato in Inter/Roboto
  - **Totale: 1 giornata + €150 revisione**
- **Complessità commerciale**: ALTA
  - Servirebbe fatturazione GST India (18%)
  - Stripe India richiede entità legale indiana per pagamenti UPI/Rupay
  - Workaround iniziale: solo carte internazionali a prezzo USD
  - Supporto clienti fuso +4.5h
- **Lingue da considerare oltre Hindi**: Tamil, Telugu, Bengali (regionali, milioni di parlanti)
- **PRECONDIZIONE**: prima implementare pricing PPP, poi valutare se India genera abbastanza utenti paganti per giustificare investimento commerciale
- **QUANDO IMPLEMENTARE**: solo dopo 1-2 mesi di dati con pricing PPP attivo

### Dati osservati il 23 apr 2026 (riferimento per future decisioni)
- Google Ads UAC: 927 clic in 7 giorni, CTR 20.93%, 4,43K impression
- Saldo €4,15, prossimo pagamento 1 mag o a soglia €50
- Optimization score Google Ads: 78%
- Play Console KPI: 112 install totali, 99 dispositivi attivi, +500% crescita pubblico
- Distribuzione geografica: maggioranza schiacciante India + altri mercati emergenti
- Targeting attuale Google Ads: "Tutti i paesi e i territori" (da rivedere con strategia PPP)

### TODO: Multi-Calendar Sync per Staff (feature premium futura)
- **Stato**: Richiesta dall'utente il 23 apr 2026 — DA RIPROPORRE quando iniziano le registrazioni nuove
- **Idea**: Permettere a ogni professionista di uno studio (es. 10 staff) di collegare il PROPRIO Google Calendar
- **Oggi**: 1 account utente → 1 sincronizzazione Google Calendar (solo titolare)
- **Domani**: ogni staff sincronizza il suo Gmail, gli appuntamenti vanno al calendario del professionista assegnato
- **Vista calendario**: filtri colorati per staff, toggle on/off, vista "resource view" (colonne affiancate per professionista)
- **Posizionamento commerciale**: feature premium / piano "Studio Pro" superiore a quello attuale
- **Considerazioni**: gestione conflitti slot, monitoraggio quota OAuth Google con molti account collegati
- **QUANDO RIPROPORRE**: appena vediamo nuove registrazioni stabili dopo le modifiche di onboarding del 23 apr 2026

### TODO: Drag & Drop appuntamenti nel calendario (dopo pubblicazione)
- **Funzionalità**: Trascinare gli appuntamenti con il dito per spostarli su altri orari/giorni
- **Rischio**: Alto — il calendario è il componente più critico (appuntamenti, notifiche, Google Sync, multi-stanza)
- **Quando**: Solo dopo pubblicazione su Google Play, come aggiornamento separato
- **Note**: Su mobile il drag interferisce con lo scroll — richiede implementazione attenta
- **Approccio**: Implementare in modo isolato senza toccare la logica esistente degli appuntamenti

### Dialog Mobile - Soluzione Definitiva
- **Dialog `modal={false}`**: disattiva `react-remove-scroll` che bloccava touch events
- **Breakpoint `min-[1200px]:`** invece di `md:` — Chrome "modalità desktop" ha viewport ~980px
- **MAI usare `touch-pan-y`** sui form scrollabili — blocca pinch-to-zoom! Usare `touch-manipulation`
- **CSS media query `max-width: 1199px`** in index.css come fallback per dimensioni/font
- **Inline styles** su DialogContent per width (95vw) come garanzia
- **User-Agent**: Chrome mobile in "modalità desktop" invia `X11; Linux x86_64`

## System Architecture

### UI/UX Decisions
- Modern card-based layouts for administrative dashboards.
- Color-coded status indicators and inline editing.
- Fully responsive design.
- Clear "Pro Features" section with feature gates.
- Simplified setup pages with minimal steps.
- Functional footer with proper navigation.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS with Radix UI, React Query, Wouter for routing, React Hook Form with Zod, PWA capabilities.
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM, session-based authentication with role-based access control.
- **Database**: PostgreSQL (Neon-backed) shared between Replit development and Sliplane production.
- **Multi-Tenant Security**: Strict data isolation using `ownerId/userId` filtering.
- **Google Calendar Integration**: OAuth 2.0 with dynamic domain support, bidirectional sync, per-user authorization, conflict detection.
- **Multi-Room Booking System**: Intelligent appointment scheduling with automatic assignment.
- **Promotional Packages System**: PRO feature for creating and selling multi-treatment packages.
- **Trial Blocking System**: Automatic access restriction for expired trials.
- **Referral Commission System**: 25% commissions for staff referrals.
- **Data Persistence**: All critical data migrated from JSON to PostgreSQL, ensuring persistence and multi-tenant isolation.
- **Subscription Plans**: Implemented with clear feature gating for BASE, PRO, BUSINESS, TRIAL, and PASSEPARTOUT plans.

### Feature Specifications
- **User Management**: Multi-tier authentication and role-based access.
- **Client Management**: Patient database, QR code generation, access tracking.
- **Appointment System**: Calendar scheduling, multi-room support, staff preferences, email/WhatsApp notifications, Google Calendar sync (PRO).
- **Billing & Payments**: Multiple payment methods, subscription plans, invoice generation, referral commissions.
- **Multi-language Support**: Full internationalization for 9 languages.
- **Google Calendar Sync (PRO)**: Automatic export, manual import, multi-tenant support, bidirectional sync.
- **Database Synchronization**: Real-time sync between development and production environments.

### File Upload Migration to Cloudflare R2 (completato 06/04/2026)
- **Object storage**: File salvati su Cloudflare R2 (S3-compatible), DB tiene solo metadati + riferimento `r2://key`
- **Fallback**: Se R2 non configurato, fallback automatico a base64 in PostgreSQL
- **Tabella**: `file_uploads` con colonne: id, user_id, category, filename, mime_type, size, data (r2://key o base64), metadata (JSON), created_at
- **Servizio centralizzato**: `server/services/fileStorageService.ts` — saveFile, getFile, deleteFile, getFilesByCategory (R2 + fallback DB)
- **Route servizio file**: `server/routes/fileRoutes.ts` — GET `/api/files/:id/:filename` con cache immutabile
- **File aggiornati**: `clientNoteRoutes.ts`, `inventory-routes.ts`, `promotionRoutes.ts`, `manualRoutes.ts` — tutti convertiti a memoryStorage + R2
- **Retrocompatibilità**: `express.static('/uploads')` rimane per file pre-migrazione
- **Env vars R2**: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Categorie file**: `client-notes`, `products`, `promotions`, `manual`

### Route Modularization (completato 05/04/2026)
- **simple-routes.ts**: Ridotto da 10,342 a ~593 righe (-94%)
- **Contenuto residuo**: register, mobile-sync, Google Calendar debug/sync, route mounting, imports
- **Route files estratti** (in `server/routes/`):
  - `collaboratorRoutes.ts` — Collaboratori CRUD
  - `treatmentRoomRoutes.ts` — Stanze trattamento CRUD
  - `clientNoteRoutes.ts` — Note clienti con upload foto (multer)
  - `subscriptionPlanRoutes.ts` — Piani abbonamento CRUD (admin)
  - `serviceRoutes.ts` — Servizi CRUD con anti-cache mobile
  - `consentRoutes.ts` — Consensi GDPR (GET/POST)
  - `appointmentRoutes.ts` — Appuntamenti CRUD + booking requests + Google Calendar sync
  - `clientRoutes.ts` — Clienti CRUD + import CSV + migrazione codici
  - `settingsRoutes.ts` — Contact info, working hours, license, app icons, company settings, currency
  - `staffCommissionRoutes.ts` — Staff management, referral codes/overview, commissioni CRUD
  - `passwordResetRoutes.ts` — Forgot/verify/reset password con rate limiting
  - `adminClientRoutes.ts` — Admin clients-summary, clients-by-owner, notifications
  - `clientAccessRoutes.ts` — Client DELETE, activation-token, QR verify-token, client-access count, /activate, client-by-code, client-appointments
  - `invoiceRoutes.ts` — Fatture CRUD, PDF generation, email invio, packages/pacchetti promozionali
  - `clientAreaRoutes.ts` — Area clienti QR code, /api/simple/client/*, unlock/mark deleted
  - `emailConfigRoutes.ts` — Email calendar settings, test email, SMTP config
  - `pwaRoutes.ts` — PWA icons, client-access tracking, last-access, reminder flags, icon upload
  - `campaignRoutes.ts` — Marketing campaigns, AI chat, onboarding, test endpoints
- **Pattern**: Express Router, import `storage`/`db` direttamente, montati via `app.use()` in simple-routes.ts
- **Middleware condiviso**: `server/middleware/authMiddleware.ts` (requireAuth)
- **Nota**: drizzle tables importati con alias (es. `invoices as invoicesTable`) nei file dove variabili locali `storageData.invoices` causerebbero shadowing

### Stability & Security Improvements (completato 05/04/2026)
- **Concurrency Control**: Appointment creation uses DB transaction with conflict check (same room/staff overlap prevention, returns 409 on conflict)
- **Async Campaign Batch**: Campaign email sending is fire-and-forget (responds immediately, processes in background via `setImmediate`)
- **Structured Logger**: `server/utils/logger.ts` — configurable log levels (debug/info/warn/error), production defaults to `warn` via `LOG_LEVEL` env var
- **Logging Reduction**: ~400+ verbose `console.log` converted to `logger.debug` across routes, storage, services, auth — silenced in production
- **Unit Tests**: `vitest` with 21 tests covering appointment conflict detection, password hashing, session serialization, tenant isolation, logger behavior. Run with `npx vitest run --config vitest.config.ts`

### Pre-Publication Security Hardening (completato 06/04/2026)
- **ALL hardcoded passwords removed**: `gironico`, `EF2025Admin`, `gironico-restart-2025` eliminated from all active server/client code
- **Dev-only bypass via env vars**: `DEV_ADMIN_PASSWORD`, `BETA_ADMIN_PASSWORD`, `BETA_ADMIN_PASSWORD_2`, `EMERGENCY_RESTART_KEY` — active ONLY when `NODE_ENV !== 'production'` AND env var is set
- **Files cleaned**: `adminRoutes.ts`, `paymentAdminAuth.ts`, `licenseRoutes.ts`, `betaRoutes.ts`, `auth.ts`, `BetaAdmin.tsx`, `queryClient.ts`
- **localStorage auth removed**: BetaAdmin uses sessionStorage only (password not persisted across sessions)
- **API body logging removed**: `server/index.ts` no longer captures/logs JSON response bodies (only method/path/status/duration)
- **x-bypass-auth fully removed**: Server + client, no bypass possible
- **PWA token POST**: `localStorageClient.ts` sends token in POST body, not query string
- **Header logging removed**: Beta/payment admin middleware no longer logs request headers
- **Legacy files deleted**: `backup/` (138MB), `backups/` (17MB), `siteground-deployment/` (12MB), `deployment-package/` (12MB), `src/` (2.9MB stale), `Settings.tsx` — total ~182MB removed
- **Dual encryption modules**: `server/services/encryption.ts` (CryptoJS/AES) and `server/utils/encryption.ts` (Node crypto/AES-256-GCM) coexist intentionally — different consumers, do NOT merge
- **Production env vars needed on Sliplane**: `BETA_ADMIN_PASSWORD` (for beta admin access), `EMERGENCY_RESTART_KEY` (for emergency restart). Without these, beta admin and emergency restart are disabled in production.

### Security Hardening (completato 02/04/2026)
- **Helmet**: header di sicurezza HTTP attivi (X-Frame-Options, HSTS, X-Content-Type-Options, etc.)
- **Body limit**: ridotto da 1GB a 10MB (sufficiente per icone base64)
- **ENCRYPTION_KEY**: fail-fast in produzione (process.exit(1) se mancante)
- **SESSION_SECRET**: fail-fast in produzione
- **Rate limiting**: login (10/15min), forgot/reset password (5/15min)
- **Token OAuth**: revoca via POST body (non query string), auto-refresh salvato in DB
- **Token sync Google**: non più cancellato su errore temporaneo, solo disabilitazione sync
- **File legacy rimossi**: routes-backup, Clients-old, simple-storage, cartella gestionale-appuntamenti (4.2GB backup)

### Google Play Store — Chiavi di Firma
- **Percorso chiavi sul PC dell'utente**: `OneDrive > ANDREA - Munit SA > Desktop > gestionale app - package`
- **File importanti**:
  - `signing.keystore` — chiave di firma per Google Play (NON perdere mai!)
  - `signing-key-info.txt` — contiene password e alias
  - `upload_certificate.pem` — certificato PEM caricato su Google Play
  - `password keystore abb` — file promemoria password
- **Password keystore**: `tWKRLzoGlxjf`
- **Alias chiave**: `my-key-alias`
- **File .aab**: `gestionale appuntamenti.aab` (pacchetto per Google Play)
- **File .apk**: `gestionale appuntamenti.apk` (per test diretto)
- **REGOLA FONDAMENTALE**: Per ogni nuova release, usare SEMPRE lo stesso `signing.keystore`. Se PWABuilder ne genera uno nuovo, il caricamento su Google Play fallirà.
- **Copia di backup su Replit**: `attached_assets/signing_1776157050094.keystore`

### Deployment Strategy
- **Development**: Replit (`https://wife-scheduler-zambelliandrea1.replit.app`).
- **Production**: Sliplane (`https://gestionale-appuntamenti.sliplane.app`).
- **Database**: Shared PostgreSQL instance.
- **Build command**: `npm run build`.

### Procedura Deploy in Produzione
1. **Da Replit**: Push su GitHub con `git push origin main` (lo fa l'agente automaticamente)
2. **L'utente**: Da Sliplane fa il deploy manualmente dal suo pannello
- **NOTA**: `git push sliplane main` dalla shell di Replit NON funziona (DNS bloccato). NON tentare.
- L'utente ha Git configurato sul suo PC e collegato a Sliplane.
- Flusso: Replit → GitHub → Sliplane (deploy manuale dall'utente)

## External Dependencies

### Database
- PostgreSQL (Neon-backed)

### Email Services
- SMTP
- Gmail
- SendGrid

### Payment Services
- Stripe
- PayPal SDK

### Cloud Services
- Google OAuth 2.0 (Calendar sync)
- Google Calendar API
- Google Gmail API
- Google Search Console

### Environment Variables
- `PRODUCTION_DOMAIN`
- `ENCRYPTION_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`