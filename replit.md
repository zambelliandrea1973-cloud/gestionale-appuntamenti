# Medical Practice Management System

## Overview
This React, TypeScript, and Node.js-based Medical Practice Management System is a Progressive Web App (PWA) designed to streamline operations for medical practices. It offers robust features for patient, appointment, and staff management, QR code access, and billing. The system aims to enhance patient engagement and provide efficient administrative tools, including multi-language support and a staff referral and commission system. Its core ambition is to provide a comprehensive, multi-platform solution for modern medical practice management.

## User Preferences
Preferred communication style: Simple, everyday language.

Development approach: When implementing new features, always evaluate 2-3 alternative solutions and compare them before choosing the simplest and most robust option. Never jump to the first solution that comes to mind - take time to analyze different approaches for probability of success and maintainability.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Radix UI
- **State Management**: React Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **PWA**: Service worker for offline capabilities

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with role-based access control
- **File Storage**: Local file system
- **API Design**: RESTful API with TypeScript interfaces

### UI/UX Decisions
- Modern card-based layouts for administrative dashboards (e.g., subscription plans, license management).
- Color-coded status indicators (e.g., green for active, orange for frozen, red for deactivated).
- Responsive design for all components, including promotion pages.
- Inline editing capabilities where appropriate (e.g., license dates, plan details).

### Technical Implementations
- **Multi-Tenant Security**: Critical isolation pattern applied across all data access, filtering strictly by `ownerId/userId` to prevent data leaks between different practices and staff members.
- **PWA Admin Icon Fix**: Implemented a multi-layer authentication strategy for PWA manifest requests, utilizing query parameters as a fallback to ensure custom admin icons load correctly during PWA installation without session cookies.
- **Marketing AI with Promotion Links**: Features AI-powered marketing campaigns using unique public promotion pages with embedded media, designed to overcome WhatsApp attachment limitations. Includes secure file handling and unique link generation.
- **Trial Blocking System**: Automatic access blocking for expired trials with redirection to subscription pages, preserving user data.
- **Referral Commission System**: Supports both one-time (annual plans) and recurring (monthly plans) 25% commissions for staff referrals, dynamically displayed in the UI.
- **Interactive Manual with Media Upload & Auto-Provisioning**: Comprehensive user manual system with inline editing for administrators. Supports photo/video uploads (max 50MB) for each step, multi-language content (9 languages), and structured JSON storage. Admins can edit content directly from `/manuale` page without separate admin interface. **Technical Implementation**: (1) **Backend Auto-Provisioning** - MANUAL_TEMPLATES registry (`server/routes/manualRoutes.ts`) provides default content for 14 sections (section-1-1 through section-6-1); GET endpoint automatically creates missing sections in database with template content. (2) **Standardized Section IDs** - Migrated from legacy identifiers (first-access-section, daily-operations) to uniform format (section-X-Y) for consistency. (3) **Drizzle ORM JSON Normalization** - All endpoints (GET/POST/PUT) use native JSON objects (`steps: steps`) instead of JSON.stringify() for proper .returning() behavior; `.returning()` configured with explicit column selection to ensure valid database IDs. (4) **TanStack Query with Explicit queryFn** - Manual admin page uses explicit `queryFn` to fetch `/api/manual/content/${selectedSection}/${selectedLocale}` instead of relying on default fetcher, ensuring each section/locale change loads the correct template data. Tuple-style cache keys (`['/api/manual/content', section, locale]`) for proper invalidation; reactive navigation via wouter's useSearch() hook for cross-page editing. (5) **Frontend Mutation Logic** - Save mutation correctly gates POST vs PUT on `manualData?.id` to prevent `/api/manual/content/null` endpoint errors during first save after auto-provision. PWA client manual section fully translated in all 9 languages (IT, EN, DE, ES, FR, NL, NO, RO, RU) with i18n-driven rendering for appointment booking workflow, PWA features (appointments view, documents/invoices access, direct contacts, push notifications, offline mode), and client benefits.
- **Multi-Room Booking System**: Intelligent appointment scheduling that considers multiple treatment rooms and staff availability. Features automatic room assignment, staff preference support in client booking requests, manual override capability for admin, and real-time availability calculation that prevents overbooking. Calendar displays staff and room assignments for each appointment with PostgreSQL JOIN optimization for performance.
- **Client Grouping by Owner (Admin View)**: Admin users see clients grouped by professional owner with visual containers showing each owner's assignment code and identifier (format: `BUS1422 - user@email.com`). Implements dedicated `/api/client-owners` endpoint (admin-only) that fetches owner metadata (`id`, `assignmentCode`, `username`) from users table. Frontend defaults to grouped "by-staff" view for admins, maintaining all existing filters and search functionality while providing clear ownership visibility.
- **Unified Professional Code System (Dual-Code Strategy)**: Implements a dual-code architecture for professional identifiers to balance internal display uniformity with external link stability. Each professional has two codes: (1) `assignmentCode` (e.g., `BUS1422`) - short, uniform format used for UI display in headers, client cards, and grouping; sourced from `users.assignment_code` database field. (2) `referralCode` (e.g., `BUS14`) - legacy format preserved for external referral links to maintain backward compatibility with shared URLs and commission tracking; stored in `users.referral_code` and immutable to prevent invalidating existing referral links. API endpoint `/api/user-with-license` returns both `assignmentCode` and `legacyProfessionistCode` with fallback logic. Frontend components (UserLicenseBadge, Clients page) prioritize `assignmentCode` for display. Client codes follow matching pattern: `uniqueCode` (legacy, used for QR authentication) and `newUniqueCode` (short format like `BUS1422-001` for display).
- **Automatic Email Reminders**: Fully automated appointment reminder system that sends emails 24 hours before scheduled appointments. When creating appointments (POST `/api/appointments`), the system automatically calculates `reminderTime` by subtracting 24 hours from the appointment datetime and sets `reminderStatus` to "pending". Hourly scheduler (`server/scheduler.ts`) queries appointments with `reminderTime` within the next hour and `reminderStatus != 'sent'`, then dispatches emails via configured SMTP settings stored per-user in `email_settings.json`. After successful delivery, status updates to "sent" with timestamp. System includes comprehensive error logging for SMTP failures and tracks delivery status for audit trail.
- **Multi-Tenant Email Configuration with AES-256-GCM Encryption & Auto-Detection**: Each professional uses their own business email address for all client communications (appointment reminders, marketing campaigns). SMTP credentials stored in dedicated database fields (`smtp_email`, `smtp_password_encrypted`, `smtp_server`, `smtp_port`, `smtp_enabled`) with passwords encrypted using AES-256-GCM encryption (`server/utils/encryption.ts`) requiring `ENCRYPTION_KEY` environment variable (32-byte hex string). **PLUG-AND-PLAY AUTO-CONFIGURATION**: System automatically detects SMTP settings from email address (supports 20+ providers: Gmail, Libero, Outlook, Aruba, Virgilio, Yahoo, TIM, etc.) via `detectEmailProvider()` (`server/utils/emailProviderDetection.ts`). Professionals only need to enter email + password - no technical knowledge required. Gmail/iCloud auto-detected as requiring App Password with user-friendly error messages and setup instructions. Email configuration retrieved via `getEmailConfig(userId)` utility (`server/utils/emailConfig.ts`) with three-tier fallback: (1) User database settings (decrypted), (2) Global environment variables, (3) Legacy JSON file. API endpoints: GET/POST `/api/email-calendar-settings` for configuration management, POST `/api/email-calendar-settings/send-test-email` for testing with intelligent error translation (AUTH_FAILED, CONN_REFUSED, TIMEOUT, POLICY_REJECT). Frontend page `/impostazioni-email` allows professionals to configure credentials. All notification services (`notificationService.ts`, `schedulerService.ts`) and marketing campaigns use per-user credentials ensuring clients recognize sender addresses. Critical for multi-tenant security and professional branding.
- **WhatsApp Number Editing**: WhatsApp Center page (`/whatsapp-center`) allows users to modify their configured phone number without requiring complete removal and reconfiguration. Both initial setup and edit states display an editable input field bound to local state, with validation preventing empty submissions. Users can update the number and immediately test WhatsApp link generation via the "Test" button, which uses the current input value. Contact settings persist via POST `/api/save-contact-settings` endpoint with automatic WhatsApp opt-in enabled.
- **Promotional Packages System (PRO Feature)**: Complete multi-treatment bundle system for selling discounted packages. Features: (1) **Package Templates** - Create reusable templates defining service bundles, total sessions, pricing, and optional expiration days (e.g., "10 Facial Treatments - €500, 6 months validity"). (2) **Package Sales** - Sell packages to clients with automatic session tracking and expiration management. Each purchase stores purchase date, invoice link, remaining sessions with real-time progress bars. (3) **Session Redemption** - Track individual session usage with automatic countdown, completion status updates (active/completed/expired), and optional appointment linking. (4) **Multi-Tenant Security** - All operations use correct tenant resolution (`user.ownerId ?? user.tenantId ?? user.id`) to ensure staff accounts share data with business owner. Database schema includes 3 new tables: `packageTemplates` (reusable templates), `packagePurchases` (sold packages), `packageRedemptions` (usage log), plus `appointments.packagePurchaseId` foreign key. API endpoints: GET/POST/PUT/DELETE `/api/packages/templates`, GET/POST `/api/packages/purchases`, POST `/api/packages/redeem`. UI: Dedicated `/packages` page with two tabs (Templates Management, Sold Packages), integrated in Pro Features section with ProFeatureGuard. Future enhancement: Calendar integration for selecting packages during appointment creation.

### Feature Specifications
- **User Management**: Multi-tier authentication (admin, staff, customer) and role-based access control.
- **Client Management**: Patient database, QR code generation for PWA access, access tracking.
- **Appointment System**: Calendar scheduling with multi-room support, staff preferences, service management, email notifications, reminders. Clients can request appointments via PWA with optional staff preference; admin can confirm with automatic or manual staff/room assignment.
- **Billing & Payments**: Support for multiple payment methods, subscription plans, invoice generation, and a 25% referral commission system.
- **Multi-language Support**: Internationalization with 9 fully translated languages.

### Deployment Strategy
- **Development**: Replit-based with hot reloading.
- **Production**: Supports Replit, SiteGround, and standard VPS/cloud hosting (Docker).
- **Backup**: Automated data backups.

## External Dependencies

### Database
- PostgreSQL
- Drizzle ORM
- Neon Database (for PostgreSQL hosting)

### Email Services
- SMTP (general configuration)
- Gmail
- SendGrid

### Payment Services
- Stripe
- PayPal SDK
- Wise API

### Cloud Services
- Google OAuth (for calendar integration)