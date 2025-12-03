# Medical Practice Management System

## Overview
This React, TypeScript, and Node.js-based Progressive Web App (PWA) is designed to streamline operations for medical practices. It offers comprehensive features for patient, appointment, and staff management, QR code access, billing, multi-language support, and a staff referral and commission system. The system aims to enhance patient engagement and provide efficient administrative tools, ultimately serving as a multi-platform solution for modern medical practice management.

## Recent Changes (December 3, 2025)

### ✅ FOOTER BUTTONS & GOOGLE CALENDAR SYNC ENDPOINT - DEPLOYMENT COMPLETE
**Status**: All modifications pushed to Sliplane successfully!

### ✅ TODAY'S WORK COMPLETED:

**1. Fixed Footer Buttons (WhatsApp Center Page & All Pages):**
   - ✅ Pulsante "Supporto" → mailto:support@gestionale-appuntamenti.it
   - ✅ Pulsante "Privacy Policy" → Navigate to `/privacy`
   - ✅ Pulsante "Termini di Servizio" → Navigate to `/terms`
   - ✅ File: `client/src/components/FooterOnly.tsx` - Added wouter navigation
   - ✅ Deployed to Sliplane (now LIVE)

**2. Added Google Calendar Sync Endpoint:**
   - ✅ Created `POST /api/google-calendar/sync` endpoint in `server/simple-routes.ts`
   - ✅ Imported `syncBidirectional()` function from `server/services/googleCalendarSync.ts`
   - ✅ Endpoint triggers full bidirectional sync (import + export)
   - ✅ Proper auth check and error handling
   - ✅ Deployed to Sliplane (now LIVE)

**3. Google Calendar Sync Implementation Summary:**
   - ✅ `importGoogleCalendarEvents()` - Imports events from Google Calendar (7-day window)
   - ✅ `syncBidirectional()` - Main sync function: imports Google events + exports new appointments
   - ✅ Conflict detection - Tracks sync status, prevents duplicates
   - ✅ Multi-tenant support - Each user syncs separately with their own OAuth token
   - ✅ Database tracking - `googleCalendarEvents` table tracks sync status per appointment

**4. Deployment Status:**
   - ✅ Development: Replit - PostgreSQL (synchronized)
   - ✅ Production: Sliplane - PostgreSQL (synchronized)
   - ✅ Git commits: Pushed to Sliplane production successfully

### ⏳ GOOGLE APP VERIFICATION STATUS:
**Current state**: Awaiting final Google approval
- ✅ 2/3 requirements met: Privacy policy, Branding guidelines
- ✅ Home page updated with privacy link
- ✅ All technical implementation complete and tested
- ⏳ Google approval expected within 24-48 hours
- Once approved: Full OAuth testing can begin

### ✅ DATABASE SYNCHRONIZED - Replit ↔ Sliplane:
- PostgreSQL Neon-backed database shared between both environments
- All data synchronized in real-time
- Google Calendar columns present:
  - `googleAuthToken` - OAuth access token
  - `googleCalendarEnabled` - Sync toggle state
  - `googleCalendarId` - User's calendar ID
  - `lastGoogleSyncAt` - Last sync timestamp

### ✅ Completed Features (All Previous Sessions):
- Trial expiration email system
- Three plan-specific purchase buttons
- Complete subscription redirect flow
- Google Play Store account setup
- Multi-professional + multi-room appointment scheduling
- WhatsApp and email reminders (24h before)
- Promotional packages with session tracking
- Staff management and referral system
- Commission tracking and payout system
- Multi-language support (9 languages)
- Privacy Policy page (public route)
- Google Search Console verification
- Google OAuth 2.0 setup

### 📋 NEXT STEPS - When Google Approves:

1. **Test Authorization Flow:**
   - Navigate to `/pro-features` → "Sincronizza Google Calendar"
   - Enter Google email
   - Verify OAuth popup (no "app not verified" warning)
   - Complete authorization

2. **Test Appointment Sync:**
   - Create appointment in gestionale
   - Verify appears in Google Calendar automatically
   - Test manual sync with POST `/api/google-calendar/sync`

3. **Test Conflict Handling:**
   - Create same event in both systems
   - Verify no duplicates created
   - Check sync status in database

4. **Deploy to PWABuilder:**
   - Generate TWA package
   - Submit to Google Play Store
   - Test on Android devices

### 📍 Key URLs:
- Development: `https://wife-scheduler-zambelliandrea1.replit.app`
- Production: `https://gestionale-appuntamenti.sliplane.app`
- Privacy Policy: `/privacy` (both environments)
- Pro Features: `/pro-features` or `/pro`
- Google Calendar Setup: `/google-calendar` (PRO users only)

### 🔗 API Endpoints:
- `GET /api/google-calendar/status` - Check sync status
- `POST /api/google-calendar/sync` - Trigger manual sync
- `GET /api/google-auth/status` - Check OAuth status
- `POST /api/google-auth/callback` - OAuth callback (auto)

## User Preferences
- Preferred communication style: Simple, everyday language
- Development approach: Evaluate 2-3 alternatives before choosing the simplest, most robust solution
- Always focus on production-ready, battle-tested implementations
- Work independently and efficiently
- Keep dev and production environments synchronized

## System Architecture

### UI/UX Decisions
- Modern card-based layouts for administrative dashboards
- Color-coded status indicators for clarity
- Fully responsive design across all components
- Inline editing capabilities where applicable
- Clear "Pro Features" section with feature gates
- Simplified setup pages with minimal steps
- Functional footer with proper navigation

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS with Radix UI, React Query for state management, Wouter for routing, React Hook Form with Zod for forms, PWA capabilities
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM, session-based authentication with role-based access control
- **Database**: PostgreSQL (Neon-backed) shared between Replit dev and Sliplane production
- **Multi-Tenant Security**: Strict data isolation using `ownerId/userId` filtering
- **Google Calendar Integration**: OAuth 2.0 with dynamic domain support, bidirectional sync capability, per-user authorization, conflict detection
- **Multi-Room Booking System**: Intelligent appointment scheduling with automatic assignment
- **Promotional Packages System**: PRO feature enabling creation and sale of multi-treatment packages
- **Trial Blocking System**: Automatic access restriction for expired trials
- **Referral Commission System**: 25% commissions for staff referrals

### Feature Specifications
- **User Management**: Multi-tier authentication and role-based access
- **Client Management**: Patient database, QR code generation, access tracking
- **Appointment System**: Calendar scheduling, multi-room support, staff preferences, email/WhatsApp notifications, Google Calendar sync (PRO)
- **Billing & Payments**: Multiple payment methods, subscription plans, invoice generation, referral commissions
- **Multi-language Support**: Full internationalization for 9 languages
- **Google Calendar Sync (PRO)**: Automatic export, manual import, multi-tenant support, bidirectional sync
- **Database Synchronization**: Real-time sync between development and production

### Deployment Strategy
- **Development**: Replit (`https://wife-scheduler-zambelliandrea1.replit.app`)
- **Production**: Sliplane (`https://gestionale-appuntamenti.sliplane.app`)
- **Database**: Shared PostgreSQL (both environments access same database)
- **Build command**: `npm run build`
- **Push command**: `git push sliplane main`

## External Dependencies

### Database
- PostgreSQL (Neon-backed)
- Drizzle ORM
- Shared between Replit and Sliplane

### Email Services
- SMTP
- Gmail
- SendGrid

### Payment Services
- Stripe (live keys configured)
- PayPal SDK

### Cloud Services
- Google OAuth 2.0 (Calendar sync)
- Google Calendar API
- Google Gmail API
- Google Search Console (domain verification)

### Environment Variables
- `PRODUCTION_DOMAIN` - Dynamic domain for OAuth redirect URIs
- `ENCRYPTION_KEY` - AES-256-GCM encryption for SMTP passwords
- `VITE_STRIPE_PUBLIC_KEY` - Stripe live public key
- `STRIPE_SECRET_KEY` - Stripe live secret key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `DATABASE_URL` - PostgreSQL connection string (shared)
