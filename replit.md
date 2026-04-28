# Medical Practice Management System

## Overview
This React, TypeScript, and Node.js-based Progressive Web App (PWA) streamlines medical practice operations. It provides comprehensive features for patient, appointment, and staff management, QR code access, billing, multi-language support, and a staff referral and commission system. The system enhances patient engagement and offers efficient administrative tools, serving as a multi-platform solution for modern medical practice management with a focus on business growth through PRO and BUSINESS plans.

## User Preferences
- Preferred communication style: Simple, everyday language
- Development approach: Evaluate 2-3 alternatives before choosing the simplest, most robust solution
- Always focus on production-ready, battle-tested implementations
- Work independently and efficiently
- Keep dev and production environments synchronized

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
- **File Uploads**: Files saved on Cloudflare R2 (S3-compatible), with a fallback to base64 in PostgreSQL if R2 is not configured.
- **Route Modularization**: Express Router is used to modularize routes into separate files for better organization and maintainability.
- **Concurrency Control**: Appointment creation uses DB transactions with conflict checks.
- **Structured Logger**: A configurable logger (`server/utils/logger.ts`) is used for structured logging, defaulting to `warn` in production.
- **Security Hardening**: Implemented HTTP security headers (Helmet), reduced body limits, fail-fast for missing `ENCRYPTION_KEY` and `SESSION_SECRET` in production, rate limiting on authentication endpoints, and removal of hardcoded passwords and legacy bypasses.
- **Internationalization (i18n)**: Supports 9 languages with canonical Italian (`it.json`). Automated tooling for auditing, syncing, and adding new languages is in place, ensuring all languages are aligned before production deployment.

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
- **Build command**: `npm run build`.
- **Google Play Store**: Uses a consistent `signing.keystore` for all releases.

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
- Cloudflare R2 (Object storage)

### Environment Variables
- `PRODUCTION_DOMAIN`
- `ENCRYPTION_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `BETA_ADMIN_PASSWORD` (production only)
- `EMERGENCY_RESTART_KEY` (production only)
- `LOG_LEVEL`
- `GITHUB_PERSONAL_ACCESS_TOKEN` (GitHub PAT for pushing to GitHub remote; also embedded in `.git/config` origin URL)

## GitHub Personal Access Token (PAT) Renewal

### Current Token
- **Token name**: Sliplane Deploy 1
- **Last renewed**: 2026-04-28
- **Expiry**: Set to 1 year → renew by **2027-04-28** (set a calendar reminder 2 weeks before)
- **Scopes needed**: `repo` (full repository access)

### How to renew (step by step)
1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens** (or classic tokens if that's what was used).
2. Find **Sliplane Deploy 1**, click **Regenerate** (or create a new token with the same `repo` scope and 1-year expiry).
3. Copy the new token value immediately (it is shown only once).
4. Update the **Replit secret** `GITHUB_PERSONAL_ACCESS_TOKEN` with the new token value.
5. Update the **git remote URL** in `.git/config` for the `origin` remote:
   ```
   git remote set-url origin https://<github-username>:<NEW_TOKEN>@github.com/zambelliandrea1973-cloud/gestionale-appuntamenti
   ```
   Replace `<github-username>` with `zambelliandrea1973-cloud` and `<NEW_TOKEN>` with the new token.
6. Verify the connection: `git ls-remote origin` — should list refs without errors.
7. Note the new expiry date here in `replit.md` for the next renewal cycle.