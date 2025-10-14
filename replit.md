# Medical Practice Management System

## Overview

This is a comprehensive medical practice management system built with React, TypeScript, and Node.js. The application provides features for managing patients, appointments, QR code access, billing, and staff management. It's designed as a PWA (Progressive Web App) that can be deployed on various hosting platforms including Replit, SiteGround, and standard web servers.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with Radix UI components for a modern, accessible interface
- **State Management**: React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **PWA**: Service worker implementation for offline capabilities

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with role-based access control
- **File Storage**: Local file system with JSON backup capabilities
- **API Design**: RESTful API endpoints with TypeScript interfaces

## Key Components

### User Management System
- Multi-tier authentication system (admin, staff, customer)
- Role-based access control with different permission levels
- Account credentials stored in `accounts-credentials.json`
- Password hashing with Node.js crypto module

### Client Management
- Comprehensive patient/client database
- QR code generation for client access
- PWA client interface accessible via unique codes
- Access tracking and analytics

### Appointment System
- Calendar-based appointment scheduling
- Service management with customizable offerings
- Email notification system with templating
- Reminder functionality

### Billing and Payments
- Multiple payment method support (Stripe, PayPal, Bank Transfer, Wise)
- Subscription plan management (Trial €0/40 days, Base €5.99/€59, Pro €9.99/€99, Business €19.99/€199)
- Invoice generation and tracking
- Automatic referral commission system with 10% staff earnings on sponsored subscriptions

### Multi-language Support
- Complete internationalization with 9 languages
- Translation files in `client/src/locales/`
- Dynamic language switching

### Referral and Commission System
- **Automatic referral tracking**: Each staff member gets a unique referral code (e.g., BUS14, ELI16)
- **Registration flow**: New users register with referral code, automatically linked to sponsoring staff via `referred_by` field
- **Commission calculation**: When a sponsored user activates a paid subscription, system automatically creates a commission record at 10% of subscription price
- **Payment infrastructure**:
  - Admin manages business IBAN (receives client payments via Stripe/PayPal)
  - Staff provides personal IBAN (receives commission payouts)
  - Clients pay via integrated Stripe/PayPal forms
- **Tracking**: All commissions tracked with subscription_id, amount, status, and payment dates
- **Database tables**: `bank_accounts` (IBAN storage), `referral_payments` (commission records), `referral_commissions` (detailed tracking)

## Data Flow

### Client Access Flow
1. Client scans QR code or accesses unique URL
2. System validates access token
3. Client-specific PWA interface loads
4. Access tracking recorded in database

### Appointment Management Flow
1. Staff creates appointment through admin interface
2. Email notifications sent via configured SMTP
3. Appointment data synchronized with calendar systems
4. Reminders automatically scheduled

### Authentication Flow
1. **Session Cleanup**: On login page arrival, system calls /api/logout to clear any previous session (prevents cross-user data contamination)
2. **Credential Validation**: User credentials validated against user database
3. **Session Creation**: New session created with role-based permissions for authenticated user
4. **Cache Invalidation**: React Query cache invalidated for auth-related queries (user-with-license, contact-info, company-name-settings)
5. **Route Protection**: Route access controlled by middleware based on user type (admin/staff/customer/client)

### Referral Commission Flow
1. Staff member shares unique referral code with potential customer
2. Customer registers using referral code (captured in registration URL)
3. System automatically sets `referred_by` field to sponsor's user ID
4. Customer starts with Trial subscription (€0 for 40 days)
5. When customer upgrades to paid plan (via Stripe/PayPal):
   - Payment processed and subscription activated
   - System automatically calls `handleReferralCommission()`
   - Commission calculated at 10% of subscription price
   - Commission record created with status "pending"
6. Admin processes commission payments manually using staff IBAN
7. Staff monitors earnings via Referral dashboard page

## External Dependencies

### Database
- PostgreSQL database (configurable via DATABASE_URL)
- Drizzle ORM for schema management and queries
- JSON file fallback for development/small deployments

### Email Services
- SMTP configuration for appointment notifications
- Template-based email system with placeholder substitution
- Gmail integration support with app passwords

### Payment Services
- Stripe integration for credit card processing
- PayPal SDK for PayPal payments
- Wise API for international transfers
- Bank transfer instructions management

### Cloud Services
- Google OAuth for calendar integration
- SendGrid for transactional emails
- Neon Database for PostgreSQL hosting

## Deployment Strategy

### Development Environment
- Replit-based development with hot reloading
- Local PostgreSQL database or file-based storage
- Environment variables managed through .env files

### Production Deployment
- Support for multiple hosting platforms:
  - Replit hosting with autoscale deployment
  - SiteGround shared hosting with PHP compatibility layer
  - Standard VPS/cloud hosting with Docker support
- Automated build process via npm scripts
- SSL/HTTPS enforcement through .htaccess rules

### Backup and Recovery
- Automated data backups to JSON files
- Multiple backup timestamps for rollback capability
- Storage data protection mechanisms

## Changelog
- June 24, 2025: Initial setup
- June 24, 2025: Complete system migration to standalone PHP - Created gestionale-standalone.php for independent hosting after biomedicinaintegrata.it access lost
- June 24, 2025: CRITICAL - Site crash caused by installer overwriting files. Created immediate restoration guide and cleaned up problematic installer files
- June 24, 2025: DEPLOYMENT SUCCESS - gestionale-completo-con-database.html successfully uploaded to SiteGround and integrated with WordPress Elementor button. System fully operational at https://biomedicinaintegrata.it/gestionale-completo-con-database.html
- June 24, 2025: COMPLETE REPLIT CLONE - Created gestionale-replit-clone-completo.html with exact replica of current Replit system including all 63 clients, real user accounts, dashboard, calendar, and notifications. Ready to replace simplified SiteGround version.
- June 24, 2025: PERFECT REPLIT REPLICA - Created replica-perfetta-replit.html as 100% identical deployment-ready clone with exact layout (2-row header navigation), 396 real clients, functional QR codes, client PWA area, and identical styling/components. True 1:1 replica of current Replit system.
- June 24, 2025: DISTRIBUTION SYSTEM - Created complete deployment package system with create-deployment-package.js that exports the entire Replit system as installable software for customers. Includes automated installer, documentation, and multi-deployment options (SaaS, self-hosted, white-label).
- June 24, 2025: PRODUCTION READY - Created gestionale-sanitario-completo.zip (8MB) with full system and automatic installer. Download page active on SiteGround. Created quick-admin-setup.cjs for unlimited admin license setup.
- July 1, 2025: STANDALONE PHP SOLUTION - Created complete PHP-only version (gestionale-php-completo.php) that works independently from Replit on any PHP hosting. Includes all 396 patients, appointments, login system, and dashboard functionality. Solves offline testing issues for staff and clients.
- July 1, 2025: MIGRATION SYSTEM READY - Prepared complete migration system for React/Node.js hosting with zero downtime. Created deployment configurations for Railway (recommended with free PostgreSQL), Vercel, and migration scripts. System maintains exact Replit interface and functionality while ensuring 24/7 availability for staff and clients.
- September 1, 2025: EMAIL SYSTEM PROGRESS - Fixed fundamental email delivery issues. Gmail SMTP now working with correct subject lines for invoices. PDF generation identified as issue (invoice.items undefined error). Email delivery functional but PDF attachment needs data structure fix.
- September 2, 2025: INVOICE SYSTEM COMPLETE SUCCESS - Fixed critical invoice numbering and PDF generation issues. Successfully implemented legal compliant invoice format (NNN/YYYY instead of MM/YYYY/NNN). Resolved PDF attachment corruption by implementing proper HTML-to-PDF conversion with pdfmake fallback. Invoice emails now send with valid PDF attachments that open correctly. System fully operational with proper legal invoice numbering format.
- October 1, 2025: AI ASSISTANT IMPLEMENTATION - Implemented AI-powered chat assistant with Google Gemini (free tier, 1500 requests/day). Replaced OpenAI GPT-4 (paid) with Gemini 2.0 Flash for cost-free intelligent assistance. Features: message generation with preview/approval system, business suggestions, information search. Removed non-functional "Impostazioni AI" button. System uses GEMINI_API_KEY for AI services.
- October 1, 2025: REFERRAL SYSTEM COMPLETE - Implemented automatic referral tracking and commission system. Staff gets unique codes, customers register with code, system auto-creates 10% commissions when subscriptions activate. Fixed critical bug: registered referralRoutes in simple-routes.ts (was missing). Complete payment infrastructure: admin IBAN (receives payments) → client pays via Stripe/PayPal → staff IBAN (receives commissions). All endpoints functional and tested.
- October 1, 2025: REFERRAL CODE SIMPLIFICATION - Simplified referral system to use user ID directly as referral code instead of separate alphanumeric codes (e.g., "14" instead of "BUS14"). This eliminates potential conflicts and makes the system more intuitive. Modified getUserByReferralCode to accept numeric IDs, updated ReferralPage to display user ID as referral code.
- October 1, 2025: COMMISSION VIEWS ENHANCEMENT - Enhanced referral commission management with dual-view system. Admin can now view: 1) Individual staff commissions (green "Dettagli" button on each staff card), 2) All commissions from all staff combined (gray "Commissioni Dettagliate" tab). Implemented /api/staff-commissions/all endpoint with complete data enrichment (customer email, license type, staff attribution). Fixed query key structure for proper cache invalidation using hierarchical array segments.
- October 2, 2025: SESSION CONTAMINATION FIX - Fixed critical cross-user data contamination bug where mobile showed configurations from previous sessions. Implemented automatic session cleanup on login page arrival: StaffLogin now calls /api/logout to clear previous sessions and invalidates React Query cache for auth-related queries (user-with-license, contact-info, company-name-settings). Mobile and desktop now correctly load user-specific data without cross-contamination. All components (CompanyNameEditor, ContactInfoEditor, AppIconUploader, AppNameEditor, ColorEditor) migrated from fetch() to apiRequest() helper for consistent device-type detection and anti-cache headers.
- October 13, 2025: PRODUCTION DEPLOYMENT SUCCESS - Successfully deployed application to Sliplane (€9/month Docker hosting) at https://gestionale-appuntamenti.sliplane.app. Resolved critical TypeScript path alias issues by replacing all @shared/* imports with relative paths (../shared/, ../../shared/) for Docker compatibility. Fixed Dockerfile to copy Vite build output from dist/public to server/public. Implemented lazy loading for OpenAI client to prevent startup crashes when API key is missing. Application now runs 24/7 in production with JSON storage fallback, ready for November esthetician convention presentation.
- October 14, 2025: CLIENT FORM BUG FIX - Fixed critical bug in ClientForm component on Sliplane production where dialog would not close after creating new client and red error message appeared. Root cause: redundant onClientCreated prop caused double query invalidation conflict when combined with internal form invalidation. Solution: removed onClientCreated prop from Clients.tsx, keeping only onClose. Form now properly closes after successful client creation. Established deployment workflow: develop on Replit → push to GitHub → Sliplane auto-rebuilds → test on production.

## User Preferences

Preferred communication style: Simple, everyday language.

Development approach: When implementing new features, always evaluate 2-3 alternative solutions and compare them before choosing the simplest and most robust option. Never jump to the first solution that comes to mind - take time to analyze different approaches for probability of success and maintainability.