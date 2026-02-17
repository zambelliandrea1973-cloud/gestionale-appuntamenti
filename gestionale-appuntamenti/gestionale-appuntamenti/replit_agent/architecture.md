# Architecture Documentation

## 1. Overview

This application is an appointment management system built with a modern JavaScript/TypeScript stack. It provides functionalities for managing clients, appointments, services, invoices, payments, and notifications. The system appears to have both staff and client user roles with appropriate access controls.

Key features include:
- Client management
- Appointment scheduling
- Service management
- Notifications (email, SMS, WhatsApp)
- Payment processing (including Stripe, PayPal)
- Multilingual support
- Calendar integrations (Google Calendar)
- Beta testing program management

## 2. System Architecture

The system follows a client-server architecture with a clear separation between frontend and backend components:

### Frontend

- Built with React
- Uses React Query for server state management
- Implements Shadcn UI components based on Radix UI primitives
- Supports multiple languages through JSON-based localization files
- Uses Tailwind CSS for styling

### Backend

- Node.js server built with Express
- TypeScript for type safety
- RESTful API design
- Server-side rendering with Vite for initial page load
- Socket.IO for real-time communication (used for device pairing and notifications)

### Database

- PostgreSQL database
- Drizzle ORM for database interactions
- Schema defined in TypeScript with strong typing

## 3. Key Components

### Client-Side

1. **UI Components**: Based on Radix UI with Shadcn theming for consistent design
2. **State Management**: Uses React Query for server state and local state management
3. **Localization**: Supports multiple languages (it, en, fr, de, es, ru, nl, no, ro) with JSON translation files
4. **API Integration**: Custom hooks for interacting with backend APIs

### Server-Side

1. **API Routes**: Organized into logical groups
   - Admin routes
   - Authentication routes
   - Client routes
   - Appointment routes
   - Service routes
   - Payment routes
   - Notification routes
   - Beta program routes

2. **Services Layer**: Modular services for business logic
   - `notificationService`: Handles reminders and notifications
   - `directNotificationService`: Direct messaging capabilities (WhatsApp, SMS)
   - `googleCalendarService`: Google Calendar integration
   - `paymentService`: Payment processing
   - `tokenService`: Manages activation tokens
   - `authService`: Authentication and authorization
   - `encryptionService`: Handles encryption of sensitive data
   - `companyNameService`: Manages company branding settings

3. **Data Access Layer**: 
   - Database interactions through Drizzle ORM
   - Storage service for persistence
   - Data encryption for sensitive fields

4. **Scheduler**:
   - Cron-based job scheduler for recurring tasks
   - Handles automated reminders for upcoming appointments

### Database Schema

Key entities include:
- `clients`: Customer information
- `services`: Available services with duration and pricing
- `appointments`: Scheduled appointments linking clients and services
- `users`: Staff and client user accounts
- `reminderTemplates`: Templates for notification messages
- `notifications`: Stored notification history
- `invoices` and `invoiceItems`: Billing information
- `payments`: Payment records
- `subscriptionPlans` and `subscriptions`: Subscription management

## 4. Data Flow

### Authentication Flow

1. Users authenticate via username/password
2. JWT tokens or session-based authentication is used
3. Different access levels based on user role (admin, staff, client)
4. Client accounts can be activated via tokenized links

### Appointment Booking Flow

1. Staff creates client record (if not existing)
2. Staff selects service and time slot
3. Appointment is created in the database
4. Confirmation notifications can be sent to client
5. Automated reminders are scheduled based on settings
6. Google Calendar events may be created if integration is enabled

### Payment Processing Flow

1. Invoices are generated for appointments/services
2. Multiple payment methods supported (PayPal, Stripe)
3. Payment records are created and linked to invoices
4. Receipts can be sent to clients

### Notification Flow

1. System events trigger notifications
2. Templates are populated with relevant data
3. Delivery method selected based on settings (email, SMS, WhatsApp)
4. Delivery status tracked
5. Failed notifications can be retried

## 5. External Dependencies

### Third-Party Services

1. **Email Services**:
   - SendGrid for email delivery

2. **SMS and Messaging**:
   - WhatsApp Web.js for WhatsApp messaging
   - Twilio for SMS (optional)

3. **Payment Processors**:
   - Stripe for card payments
   - PayPal for PayPal payments
   - Wise (TransferWise) for international transfers

4. **Google Services**:
   - Google Calendar API for calendar integration
   - Google OAuth for authentication

5. **Authentication**:
   - Passport.js for authentication strategies

### Key Libraries

- **UI**: Radix UI components, Tailwind CSS
- **State Management**: React Query
- **Database**: Drizzle ORM, PostgreSQL
- **API**: Express.js
- **Build Tools**: Vite, esbuild
- **Scheduling**: node-cron
- **Encryption**: crypto-js

## 6. Deployment Strategy

The application is configured for deployment on Replit, with additional considerations for maintaining uptime:

### Build Process

1. Client-side code is built with Vite
2. Server-side code is bundled with esbuild
3. Combined assets are deployed as a single application

### Replit Configuration

- Uses Replit's autoscale deployment target
- Configured with Node.js 20, PostgreSQL, and Web modules
- Custom Nix configuration for additional dependencies

### Persistence Strategies

Multiple services work together to maintain application uptime:
- `keepAliveService`: Periodic self-pings to prevent idle timeouts
- `externalPingService`: Supports external uptime monitoring
- `autoRestartService`: Automatic recovery from failures
- `persistenceService`: Prevents application suspension

### Data Security

- Sensitive fields are encrypted before storage
- Environment variables used for storing secrets
- GDPR compliance features built-in

## 7. Cross-Cutting Concerns

### Multilingual Support

- Translations stored in JSON files
- Python scripts for managing and synchronizing translations
- Support for 9 languages (Italian being the base language)

### Security

- Password hashing with scrypt
- Session-based authentication
- Field-level encryption for sensitive data
- Role-based access control

### Monitoring and Maintenance

- Ping statistics tracking
- Restart capabilities
- Health check endpoints
- Logging of critical operations

## 8. Future Considerations

Based on the codebase, these areas appear to be planned or in development:

1. Enhanced client portal with self-service features
2. More sophisticated subscription management
3. Advanced reporting and analytics
4. More payment gateway integrations
5. Enhanced mobile experience