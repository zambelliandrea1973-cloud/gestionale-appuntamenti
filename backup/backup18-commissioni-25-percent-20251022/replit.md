# Medical Practice Management System

## Overview
This comprehensive medical practice management system, built with React, TypeScript, and Node.js, offers robust features for managing patients, appointments, QR code access, billing, and staff. Designed as a Progressive Web App (PWA), it aims to streamline operations for medical practices, improve patient engagement, and provide efficient administrative tools. The system includes multi-language support, a referral and commission system for staff, and is deployable across various platforms.

## User Preferences
Preferred communication style: Simple, everyday language.

Development approach: When implementing new features, always evaluate 2-3 alternative solutions and compare them before choosing the simplest and most robust option. Never jump to the first solution that comes to mind - take time to analyze different approaches for probability of success and maintainability.

## Recent Changes (October 2025)

### PostgreSQL Migration & Multi-Tenant Security
- **Date**: October 15, 2025
- **Critical Security Fix**: Resolved multi-tenant data leak where staff could view other professionals' appointments
  - Changed filter in `notificationRoutes.ts` from `user.type === 'staff'` blanket access to `client.ownerId === userId` strict isolation
  - **Pattern**: Multi-tenant isolation MUST filter by `ownerId/userId`, NEVER by `user.type` alone (security vulnerability)
- **Database Migration**: Successfully migrated all data from JSON storage to PostgreSQL
  - 16 users, 38 clients, 39 appointments (Silvia Busnari) migrated
  - ServiceId remapping: Fixed integer overflow issue (timestamps → sequential IDs)
- **Notification System**: Converted from JSON to PostgreSQL with proper multi-tenant filtering
  - Routes now use `db.select()` with JOINs instead of `loadStorageData()`
  - Multi-tenant isolation: `eq(appointments.userId, userId)` in all queries
- **Deployment**: Shared Neon PostgreSQL database configured on both Replit (dev) and Sliplane (prod) for real-time synchronization

### Multi-Tenant Isolation Pattern
**CRITICAL SECURITY PATTERN** - Always use in queries:
```typescript
// ✅ CORRECT - Filter by ownership
.where(eq(appointments.userId, userId))
.where(eq(clients.ownerId, userId))

// ❌ WRONG - Never filter by user type alone
.where(eq(users.type, 'staff')) // Security vulnerability!
```

Each professional sees ONLY their own data:
- Staff: Only their clients and appointments
- Admin: All clients, but only their own configurations

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
- **File Storage**: Local file system with JSON backup
- **API Design**: RESTful API with TypeScript interfaces

### Key Features
- **User Management**: Multi-tier authentication (admin, staff, customer) and role-based access control.
- **Client Management**: Patient database, QR code generation for PWA access, access tracking.
- **Appointment System**: Calendar scheduling, service management, email notifications, reminders.
- **Billing & Payments**: Support for multiple payment methods (Stripe, PayPal, Bank Transfer, Wise), subscription plans, invoice generation, and a 25% referral commission system for staff.
- **Multi-language Support**: Internationalization with 9 languages.
- **Referral System**: Automatic tracking, unique staff referral codes, 25% commission on sponsored subscriptions, and commission payment infrastructure.

### Data Flow Highlights
- **Client Access**: QR code/URL validation, PWA interface loading, access tracking.
- **Authentication**: Session cleanup on login, credential validation, session creation with role-based permissions, cache invalidation, and route protection.
- **Referral Commission**: Staff shares code, customer registers, `referred_by` linked, commission calculated (25%) upon paid subscription activation, and tracked for admin processing.

### Deployment Strategy
- **Development**: Replit-based with hot reloading.
- **Production**: Supports Replit, SiteGround, and standard VPS/cloud hosting (Docker).
- **Backup**: Automated data backups to JSON files.

## External Dependencies

### Database
- PostgreSQL (via DATABASE_URL)
- Drizzle ORM
- Neon Database (for PostgreSQL hosting)

### Email Services
- SMTP configuration
- Gmail integration
- SendGrid (for transactional emails)

### Payment Services
- Stripe
- PayPal SDK
- Wise API
- Bank transfer instructions

### Cloud Services
- Google OAuth (for calendar integration)