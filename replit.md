# Medical Practice Management System

## Overview
This React, TypeScript, and Node.js-based Progressive Web App (PWA) is designed to streamline operations for medical practices. It offers comprehensive features for patient, appointment, and staff management, QR code access, billing, multi-language support, and a staff referral and commission system. The system aims to enhance patient engagement and provide efficient administrative tools, ultimately serving as a multi-platform solution for modern medical practice management.

## User Preferences
Preferred communication style: Simple, everyday language.

Development approach: When implementing new features, always evaluate 2-3 alternative solutions and compare them before choosing the simplest and most robust option. Never jump to the first solution that comes to mind - take time to analyze different approaches for probability of success and maintainability.

## System Architecture

### UI/UX Decisions
- Modern card-based layouts for administrative dashboards.
- Color-coded status indicators for clarity.
- Fully responsive design across all components.
- Inline editing capabilities where applicable.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS with Radix UI, React Query for state management, Wouter for routing, React Hook Form with Zod for forms, and PWA capabilities via service workers.
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM, session-based authentication with role-based access control, local file system storage, and a RESTful API.
- **Multi-Tenant Security**: Strict data isolation using `ownerId/userId` filtering.
- **PWA Admin Icon Fix**: Multi-layer authentication for PWA manifest requests to ensure custom admin icons load correctly.
- **Marketing AI with Promotion Links**: AI-powered campaigns using unique, media-embedded public promotion pages and secure file handling.
- **Trial Blocking System**: Automatic access restriction for expired trials with redirection to subscription pages.
- **Referral Commission System**: Supports one-time and recurring 25% commissions for staff referrals.
- **Interactive Manual**: User manual system with inline editing, photo/video uploads, multi-language support (9 languages), and structured JSON storage, featuring backend auto-provisioning of sections, standardized section IDs, and Drizzle ORM JSON normalization.
- **Multi-Room Booking System**: Intelligent appointment scheduling considering multiple rooms and staff, with automatic assignment, real-time availability, and manual override.
- **Client Grouping by Owner**: Admin view groups clients by professional owner with visual identifiers.
- **Unified Professional Code System**: Dual `assignmentCode` (UI display) and `referralCode` (legacy, external links) strategy for professional identifiers.
- **Automatic Email Reminders**: System for sending appointment reminders 24 hours prior, with status tracking and error logging.
- **Multi-Tenant Email Configuration**: Each professional uses their own SMTP settings stored encrypted with AES-256-GCM, featuring auto-detection for 20+ email providers and user-friendly setup for services like Gmail/iCloud requiring app passwords.
- **WhatsApp Number Editing**: Allows users to modify configured WhatsApp numbers on the WhatsApp Center page with validation and testing.
- **Promotional Packages System**: A PRO feature enabling creation and sale of multi-treatment packages with session tracking, expiration management, and multi-tenant security.

### Feature Specifications
- **User Management**: Multi-tier authentication and role-based access.
- **Client Management**: Patient database, QR code generation, access tracking.
- **Appointment System**: Calendar scheduling, multi-room support, staff preferences, email notifications, and client-initiated appointment requests.
- **Billing & Payments**: Multiple payment methods, subscription plans, invoice generation, and referral commissions.
- **Multi-language Support**: Full internationalization for 9 languages.

### Deployment Strategy
- **Development**: Replit.
- **Production**: Replit, SiteGround, and Docker-compatible VPS/cloud hosting.
- **Backup**: Automated data backups.

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
- Wise API

### Cloud Services
- Google OAuth