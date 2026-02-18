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