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
- Subscription plan management (Trial, Base, PRO, Business)
- Invoice generation and tracking

### Multi-language Support
- Complete internationalization with 9 languages
- Translation files in `client/src/locales/`
- Dynamic language switching

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
1. User login through secure form
2. Credentials validated against user database
3. Session created with role-based permissions
4. Route access controlled by middleware

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

## User Preferences

Preferred communication style: Simple, everyday language.