# Medical Practice Management System

## Overview
This React, TypeScript, and Node.js-based Progressive Web App (PWA) is designed to streamline operations for medical practices. It offers comprehensive features for patient, appointment, and staff management, QR code access, billing, multi-language support, and a staff referral and commission system. The system aims to enhance patient engagement and provide efficient administrative tools, ultimately serving as a multi-platform solution for modern medical practice management.

## Recent Changes (December 1, 2025)

### ⏳ CURRENT STATUS - Google Calendar Sync PRO Feature (AWAITING GOOGLE VERIFICATION)
**Status**: Implementation complete, awaiting Google OAuth verification (1-3 days)

### ✅ Google Calendar Sync - COMPLETED IMPLEMENTATION:
**What's done:**
1. ✅ **Bidirectional sync architecture created**:
   - `server/services/googleCalendarSync.ts` - Sync service with import/export functions
   - `server/routes/googleCalendarApi.ts` - API endpoints for sync operations
   - `server/routes/googleAuthRoutes.ts` - Google OAuth authentication routes
   - `client/src/components/GoogleCalendarSimpleSetup.tsx` - User-friendly sync UI

2. ✅ **Automatic sync on appointment creation**:
   - When user creates appointment in gestionale → automatically exported to Google Calendar
   - Added Google sync trigger in POST `/api/appointments` endpoint
   - Non-blocking: errors don't prevent appointment creation

3. ✅ **Database integration**:
   - Added `googleCalendarEvents` table to track sync status
   - Added Google OAuth fields to `users` table: googleAuthToken, googleCalendarEnabled, googleCalendarId, lastGoogleSyncAt
   - Multi-tenant: synced separately per user account

4. ✅ **Google OAuth setup completed**:
   - Client ID OAuth 2.0 created in Google Cloud Console
   - Redirect URIs configured for both environments:
     - https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback
     - https://gestionale-appuntamenti.sliplane.app/api/google-auth/callback
   - Calendar API + Gmail API scopes enabled
   - Code uses dynamic PRODUCTION_DOMAIN for multi-environment support

5. ✅ **User interface**:
   - Pro Features → Google Calendar page with step-by-step instructions
   - "Connetti con Google" button to authorize
   - "Abilita sincronizzazione" toggle to enable/disable sync
   - Sync status display and manual sync trigger option

### ⏳ BLOCKING ISSUE - Google App Verification:
**Current state**: Verification form submitted to Google (awaiting review 1-3 days)
- Google blocking OAuth flow with "app not verified" warning
- Cannot bypass until Google approves verification
- No alternative workaround available (Internal/Test user options already attempted)

**What to do when approved**:
1. Google will send approval email
2. Return to gestionale-appuntamenti.app/pro
3. Click "Connetti con Google" button
4. Verify that new appointments sync to Google Calendar automatically
5. Test on Sliplane (same redirect URIs already authorized)

### ✅ Deployment Status - Sliplane Production (READY!)
**Target URL**: https://gestionale-appuntamenti.sliplane.app
**Status**: All critical environment variables configured, Google Calendar ready for production

### ✅ Environment Variables Configured on Sliplane:
1. ✅ **ENCRYPTION_KEY** = e29f9ed9d7cc2430ebc367a32b2c8f33054db4f8c649a2a917f75d7f2d1dd079
   - For AES-256-GCM encryption of SMTP passwords in database

2. ✅ **VITE_STRIPE_PUBLIC_KEY** = pk_live_...
   - Stripe live publishable key for frontend payments

3. ✅ **STRIPE_SECRET_KEY** = sk_live_...
   - Switched from test to live for production payments

4. ✅ **PRODUCTION_DOMAIN** = gestionale-appuntamenti.sliplane.app
   - For dynamic Google OAuth callback URL generation

### ✅ Completed Features (Previous):
- Trial expiration email system (daily at 09:00, sends email 9-11 days before expiration)
- Three plan-specific purchase buttons in email (BASE, PRO, BUSINESS)
- Complete redirect flow: Email link → SubscribePage → Login → Back to subscribe with plan parameter
- Google Play Store account created ("gestionale appuntamenti zambelli andrea")
- Multi-professional + multi-room appointment scheduling
- WhatsApp and email reminders (24h before)
- Promotional packages with session tracking

### ⏭️ NEXT SESSION - After Google Verification Approved:
1. Test Google Calendar sync end-to-end on Replit
2. Verify appointments appear on Google Calendar automatically
3. Test import from Google Calendar (manual sync trigger)
4. Push to Sliplane production
5. Add in-app guide with step-by-step screenshots for new users
6. Consider: Automatic periodic sync from Google Calendar (currently manual)

## User Preferences
- Preferred communication style: Simple, everyday language
- Development approach: Evaluate 2-3 alternatives before choosing the simplest, most robust solution
- Always focus on production-ready, battle-tested implementations

## System Architecture

### UI/UX Decisions
- Modern card-based layouts for administrative dashboards
- Color-coded status indicators for clarity
- Fully responsive design across all components
- Inline editing capabilities where applicable
- Clear "Pro Features" section with feature gates

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS with Radix UI, React Query for state management, Wouter for routing, React Hook Form with Zod for forms, PWA capabilities
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM, session-based authentication with role-based access control
- **Multi-Tenant Security**: Strict data isolation using `ownerId/userId` filtering
- **Google Calendar Integration**: OAuth 2.0 with dynamic domain support, bidirectional sync capability
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

### Deployment Strategy
- **Development**: Replit
- **Production**: Sliplane (https://gestionale-appuntamenti.sliplane.app)
- **Build command**: `npm run build` (must run before pushing to Sliplane)
- **Push command**: `git push -f origin main` (force push required)

## External Dependencies

### Database
- PostgreSQL
- Drizzle ORM
- Neon Database

### Email Services
- SMTP
- Gmail
- SendGrid

### Payment Services
- Stripe
- PayPal SDK

### Cloud Services
- Google OAuth (for Calendar sync)
- Google Calendar API
- Google Gmail API
