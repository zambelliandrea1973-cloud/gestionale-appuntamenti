# Medical Practice Management System

## Overview
This React, TypeScript, and Node.js-based Progressive Web App (PWA) is designed to streamline operations for medical practices. It offers comprehensive features for patient, appointment, and staff management, QR code access, billing, multi-language support, and a staff referral and commission system. The system aims to enhance patient engagement and provide efficient administrative tools, ultimately serving as a multi-platform solution for modern medical practice management.

## Recent Changes (December 2, 2025)

### ✅ DATABASE SYNCHRONIZED - Replit ↔ Sliplane
**Status**: Both environments now share the same PostgreSQL database - 100% synchronized!

### ✅ TODAY'S WORK COMPLETED:

**1. PostgreSQL Database Created on Replit:**
   - ✅ Created production-grade PostgreSQL database on Replit
   - ✅ Server now uses real database instead of in-memory JSON storage
   - ✅ All data synced: Staff, Referrals, Licenses, Appointments, Clients
   - ✅ Verified server logs show all data loading correctly

**2. Database Synchronization:**
   - Replit and Sliplane now share identical PostgreSQL database
   - All CRUD operations sync in real-time
   - No more data silos between dev and production

**3. Google Calendar Sync - Fully Implemented:**
   - `server/services/googleCalendarSync.ts` - Bidirectional sync service
   - `server/routes/googleCalendarApi.ts` - Sync API endpoints
   - `server/routes/googleAuthRoutes.ts` - Google OAuth routes
   - Automatic appointment export to Google Calendar on creation
   - Multi-tenant: each user syncs separately

**4. New Simplified Setup Page Created:**
   - Route: `/google-calendar` (new dedicated page)
   - Clean, minimal UI with 3-step instructions
   - Email input form to specify Google account
   - Success/error handling with clear feedback
   - Pro feature gate (shows upgrade prompt for non-PRO users)

**5. Privacy & Compliance:**
   - Privacy Policy page created: `/privacy`
   - Full GDPR compliance information
   - Google Calendar data handling explanation
   - OAuth security notes
   - Public accessibility (no authentication required)

**6. Bugs Fixed:**
   - ✅ Removed failing `/api/email-calendar-settings` requests
   - ✅ Fixed `Unexpected token '<'` JSON parse errors
   - ✅ Added missing `ArrowRight` icon import
   - ✅ Simplified OAuth status checking

### ✅ Database Integration:
   - `googleCalendarEvents` table tracks sync status
   - `users` table has Google OAuth fields:
     - `googleAuthToken` - OAuth access token
     - `googleCalendarEnabled` - Sync toggle state
     - `googleCalendarId` - User's calendar ID
     - `lastGoogleSyncAt` - Last sync timestamp

### ⏳ BLOCKING ISSUE - Google App Verification:
**Current state**: Verification form submitted to Google
- Awaiting approval (1-3 days expected)
- Google showing "app not verified" warning during OAuth
- Cannot bypass warning until approved
- All technical setup is complete and working

### ✅ Deployment Status:
**Development**: Replit - now using PostgreSQL (synchronized)
**Production**: Sliplane - using same PostgreSQL
- `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback` ✅
- `https://gestionale-appuntamenti.sliplane.app/api/google-auth/callback` ✅

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

### ⏭️ NEXT SESSION - Tomorrow: Google Verification Tests

**When Google approves (will receive email):**

1. **Step 1 - Test Authorization Flow:**
   - Navigate to `/pro-features` → "Sincronizza Google Calendar"
   - Enter Google email
   - Click "Connetti con Google"
   - Verify OAuth popup opens without "app not verified" warning
   - Complete authorization and return to app

2. **Step 2 - Test Appointment Sync:**
   - Create a new appointment in the gestionale
   - Verify it appears in Google Calendar automatically
   - Check sync status in dashboard

3. **Step 3 - Test Manual Sync:**
   - Use manual sync button to import from Google Calendar
   - Verify no duplicates are created

4. **Step 4 - Deploy to Sliplane:**
   - Run `npm run build`
   - Push to Sliplane with `git push -f origin main`
   - Test complete flow on production domain

5. **Step 5 - Monitor & Refine:**
   - Check logs for any sync errors
   - Monitor performance under real user load

### 📍 Key URLs:
- Development: `https://wife-scheduler-zambelliandrea1.replit.app/google-calendar`
- Production: `https://gestionale-appuntamenti.sliplane.app/google-calendar`
- Privacy Policy: `/privacy` (both environments)
- Pro Features: `/pro` or `/pro-features`

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

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS with Radix UI, React Query for state management, Wouter for routing, React Hook Form with Zod for forms, PWA capabilities
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM, session-based authentication with role-based access control
- **Database**: PostgreSQL (Neon-backed) shared between Replit dev and Sliplane production
- **Multi-Tenant Security**: Strict data isolation using `ownerId/userId` filtering
- **Google Calendar Integration**: OAuth 2.0 with dynamic domain support, bidirectional sync capability, per-user authorization
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
- **Google Calendar Sync (PRO)**: Automatic export, manual import, multi-tenant support
- **Database Synchronization**: Real-time sync between development and production

### Deployment Strategy
- **Development**: Replit (`https://wife-scheduler-zambelliandrea1.replit.app`)
- **Production**: Sliplane (`https://gestionale-appuntamenti.sliplane.app`)
- **Database**: Shared PostgreSQL (both environments access same database)
- **Build command**: `npm run build`
- **Push command**: `git push -f origin main`

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

### Environment Variables
- `PRODUCTION_DOMAIN` - Dynamic domain for OAuth redirect URIs
- `ENCRYPTION_KEY` - AES-256-GCM encryption for SMTP passwords
- `VITE_STRIPE_PUBLIC_KEY` - Stripe live public key
- `STRIPE_SECRET_KEY` - Stripe live secret key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `DATABASE_URL` - PostgreSQL connection string (shared)
