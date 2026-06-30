// @ts-nocheck
import { logger } from './utils/logger';
import * as fs from 'fs';
import { 
  clients, type Client, type InsertClient,
  services, type Service, type InsertService,
  staff, treatmentRooms,
  appointments, type Appointment, type InsertAppointment,
  consents, type Consent, type InsertConsent,
  invoices, type Invoice, type InsertInvoice, 
  invoiceItems, type InvoiceItem, type InsertInvoiceItem,
  payments, type Payment, type InsertPayment,
  users, type User, type InsertUser,
  clientAccounts, type ClientAccount, type InsertClientAccount,
  codeMigrationCrosswalk, type CodeMigrationCrosswalk, type InsertCodeMigrationCrosswalk,
  notifications, type Notification, type InsertNotification,
  activationTokens, type ActivationToken, type InsertActivationToken,
  clientNotes, type ClientNote, type InsertClientNote,
  googleCalendarEvents, type GoogleCalendarEvent, type InsertGoogleCalendarEvent,
  googleCalendarSettings, type GoogleCalendarSettings, type InsertGoogleCalendarSettings,
  notificationSettings, type NotificationSettings, type InsertNotificationSettings,
  reminderTemplates, type ReminderTemplate, type InsertReminderTemplate,
  appSettings, type AppSettings, type InsertAppSettings,
  betaInvitations, type BetaInvitation, type InsertBetaInvitation,
  userSettings, type UserSettings, type InsertUserSettings,
  betaFeedback, type BetaFeedback, type InsertBetaFeedback,
  subscriptionPlans, type SubscriptionPlan, type InsertSubscriptionPlan,
  subscriptions, type Subscription, type InsertSubscription,
  paymentMethods, type PaymentMethod, type InsertPaymentMethod,
  paymentTransactions, type PaymentTransaction, type InsertPaymentTransaction,
  paymentMethodsConfig, type PaymentMethodsConfig,
  licenses, type License, type InsertLicense,
  onboardingProgress, type OnboardingProgress, type InsertOnboardingProgress,
  companyNameSettings, type CompanyNameSettings, type InsertCompanyNameSettings,
  contactSettings, type ContactSettings, type InsertContactSettings,
  currencySettings, type CurrencySettings, type InsertCurrencySettings,
  manualContent, type ManualContent, type InsertManualContent,
  productCategories, type ProductCategory, type InsertProductCategory,
  products, type Product, type InsertProduct,
  stockMovements, type StockMovement, type InsertStockMovement,
  productSales, type ProductSale, type InsertProductSale,
  referralCommissions,
  userIcons,
  type AppointmentWithDetails,
  type ClientWithAppointments,
  type InvoiceWithDetails,
  type InvoiceItemWithDetails,
  type SubscriptionWithDetails,
  type BetaFeedbackWithUserDetails,
  type Staff, type InsertStaff,
  type TreatmentRoom, type InsertTreatmentRoom
} from "../shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import createMemoryStore from "memorystore";
import pg from "pg";
import { db } from "./db";
import { eq, desc, and, gte, lte, like, or, sql, ne, asc, inArray, not } from 'drizzle-orm';
import { inventoryJsonStorage } from "./inventory-json-storage.js";

// Global flag to check if PostgreSQL is available
let isDatabaseAvailable = true;

// Check database connection at startup
async function checkDatabaseAvailability(): Promise<boolean> {
  try {
    // Raw SQL — non usa Drizzle per evitare fallimenti su colonne mancanti
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
    await pool.query('SELECT 1');
    await pool.end();
    isDatabaseAvailable = true;
    console.log('✅ PostgreSQL database is available');
    return true;
  } catch (error) {
    isDatabaseAvailable = false;
    console.log('⚠️ PostgreSQL not available - using JSON storage only (no connection delays)');
    return false;
  }
}

// Call this check at module initialization
checkDatabaseAvailability();

// Ensure the user_sessions table exists (for connect-pg-simple)
// Retries up to 5 times with exponential backoff; in production throws on final failure.
export async function ensureSessionTable(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const MAX_RETRIES = 5;
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "user_sessions" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
        );
      `);
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
          ) THEN
            ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
          END IF;
        END$$;
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
      `);
      // Colonne aggiunte in sessioni successive — safe con IF NOT EXISTS
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_disabled_by_user boolean DEFAULT false;`);
      await pool.end();
      console.log('✅ Table user_sessions verified/created successfully');
      return;
    } catch (error) {
      lastError = error;
      console.error(`⚠️ Error creating user_sessions table (attempt ${attempt}/${MAX_RETRIES}):`, error);
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Retrying user_sessions creation in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  const msg = `❌ FATAL: Could not create user_sessions table after ${MAX_RETRIES} attempts. Login will not work.`;
  console.error(msg, lastError);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  }
}

// Interface defining all storage operations
export interface IStorage {
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClients(ownerId?: number): Promise<Client[]>;
  getVisibleClientsForUser(userId: number, role: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  
  // Reminder Template operations
  getReminderTemplate(id: number): Promise<ReminderTemplate | undefined>;
  getReminderTemplates(): Promise<ReminderTemplate[]>;
  getDefaultReminderTemplate(type?: string): Promise<ReminderTemplate | undefined>;
  getReminderTemplateByService(serviceId: number, type?: string): Promise<ReminderTemplate | undefined>;
  createReminderTemplate(template: InsertReminderTemplate): Promise<ReminderTemplate>;
  updateReminderTemplate(id: number, template: Partial<InsertReminderTemplate>): Promise<ReminderTemplate | undefined>;
  deleteReminderTemplate(id: number): Promise<boolean>;
  
  // Service operations
  getService(id: number): Promise<Service | undefined>;
  getServices(): Promise<Service[]>;
  getServicesForUser(userId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Staff operations
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffForUser(userId: number): Promise<Staff[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: number, staff: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaff(id: number): Promise<boolean>;
  
  // Treatment Room operations
  getTreatmentRoom(id: number): Promise<TreatmentRoom | undefined>;
  getTreatmentRoomsForUser(userId: number): Promise<TreatmentRoom[]>;
  createTreatmentRoom(room: InsertTreatmentRoom): Promise<TreatmentRoom>;
  updateTreatmentRoom(id: number, room: Partial<InsertTreatmentRoom>): Promise<TreatmentRoom | undefined>;
  deleteTreatmentRoom(id: number): Promise<boolean>;
  
  // Appointment operations - Multi-tenant system
  getAppointment(id: number): Promise<AppointmentWithDetails | undefined>;
  getAppointmentsByClient(clientId: number): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<AppointmentWithDetails[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  
  // Multi-tenant appointment operations - per-user separation system
  getAppointmentsForUser(userId: number, userType: string): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDateForUser(date: string, userId: number, userType: string): Promise<AppointmentWithDetails[]>;
  
  // Consent operations
  getConsent(id: number): Promise<Consent | undefined>;
  getConsentByClient(clientId: number): Promise<Consent | undefined>;
  createConsent(consent: InsertConsent): Promise<Consent>;
  
  // Invoice operations
  getInvoice(id: number): Promise<InvoiceWithDetails | undefined>;
  getInvoices(): Promise<InvoiceWithDetails[]>;
  getInvoicesByClient(clientId: number): Promise<InvoiceWithDetails[]>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAssignmentCode(assignmentCode: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  getUsersByReferrer(referrerId: number): Promise<User[]>;
  getAllStaffUsers(): Promise<User[]>;
  getOwnersByIds(ownerIds: number[]): Promise<Array<{ id: number; assignmentCode: string | null; username: string }>>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<boolean>;
  updateStaffBanking(staffId: number, banking: { iban?: string; bic?: string; bankName?: string; accountHolder?: string }): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
  
  // Client Account operations
  getClientAccount(id: number): Promise<ClientAccount | undefined>;
  getClientAccountByClientId(clientId: number): Promise<ClientAccount | undefined>;
  getClientAccountByUsername(username: string): Promise<ClientAccount | undefined>;
  createClientAccount(account: InsertClientAccount): Promise<ClientAccount>;
  updateClientAccount(id: number, account: Partial<InsertClientAccount>): Promise<ClientAccount | undefined>;
  deleteClientAccount(id: number): Promise<boolean>;
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByClient(clientId: number): Promise<Notification[]>;
  getUnreadNotificationsByClient(clientId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Activation Token operations
  getActivationToken(token: string): Promise<ActivationToken | undefined>;
  getActivationTokensByClientId(clientId: number): Promise<ActivationToken[]>;
  createActivationToken(token: InsertActivationToken): Promise<ActivationToken>;
  updateActivationToken(token: string, data: Partial<InsertActivationToken>): Promise<ActivationToken | undefined>;
  updateActivationTokenExpiry(id: number, newExpiresAt: Date): Promise<ActivationToken | undefined>;
  
  // Session store for authentication
  sessionStore: session.Store;
  getInvoicesByDateRange(startDate: string, endDate: string): Promise<InvoiceWithDetails[]>;
  getInvoicesByStatus(status: string): Promise<InvoiceWithDetails[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  
  // Invoice Item operations
  getInvoiceItem(id: number): Promise<InvoiceItemWithDetails | undefined>;
  getInvoiceItemsByInvoice(invoiceId: number): Promise<InvoiceItemWithDetails[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: number, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: number): Promise<boolean>;
  
  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByInvoice(invoiceId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  
  // Special operations
  getClientWithAppointments(clientId: number): Promise<ClientWithAppointments | undefined>;
  searchClients(query: string): Promise<Client[]>;
  generateInvoiceNumber(): Promise<string>;
  
  // Referral system operations with authentic date
  getAllStaffUsers(): Promise<User[]>;
  getReferralCodeForUser(userId: number): Promise<string | null>;
  getReferralsByStaffId(staffId: number): Promise<any[]>;
  getBankingInfoForStaff(staffId: number): Promise<any>;
  createReferralCommission(commission: any): Promise<any>;
  getReferralCommissions(): Promise<any[]>;
  getReferralCommissionsByReferrer(referrerId: number): Promise<any[]>;
  getReferralCommissionsByReferred(referredId: number): Promise<any>;
  updateReferralCommission(id: number, data: any): Promise<any>;
  
  // License operations
  getLicense(id: number): Promise<License | undefined>;
  getLicenses(): Promise<License[]>;
  getLicensesByUserId(userId: number): Promise<License[]>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: number, license: Partial<InsertLicense>): Promise<License | undefined>;
  getSubscriptions(): Promise<Subscription[]>;
  
  // Activation token operations
  createActivationToken(token: InsertActivationToken): Promise<ActivationToken>;
  getActivationToken(token: string): Promise<ActivationToken | undefined>;
  updateActivationToken(token: string, data: Partial<InsertActivationToken>): Promise<ActivationToken | undefined>;
  
  // Client Notes operations
  getClientNote(id: number): Promise<ClientNote | undefined>;
  getClientNotes(clientId: number): Promise<ClientNote[]>;
  createClientNote(note: InsertClientNote): Promise<ClientNote>;
  updateClientNote(id: number, note: Partial<InsertClientNote>): Promise<ClientNote | undefined>;
  deleteClientNote(id: number): Promise<boolean>;
  
  // Google Calendar operations
  getGoogleCalendarSettings(): Promise<GoogleCalendarSettings | undefined>;
  saveGoogleCalendarSettings(settings: InsertGoogleCalendarSettings): Promise<GoogleCalendarSettings>;
  updateGoogleCalendarSettings(id: number, settings: Partial<InsertGoogleCalendarSettings>): Promise<GoogleCalendarSettings | undefined>;
  
  getGoogleCalendarEvent(appointmentId: number): Promise<GoogleCalendarEvent | undefined>;
  createGoogleCalendarEvent(event: InsertGoogleCalendarEvent): Promise<GoogleCalendarEvent>;
  updateGoogleCalendarEvent(appointmentId: number, event: Partial<InsertGoogleCalendarEvent>): Promise<GoogleCalendarEvent | undefined>;
  deleteGoogleCalendarEvent(appointmentId: number): Promise<boolean>;
  
  // App Settings operations
  getSetting(key: string, userId?: number): Promise<AppSettings | undefined>;
  getAllSettings(): Promise<AppSettings[]>;
  getSettingsByCategory(category: string): Promise<AppSettings[]>;
  saveSetting(key: string, value: string, description?: string, category?: string, userId?: number): Promise<AppSettings>;
  updateSetting(id: number, setting: Partial<InsertAppSettings>): Promise<AppSettings | undefined>;
  deleteSetting(id: number): Promise<boolean>;

  // User Settings operations - separate architecture per user
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;
  deleteUserSettings(userId: number): Promise<boolean>;
  getUserIconPath(userId: number): Promise<string | undefined>;
  updateUserIconPath(userId: number, iconPath: string): Promise<UserSettings | undefined>;
  
  // Company Name Settings operations - Multi-tenant separation
  getCompanyNameSettings(userId: number): Promise<any | undefined>;
  saveCompanyNameSettings(userId: number, settings: any): Promise<any>;
  updateCompanyNameSettings(userId: number, settings: any): Promise<any | undefined>;
  
  // Contact Settings operations - Simple phone/email configuration (replaces SMS verification)
  getContactSettings(tenantId: number): Promise<ContactSettings | undefined>;
  createContactSettings(settings: InsertContactSettings): Promise<ContactSettings>;
  updateContactSettings(tenantId: number, settings: Partial<InsertContactSettings>): Promise<ContactSettings | undefined>;
  deleteContactSettings(tenantId: number): Promise<boolean>;
  
  // Currency Settings operations - currency management per user
  getCurrencySettings(userId: number): Promise<CurrencySettings | undefined>;
  saveCurrencySettings(userId: number, currency: string, symbol: string): Promise<CurrencySettings>;
  
  // Manual Content operations - Interactive manual management system
  getManualContent(userId: number, section: string, locale: string): Promise<ManualContent | undefined>;
  getAllManualSections(userId: number, locale: string): Promise<ManualContent[]>;
  saveManualContent(content: InsertManualContent): Promise<ManualContent>;
  updateManualContent(id: number, userId: number, content: Partial<InsertManualContent>): Promise<ManualContent | undefined>;
  deleteManualContent(id: number, userId: number): Promise<boolean>;
  
  // Notification Settings operations
  getNotificationSettings(): Promise<NotificationSettings | undefined>;
  saveNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings>;
  updateNotificationSettings(id: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings | undefined>;
  
  // Timezone settings
  getTimezoneSettings(): Promise<{ timezone: string; offset: number; name: string; } | undefined>;
  saveTimezoneSettings(timezone: string, offset: number, name: string): Promise<{ timezone: string; offset: number; name: string; }>;
  
  // Contact Info
  getContactInfo(): Promise<{ email: string; phone1: string; website: string; instagram: string; phone2: string; businessName?: string; address?: string; } | undefined>;
  
  // Notifications additional methods
  saveNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByType(type: string, limit?: number): Promise<Notification[]>;
  
  // Beta Tester operations
  createBetaInvitation(invitation: InsertBetaInvitation): Promise<BetaInvitation>;
  getBetaInvitation(code: string): Promise<BetaInvitation | undefined>;
  getBetaInvitations(): Promise<BetaInvitation[]>;
  updateBetaInvitation(id: number, invitation: Partial<InsertBetaInvitation>): Promise<BetaInvitation | undefined>;
  deleteBetaInvitation(id: number): Promise<boolean>;
  markBetaInvitationAsUsed(code: string, userId: number): Promise<BetaInvitation | undefined>;
  
  // Beta Feedback operations
  createBetaFeedback(feedback: InsertBetaFeedback): Promise<BetaFeedback>;
  getBetaFeedback(id: number): Promise<BetaFeedbackWithUserDetails | undefined>;
  getBetaFeedbackByUser(userId: number): Promise<BetaFeedback[]>;
  getAllBetaFeedback(): Promise<BetaFeedbackWithUserDetails[]>;
  updateBetaFeedback(id: number, feedback: Partial<InsertBetaFeedback>): Promise<BetaFeedback | undefined>;
  deleteBetaFeedback(id: number): Promise<boolean>;
  
  // Subscription Plan operations
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: number): Promise<boolean>;
  
  // Subscription operations
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscription(id: number): Promise<SubscriptionWithDetails | undefined>;
  getSubscriptionByUserId(userId: number): Promise<SubscriptionWithDetails | undefined>;
  getSubscriptionByPayPalOrderId(orderId: string): Promise<SubscriptionWithDetails | undefined>;
  getActiveSubscriptions(): Promise<SubscriptionWithDetails[]>;
  updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  cancelSubscription(id: number, cancelAtPeriodEnd: boolean): Promise<Subscription | undefined>;
  
  // Payment Method operations
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  getPaymentMethod(id: number): Promise<PaymentMethod | undefined>;
  getPaymentMethodsByUser(userId: number): Promise<PaymentMethod[]>;
  getDefaultPaymentMethod(userId: number): Promise<PaymentMethod | undefined>;
  updatePaymentMethod(id: number, method: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: number): Promise<boolean>;
  setDefaultPaymentMethod(id: number, userId: number): Promise<boolean>;
  
  // Payment Transaction operations
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionsByUser(userId: number): Promise<PaymentTransaction[]>;
  getPaymentTransactionsBySubscription(subscriptionId: number): Promise<PaymentTransaction[]>;
  getPaymentTransactionsByWiseId(transactionId: string): Promise<PaymentTransaction[]>;
  getPaymentTransactionsByMethod(method: string): Promise<PaymentTransaction[]>;
  getAllPaymentTransactions(): Promise<PaymentTransaction[]>;
  updatePaymentTransaction(id: number, transaction: Partial<InsertPaymentTransaction>): Promise<PaymentTransaction | undefined>;
  
  // Banking Settings operations
  getBankingSettings(): Promise<any>;
  saveBankingSettings(settings: any): Promise<void>;
  
  // Onboarding Progress operations
  getOnboardingProgress(userId: number): Promise<OnboardingProgress | undefined>;
  createOnboardingProgress(progress: InsertOnboardingProgress): Promise<OnboardingProgress>;
  updateOnboardingProgress(userId: number, progress: Partial<InsertOnboardingProgress>): Promise<OnboardingProgress | undefined>;
  deleteOnboardingProgress(userId: number): Promise<boolean>;
  markOnboardingCompleted(userId: number): Promise<OnboardingProgress | undefined>;
  
  // Product Category operations
  getProductCategories(userId: number): Promise<ProductCategory[]>;
  getProductCategory(id: number, userId: number): Promise<ProductCategory | undefined>;
  createProductCategory(category: InsertProductCategory & { userId: number }): Promise<ProductCategory>;
  updateProductCategory(id: number, userId: number, category: Partial<InsertProductCategory>): Promise<ProductCategory | undefined>;
  deleteProductCategory(id: number, userId: number): Promise<boolean>;
  
  // Product operations
  getProducts(userId: number): Promise<Product[]>;
  getProduct(id: number, userId: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct & { userId: number }): Promise<Product>;
  updateProduct(id: number, userId: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number, userId: number): Promise<boolean>;
  getLowStockProducts(userId: number): Promise<Product[]>;
  
  // Stock Movement operations
  getStockMovements(userId: number, limit?: number): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement & { userId: number }): Promise<StockMovement>;
  getProductStockHistory(productId: number, userId: number): Promise<StockMovement[]>;
  
  // Product Sale operations
  getProductSales(userId: number, limit?: number): Promise<ProductSale[]>;
  createProductSale(sale: InsertProductSale & { userId: number }): Promise<ProductSale>;
  getProductSalesHistory(productId: number, userId: number): Promise<ProductSale[]>;
  
  // User Icon operations - For customized PWA (Sliplane-compatible)
  getUserIcon(userId: number): Promise<string | undefined>;
  saveUserIcon(userId: number, iconBase64: string): Promise<void>;
  deleteUserIcon(userId: number): Promise<boolean>;
}

// In-memory implementation of the storage interface with file persistence
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    if (process.env.DATABASE_URL) {
      // Use PostgreSQL to persist sessions across server restarts and deploys
      console.log('🗄️ Using PostgreSQL for sessions (persistent sessions across deploys)');
      const PgStore = connectPg(session);
      const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      this.sessionStore = new PgStore({
        pool: pgPool,
        tableName: 'user_sessions',
        ttl: 30 * 24 * 60 * 60, // 30 days in seconds
        createTableIfMissing: true,
      });
    } else {
      console.log('📝 Using MemoryStore for sessions (fallback without DATABASE_URL)');
      const MemoryStore = createMemoryStore(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000
      });
    }
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      return client;
    } catch (error) {
      console.error("Error getting client:", error);
      return undefined;
    }
  }

  async getClients(ownerId?: number): Promise<Client[]> {
    try {
      logger.debug(`🔍 DatabaseStorage.getClients called with ownerId: ${ownerId}`);
      
      let rawClients;
      if (ownerId !== undefined) {
        rawClients = await db.select().from(clients)
          .where(eq(clients.ownerId, ownerId))
          .orderBy(clients.lastName);
        
        logger.debug(`✅ DatabaseStorage: Found ${rawClients.length} clients for ownerId ${ownerId}`);
      } else {
        rawClients = await db.select().from(clients)
          .orderBy(clients.lastName);
        
        logger.debug(`✅ DatabaseStorage: Found ${rawClients.length} total clients`);
      }
      
      return rawClients;
    } catch (error) {
      console.error("Error getting clients:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.clients) {
          return [];
        }
        
        let filteredClients = storageData.clients
          .map(([_, client]: [number, any]) => client);
        
        if (ownerId !== undefined) {
          filteredClients = filteredClients.filter((client: Client) => client.ownerId === ownerId);
        }
        
        logger.debug(`✅ Retrieved ${filteredClients.length} clients from JSON${ownerId !== undefined ? ` for owner ${ownerId}` : ''}`);
        return filteredClients;
      } catch (jsonError) {
        console.error("Error getting clients from JSON:", jsonError);
        return [];
      }
    }
  }

  async getVisibleClientsForUser(userId: number, role: string): Promise<Client[]> {
    try {
      logger.debug(`🔍 DatabaseStorage.getVisibleClientsForUser for userId: ${userId}, role: ${role}`);
      
      // Exclude only the dummy clients imported from Google Calendar (email @imported.local)
      // Include clients with NULL email (e.g. contacts imported from Google Contacts)
      const excludeGoogleImported = or(
        sql`${clients.email} IS NULL`,
        not(like(clients.email, '%@imported.local'))
      );
      
      if (role === 'admin') {
        const allClients = await db.select().from(clients)
          .where(excludeGoogleImported)
          .orderBy(clients.lastName);
        logger.debug(`✅ DatabaseStorage: Admin sees ${allClients.length} total clients (excluding Google Calendar)`);
        return allClients;
      } else if (role === 'staff') {
        // STAFF: use assignmentCode to see assigned clients
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user || !user.assignmentCode) {
          console.log(`❌ DatabaseStorage: Staff ${userId} without assignmentCode`);
          return [];
        }
        
        const userPrefix = user.assignmentCode.substring(0, 3);
        logger.debug(`🔍 DatabaseStorage: Staff ${userId} looking for clients with prefix ${userPrefix}`);
        
        // Filter clients by both ownerId and prefix in uniqueCode, excluding Google Calendar
        const userClients = await db.select().from(clients)
          .where(
            and(
              excludeGoogleImported,
              or(
                eq(clients.ownerId, userId),
                like(clients.uniqueCode, `${userPrefix}-%`)
              )
            )
          )
          .orderBy(clients.lastName);
        
        logger.debug(`✅ DatabaseStorage: Staff ${userId} (${userPrefix}) sees ${userClients.length} clients (excluding Google Calendar)`);
        return userClients;
      } else {
        // CUSTOMER: vede only i suoi clients (basandosi su ownerId)
        logger.debug(`🔍 DatabaseStorage: Customer ${userId} searching for their own clients (ownerId)`);
        
        const userClients = await db.select().from(clients)
          .where(and(excludeGoogleImported, eq(clients.ownerId, userId)))
          .orderBy(clients.lastName);
        
        logger.debug(`✅ DatabaseStorage: Customer ${userId} sees ${userClients.length} own clients (excluding Google Calendar)`);
        return userClients;
      }
    } catch (error) {
      console.error("Error getting visible clients:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.clients) {
          return [];
        }
        
        const allClients = storageData.clients
          .map(([_, client]: [number, any]) => client);
        
        if (role === 'admin') {
          logger.debug(`✅ Retrieved ${allClients.length} clients from JSON for admin user ${userId}`);
          return allClients;
        } else {
          // Filter by ownerId for non-admin users
          const userClients = allClients.filter((client: Client) => client.ownerId === userId);
          logger.debug(`✅ Retrieved ${userClients.length} clients from JSON for user ${userId}`);
          return userClients;
        }
      } catch (jsonError) {
        console.error("Error getting visible clients from JSON:", jsonError);
        return [];
      }
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      const [newClient] = await db.insert(clients).values(client).returning();
      return newClient;
    } catch (error) {
      console.error("Error creating client:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.clients) {
          storageData.clients = [];
        }
        
        const maxId = storageData.clients.reduce((max: number, [id]: [number, any]) => 
          Math.max(max, id), 0);
        
        const newClient: Client = {
          id: maxId + 1,
          ...client,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        storageData.clients.push([newClient.id, newClient]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Client ${newClient.id} created in JSON storage`);
        return newClient;
      } catch (jsonError) {
        console.error("Error creating client in JSON:", jsonError);
        throw error;
      }
    }
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      const [updatedClient] = await db.update(clients)
        .set(client)
        .where(eq(clients.id, id))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error("Error updating client:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.clients) {
          return undefined;
        }
        
        const clientIndex = storageData.clients.findIndex(([cId]: [number, any]) => cId === id);
        if (clientIndex === -1) {
          return undefined;
        }
        
        const existingClient = storageData.clients[clientIndex][1];
        const updatedClient = {
          ...existingClient,
          ...client,
          updatedAt: new Date()
        };
        
        storageData.clients[clientIndex] = [id, updatedClient];
        saveStorageData(storageData);
        
        logger.debug(`✅ Client ${id} updated in JSON storage`);
        return updatedClient;
      } catch (jsonError) {
        console.error("Error updating client in JSON:", jsonError);
        return undefined;
      }
    }
  }

  async deleteClient(id: number): Promise<boolean> {
    try {
      const result = await db.delete(clients).where(eq(clients.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting client:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.clients) {
          return false;
        }
        
        const initialLength = storageData.clients.length;
        storageData.clients = storageData.clients.filter(([cId]: [number, any]) => cId !== id);
        
        if (storageData.clients.length === initialLength) {
          return false; // Client not found
        }
        
        saveStorageData(storageData);
        logger.debug(`✅ Client ${id} deleted from JSON storage`);
        return true;
      } catch (jsonError) {
        console.error("Error deleting client in JSON:", jsonError);
        return false;
      }
    }
  }
  
  // Beta Invitation operations
  async createBetaInvitation(invitation: InsertBetaInvitation): Promise<BetaInvitation> {
    try {
      console.log("Creating beta invitation:", invitation);
      const [newInvitation] = await db.insert(betaInvitations).values({
        email: invitation.email,
        invitationCode: invitation.invitationCode,
        isUsed: invitation.isUsed || false,
        usedById: invitation.usedById || null,
        usedCount: invitation.usedCount || 0,
        maxUses: invitation.maxUses || 1,
        expiresAt: invitation.expiresAt || null,
        notes: invitation.notes || null,
        usedAt: invitation.usedAt || null
      }).returning();
      
      console.log("Created beta invitation:", newInvitation);
      return newInvitation;
    } catch (error) {
      console.error("Error creating beta invitation:", error);
      throw error;
    }
  }
  
  async getBetaInvitation(code: string): Promise<BetaInvitation | undefined> {
    try {
      const [invitation] = await db.select().from(betaInvitations)
        .where(eq(betaInvitations.invitationCode, code));
      return invitation;
    } catch (error) {
      console.error("Error getting beta invitation:", error);
      return undefined;
    }
  }
  
  async getBetaInvitations(): Promise<BetaInvitation[]> {
    try {
      return await db.select().from(betaInvitations)
        .orderBy(desc(betaInvitations.createdAt));
    } catch (error) {
      console.error("Error getting beta invitations:", error);
      return [];
    }
  }
  
  async updateBetaInvitation(id: number, invitation: Partial<InsertBetaInvitation>): Promise<BetaInvitation | undefined> {
    try {
      const [updated] = await db.update(betaInvitations)
        .set(invitation)
        .where(eq(betaInvitations.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating beta invitation:", error);
      return undefined;
    }
  }
  
  async deleteBetaInvitation(id: number): Promise<boolean> {
    try {
      const result = await db.delete(betaInvitations)
        .where(eq(betaInvitations.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting beta invitation:", error);
      return false;
    }
  }
  
  async markBetaInvitationAsUsed(code: string, userId: number): Promise<BetaInvitation | undefined> {
    try {
      const invitation = await this.getBetaInvitation(code);
      if (!invitation) return undefined;
      
      // Check if the invite can still be used
      if ((invitation.usedCount ?? 0) >= (invitation.maxUses ?? 0)) {
        return undefined;
      }
      
      const usedCount = invitation.usedCount ?? 0;
      const maxUses = invitation.maxUses ?? 0;
      const isUsed = usedCount + 1 >= maxUses;
      const [updated] = await db.update(betaInvitations)
        .set({
          usedCount: usedCount + 1,
          isUsed: isUsed,
          usedById: userId,
          usedAt: isUsed ? new Date() : invitation.usedAt
        })
        .where(eq(betaInvitations.invitationCode, code))
        .returning();
      
      return updated;
    } catch (error) {
      console.error("Error marking beta invitation as used:", error);
      return undefined;
    }
  }
  
  // Beta Feedback operations
  async createBetaFeedback(feedback: InsertBetaFeedback): Promise<BetaFeedback> {
    try {
      const [newFeedback] = await db.insert(betaFeedback).values({
        userId: feedback.userId,
        feedbackType: feedback.feedbackType || "general",
        content: feedback.content,
        rating: feedback.rating || null,
        status: feedback.status || "pending",
        reviewedBy: feedback.reviewedBy || null,
        reviewedAt: feedback.reviewedAt || null,
        screenshot: feedback.screenshot || null
      }).returning();
      
      return newFeedback;
    } catch (error) {
      console.error("Error creating beta feedback:", error);
      throw error;
    }
  }
  
  async getBetaFeedback(id: number): Promise<BetaFeedbackWithUserDetails | undefined> {
    try {
      const [feedback] = await db.select().from(betaFeedback)
        .where(eq(betaFeedback.id, id));
      
      if (!feedback) return undefined;
      
      // Get i dettagli of the user
      const user = await this.getUser(feedback.userId);
      let reviewedByUser = undefined;
      
      if (feedback.reviewedBy) {
        reviewedByUser = await this.getUser(feedback.reviewedBy);
      }
      
      return {
        ...feedback,
        user: user!,
        reviewedByUser
      };
    } catch (error) {
      console.error("Error getting beta feedback:", error);
      return undefined;
    }
  }
  
  async getBetaFeedbackByUser(userId: number): Promise<BetaFeedback[]> {
    try {
      return await db.select().from(betaFeedback)
        .where(eq(betaFeedback.userId, userId))
        .orderBy(desc(betaFeedback.createdAt));
    } catch (error) {
      console.error("Error getting beta feedback by user:", error);
      return [];
    }
  }
  
  async getAllBetaFeedback(): Promise<BetaFeedbackWithUserDetails[]> {
    try {
      const feedbacks = await db.select().from(betaFeedback)
        .orderBy(desc(betaFeedback.createdAt));
      
      // Add user details for each feedback
      const result: BetaFeedbackWithUserDetails[] = [];
      
      for (const feedback of feedbacks) {
        const user = await this.getUser(feedback.userId);
        let reviewedByUser = undefined;
        
        if (feedback.reviewedBy) {
          reviewedByUser = await this.getUser(feedback.reviewedBy);
        }
        
        result.push({
          ...feedback,
          user: user!,
          reviewedByUser
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error getting all beta feedback:", error);
      return [];
    }
  }
  
  async updateBetaFeedback(id: number, feedback: Partial<InsertBetaFeedback>): Promise<BetaFeedback | undefined> {
    try {
      const [updated] = await db.update(betaFeedback)
        .set(feedback)
        .where(eq(betaFeedback.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error("Error updating beta feedback:", error);
      return undefined;
    }
  }
  
  async deleteBetaFeedback(id: number): Promise<boolean> {
    try {
      await db.delete(betaFeedback).where(eq(betaFeedback.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting beta feedback:", error);
      return false;
    }
  }
  // ONBOARDING PROGRESS OPERATIONS
  async getOnboardingProgress(userId: number): Promise<OnboardingProgress | undefined> {
    try {
      const [progress] = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userId, userId));
      return progress || undefined;
    } catch (error) {
      console.error("Error getting onboarding progress:", error);
      return undefined;
    }
  }

  async createOnboardingProgress(progress: InsertOnboardingProgress): Promise<OnboardingProgress> {
    try {
      const [created] = await db.insert(onboardingProgress).values(progress).returning();
      return created;
    } catch (error) {
      console.error("Error creating onboarding progress:", error);
      throw error;
    }
  }

  async updateOnboardingProgress(userId: number, progress: Partial<InsertOnboardingProgress>): Promise<OnboardingProgress | undefined> {
    try {
      const [updated] = await db.update(onboardingProgress)
        .set({ ...progress, updatedAt: new Date() })
        .where(eq(onboardingProgress.userId, userId))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error("Error updating onboarding progress:", error);
      return undefined;
    }
  }

  async deleteOnboardingProgress(userId: number): Promise<boolean> {
    try {
      await db.delete(onboardingProgress).where(eq(onboardingProgress.userId, userId));
      return true;
    } catch (error) {
      console.error("Error deleting onboarding progress:", error);
      return false;
    }
  }

  async markOnboardingCompleted(userId: number): Promise<OnboardingProgress | undefined> {
    try {
      const [completed] = await db.update(onboardingProgress)
        .set({ isCompleted: true, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(onboardingProgress.userId, userId))
        .returning();
      return completed || undefined;
    } catch (error) {
      console.error("Error marking onboarding as completed:", error);
      return undefined;
    }
  }

  // SERVICE OPERATIONS
  async getService(id: number): Promise<Service | undefined> {
    try {
      const [service] = await db.select().from(services).where(eq(services.id, id));
      return service;
    } catch (error) {
      console.error("Error getting service:", error);
      return undefined;
    }
  }

  async getServices(): Promise<Service[]> {
    try {
      return await db.select().from(services).orderBy(services.name);
    } catch (error) {
      console.error("Error getting services:", error);
      return [];
    }
  }

  // NEW Multi-tenant system: Services separated per user
  async getServicesForUser(userId: number): Promise<Service[]> {
    try {
      // NEW multi-tenant system: user services retrieval - debug removed
      const userServices = await db
        .select()
        .from(services)
        .where(eq(services.userId, userId))
        .orderBy(services.name);
      
      logger.debug(`✅ NEW System: ${userServices.length} services for user ${userId} - FULL SEPARATION`);
      return userServices;
    } catch (error) {
      console.error("Error getting services for user:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.services) {
          return [];
        }
        
        const userServices = storageData.services
          .map(([_, service]: [number, any]) => service)
          .filter((s: any) => s.userId === userId);
        
        logger.debug(`✅ Retrieved ${userServices.length} services from JSON for user ${userId}`);
        return userServices;
      } catch (jsonError) {
        console.error("Error getting services from JSON:", jsonError);
        return [];
      }
    }
  }

  async createService(service: InsertService): Promise<Service> {
    try {
      const [newService] = await db.insert(services).values(service).returning();
      return newService;
    } catch (error) {
      console.error("Error creating service:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.services) {
          storageData.services = [];
        }
        
        const maxId = storageData.services.reduce((max: number, [id]: [number, any]) => 
          Math.max(max, id), 0);
        
        const newService: Service = {
          id: maxId + 1,
          ...service,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        storageData.services.push([newService.id, newService]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Service ${newService.id} created in JSON storage`);
        return newService;
      } catch (jsonError) {
        console.error("Error creating service in JSON:", jsonError);
        throw error;
      }
    }
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    try {
      const [updatedService] = await db
        .update(services)
        .set(service)
        .where(eq(services.id, id))
        .returning();
      return updatedService;
    } catch (error) {
      console.error("Error updating service:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.services) {
          return undefined;
        }
        
        const serviceIndex = storageData.services.findIndex(([sId]: [number, any]) => sId === id);
        if (serviceIndex === -1) {
          return undefined;
        }
        
        const existingService = storageData.services[serviceIndex][1];
        const updatedService = {
          ...existingService,
          ...service,
          updatedAt: new Date()
        };
        
        storageData.services[serviceIndex] = [id, updatedService];
        saveStorageData(storageData);
        
        logger.debug(`✅ Service ${id} updated in JSON storage`);
        return updatedService;
      } catch (jsonError) {
        console.error("Error updating service in JSON:", jsonError);
        return undefined;
      }
    }
  }

  async deleteService(id: number): Promise<boolean> {
    try {
      await db.delete(services).where(eq(services.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting service:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.services) {
          return false;
        }
        
        const initialLength = storageData.services.length;
        storageData.services = storageData.services.filter(([sId]: [number, any]) => sId !== id);
        
        if (storageData.services.length === initialLength) {
          return false;
        }
        
        saveStorageData(storageData);
        logger.debug(`✅ Service ${id} deleted from JSON storage`);
        return true;
      } catch (jsonError) {
        console.error("Error deleting service in JSON:", jsonError);
        return false;
      }
    }
  }

  // STAFF OPERATIONS
  async getStaff(id: number): Promise<Staff | undefined> {
    try {
      const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
      return staffMember;
    } catch (error) {
      console.error("Error getting staff:", error);
      return undefined;
    }
  }

  async getStaffForUser(userId: number): Promise<Staff[]> {
    try {
      return await db
        .select()
        .from(staff)
        .where(and(eq(staff.userId, userId), eq(staff.isActive, true)))
        .orderBy(staff.firstName, staff.lastName);
    } catch (error) {
      console.error("Error getting staff for user:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.staff) {
          return [];
        }
        
        const userStaff = storageData.staff
          .map(([_, staffMember]: [number, any]) => staffMember)
          .filter((s: any) => s.userId === userId && s.isActive === true);
        
        logger.debug(`✅ Retrieved ${userStaff.length} staff from JSON for user ${userId}`);
        return userStaff;
      } catch (jsonError) {
        console.error("Error getting staff from JSON:", jsonError);
        return [];
      }
    }
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    try {
      const [newStaff] = await db.insert(staff).values(staffData).returning();
      return newStaff;
    } catch (error) {
      console.error("Error creating staff:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.staff) {
          storageData.staff = [];
        }
        
        const maxId = storageData.staff.reduce((max: number, [id]: [number, any]) => 
          Math.max(max, id), 0);
        
        const newStaff: Staff = {
          id: maxId + 1,
          ...staffData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        storageData.staff.push([newStaff.id, newStaff]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Staff ${newStaff.id} created in JSON storage`);
        return newStaff;
      } catch (jsonError) {
        console.error("Error creating staff in JSON:", jsonError);
        throw error;
      }
    }
  }

  async updateStaff(id: number, staffData: Partial<InsertStaff>): Promise<Staff | undefined> {
    try {
      const [updatedStaff] = await db
        .update(staff)
        .set(staffData)
        .where(eq(staff.id, id))
        .returning();
      return updatedStaff;
    } catch (error) {
      console.error("Error updating staff:", error);
      return undefined;
    }
  }

  async deleteStaff(id: number): Promise<boolean> {
    try {
      await db.delete(staff).where(eq(staff.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting staff:", error);
      return false;
    }
  }

  // TREATMENT ROOM OPERATIONS
  async getTreatmentRoom(id: number): Promise<TreatmentRoom | undefined> {
    try {
      const [room] = await db.select().from(treatmentRooms).where(eq(treatmentRooms.id, id));
      return room;
    } catch (error) {
      console.error("Error getting treatment room:", error);
      return undefined;
    }
  }

  async getTreatmentRoomsForUser(userId: number): Promise<TreatmentRoom[]> {
    try {
      return await db
        .select()
        .from(treatmentRooms)
        .where(and(eq(treatmentRooms.userId, userId), eq(treatmentRooms.isActive, true)))
        .orderBy(treatmentRooms.name);
    } catch (error) {
      console.error("Error getting treatment rooms for user:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.treatment_rooms) {
          return [];
        }
        
        const userRooms = storageData.treatment_rooms
          .map(([_, room]: [number, any]) => room)
          .filter((r: any) => r.userId === userId && r.isActive === true);
        
        logger.debug(`✅ Retrieved ${userRooms.length} treatment rooms from JSON for user ${userId}`);
        return userRooms;
      } catch (jsonError) {
        console.error("Error getting treatment rooms from JSON:", jsonError);
        return [];
      }
    }
  }

  async createTreatmentRoom(roomData: InsertTreatmentRoom): Promise<TreatmentRoom> {
    try {
      const [newRoom] = await db.insert(treatmentRooms).values(roomData).returning();
      return newRoom;
    } catch (error) {
      console.error("Error creating treatment room:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.treatment_rooms) {
          storageData.treatment_rooms = [];
        }
        
        const maxId = storageData.treatment_rooms.reduce((max: number, [id]: [number, any]) => 
          Math.max(max, id), 0);
        
        const newRoom: TreatmentRoom = {
          id: maxId + 1,
          ...roomData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        storageData.treatment_rooms.push([newRoom.id, newRoom]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Treatment room ${newRoom.id} created in JSON storage`);
        return newRoom;
      } catch (jsonError) {
        console.error("Error creating treatment room in JSON:", jsonError);
        throw error;
      }
    }
  }

  async updateTreatmentRoom(id: number, roomData: Partial<InsertTreatmentRoom>): Promise<TreatmentRoom | undefined> {
    try {
      const [updatedRoom] = await db
        .update(treatmentRooms)
        .set(roomData)
        .where(eq(treatmentRooms.id, id))
        .returning();
      return updatedRoom;
    } catch (error) {
      console.error("Error updating treatment room:", error);
      return undefined;
    }
  }

  async deleteTreatmentRoom(id: number): Promise<boolean> {
    try {
      await db.delete(treatmentRooms).where(eq(treatmentRooms.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting treatment room:", error);
      return false;
    }
  }

  // APPOINTMENT OPERATIONS
  async getAppointment(id: number): Promise<AppointmentWithDetails | undefined> {
    try {
      const result = await db
        .select({
          appointment: appointments,
          client: clients,
          service: services,
          staff: staff,
          room: treatmentRooms
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(staff, eq(appointments.staffId, staff.id))
        .leftJoin(treatmentRooms, eq(appointments.roomId, treatmentRooms.id))
        .where(eq(appointments.id, id))
        .limit(1);

      if (!result.length || !result[0].appointment) return undefined;

      const { appointment, client, service, staff: staffMember, room } = result[0];

      return {
        ...appointment,
        client: client || undefined,
        service: service || undefined,
        staff: staffMember || undefined,
        room: room || undefined
      };
    } catch (error) {
      console.error("Error getting appointment:", error);
      return undefined;
    }
  }

  // OBSOLETA: Rimossa per architettura multi-tenant
  // Use getAppointmentsForUser() instead

  async getAppointmentsByDate(date: string): Promise<AppointmentWithDetails[]> {
    try {
      const result: AppointmentWithDetails[] = [];
      const appointmentsList = await db
        .select()
        .from(appointments)
        .where(eq(appointments.date, date))
        .orderBy(appointments.startTime);

      for (const appointment of appointmentsList) {
        const [client] = await db.select().from(clients).where(eq(clients.id, appointment.clientId));
        const [service] = await db.select().from(services).where(eq(services.id, appointment.serviceId));
        
        result.push({
          ...appointment,
          client,
          service
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting appointments by date:", error);
      return [];
    }
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<AppointmentWithDetails[]> {
    try {
      const rows = await db
        .select({
          appointment: appointments,
          client: clients,
          service: services,
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.userId, users.id))
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .where(and(
          gte(appointments.date, startDate),
          lte(appointments.date, endDate),
          inArray(users.role, ['admin', 'staff', 'ev_staff', 'ev_admin'])
        ))
        .orderBy(appointments.date, appointments.startTime);

      return rows
        .filter(row => row.client)
        .map(row => ({
          ...row.appointment,
          client: row.client!,
          service: row.service ?? { id: row.appointment.serviceId, name: '—', duration: 60, price: '0', userId: row.appointment.userId, color: '#888888', description: null },
        }));
    } catch (error) {
      console.error("Error getting appointments by date range:", error);
      return [];
    }
  }

  // Multi-tenant appointment operations - per-user separation system RISTRUTTURATO
  async getAppointmentsForUser(userId: number, userType: string): Promise<AppointmentWithDetails[]> {
    try {
      // ⚡ OPTIMIZED: Use JOIN instead of multiple queries (includes staff and rooms)
      const { staff, treatmentRooms } = await import('../shared/schema.js');
      
      const result = await db
        .select({
          appointment: appointments,
          client: clients,
          service: services,
          staff: staff,
          room: treatmentRooms
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(staff, eq(appointments.staffId, staff.id))
        .leftJoin(treatmentRooms, eq(appointments.roomId, treatmentRooms.id))
        .where(eq(appointments.userId, userId))
        .orderBy(appointments.date, appointments.startTime);

      // Transform the result — keep appointments even if service was deleted (show placeholder)
      const formattedResult = result
        .filter(row => row.client) // Only require client; service may have been deleted
        .map(row => ({
          ...row.appointment,
          client: row.client!,
          service: row.service ?? { id: row.appointment.serviceId, name: '—', duration: 60, price: '0', userId, color: '#888888', description: null },
          staff: row.staff || undefined,
          room: row.room || undefined
        }));

      logger.debug(`✅ NEW multi-tenant system: ${formattedResult.length} appointments for user ${userId} (with staff/room) - FULL SEPARATION`);
      return formattedResult;
    } catch (error) {
      console.error("Error getting appointments for user:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.appointments) {
          return [];
        }
        
        const result: AppointmentWithDetails[] = [];
        
        // Filter appointments by userId
        const userAppointments = storageData.appointments
          .map(([_, apt]: [number, any]) => apt)
          .filter((apt: any) => apt.userId === userId);
        
        // Manual join with clients and services
        for (const appointment of userAppointments) {
          const client = storageData.clients?.find(([id]: [number, any]) => id === appointment.clientId)?.[1];
          const service = storageData.services?.find(([id]: [number, any]) => id === appointment.serviceId)?.[1];
          
          if (client && service) {
            result.push({
              ...appointment,
              client,
              service
            });
          }
        }
        
        logger.debug(`✅ Retrieved ${result.length} appointments from JSON for user ${userId}`);
        return result;
      } catch (jsonError) {
        console.error("Error getting appointments from JSON:", jsonError);
        return [];
      }
    }
  }

  async getAppointmentsByDateForUser(date: string, userId: number, userType: string): Promise<AppointmentWithDetails[]> {
    try {
      // ⚡ OPTIMIZED: Use JOIN instead of multiple queries (includes staff and rooms)
      const { staff, treatmentRooms } = await import('../shared/schema.js');
      
      const result = await db
        .select({
          appointment: appointments,
          client: clients,
          service: services,
          staff: staff,
          room: treatmentRooms
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(staff, eq(appointments.staffId, staff.id))
        .leftJoin(treatmentRooms, eq(appointments.roomId, treatmentRooms.id))
        .where(and(
          eq(appointments.date, date),
          eq(appointments.userId, userId)
        ))
        .orderBy(appointments.startTime);

      // Transform the result — keep appointments even if service was deleted (show placeholder)
      const formattedResult = result
        .filter(row => row.client)
        .map(row => ({
          ...row.appointment,
          client: row.client!,
          service: row.service ?? { id: row.appointment.serviceId, name: '—', duration: 60, price: '0', userId, color: '#888888', description: null },
          staff: row.staff || undefined,
          room: row.room || undefined
        }));

      logger.debug(`✅ NEW multi-tenant system: ${formattedResult.length} appointments for date ${date} - user ${userId} (with staff/room) - FULL SEPARATION`);
      return formattedResult;
    } catch (error) {
      console.error("Error getting appointments by date for user:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.appointments) {
          return [];
        }
        
        const result: AppointmentWithDetails[] = [];
        
        // Filter appointments by date AND userId
        const userDateAppointments = storageData.appointments
          .map(([_, apt]: [number, any]) => apt)
          .filter((apt: any) => apt.date === date && apt.userId === userId);
        
        // Manual join with clients and services
        for (const appointment of userDateAppointments) {
          const client = storageData.clients?.find(([id]: [number, any]) => id === appointment.clientId)?.[1];
          const service = storageData.services?.find(([id]: [number, any]) => id === appointment.serviceId)?.[1];
          
          if (client && service) {
            result.push({
              ...appointment,
              client,
              service
            });
          }
        }
        
        logger.debug(`✅ Retrieved ${result.length} appointments from JSON for date ${date}, user ${userId}`);
        return result;
      } catch (jsonError) {
        console.error("Error getting appointments by date from JSON:", jsonError);
        return [];
      }
    }
  }

  // OBSOLETA: Rimossa per architettura multi-tenant
  // System now filters automatically per user

  async getAppointmentsByClient(clientId: number): Promise<AppointmentWithDetails[]> {
    try {
      const result: AppointmentWithDetails[] = [];
      const appointmentsList = await db
        .select()
        .from(appointments)
        .where(eq(appointments.clientId, clientId))
        .orderBy(appointments.date, appointments.startTime);

      for (const appointment of appointmentsList) {
        const [client] = await db.select().from(clients).where(eq(clients.id, appointment.clientId));
        const [service] = await db.select().from(services).where(eq(services.id, appointment.serviceId));
        
        result.push({
          ...appointment,
          client,
          service
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting appointments by client:", error);
      return [];
    }
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    try {
      const [newAppointment] = await db.insert(appointments).values(appointment).returning();
      return newAppointment;
    } catch (error) {
      console.error("Error creating appointment:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.appointments) {
          storageData.appointments = [];
        }
        
        const newId = Date.now();
        const newAppointment: Appointment = {
          id: newId,
          ...appointment,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        storageData.appointments.push([newAppointment.id, newAppointment]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Appointment ${newAppointment.id} created in JSON storage`);
        return newAppointment;
      } catch (jsonError) {
        console.error("Error creating appointment in JSON:", jsonError);
        throw error;
      }
    }
  }

  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    try {
      const [updatedAppointment] = await db
        .update(appointments)
        .set(appointment)
        .where(eq(appointments.id, id))
        .returning();
      return updatedAppointment;
    } catch (error) {
      console.error("Error updating appointment:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.appointments) {
          return undefined;
        }
        
        const appointmentIndex = storageData.appointments.findIndex(([aId]: [number, any]) => aId === id);
        if (appointmentIndex === -1) {
          return undefined;
        }
        
        const existingAppointment = storageData.appointments[appointmentIndex][1];
        const updatedAppointment = {
          ...existingAppointment,
          ...appointment,
          updatedAt: new Date()
        };
        
        storageData.appointments[appointmentIndex] = [id, updatedAppointment];
        saveStorageData(storageData);
        
        logger.debug(`✅ Appointment ${id} updated in JSON storage`);
        return updatedAppointment;
      } catch (jsonError) {
        console.error("Error updating appointment in JSON:", jsonError);
        return undefined;
      }
    }
  }

  async deleteAppointment(id: number): Promise<boolean> {
    try {
      await db.delete(appointments).where(eq(appointments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting appointment:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.appointments) {
          return false;
        }
        
        const initialLength = storageData.appointments.length;
        storageData.appointments = storageData.appointments.filter(([aId]: [number, any]) => aId !== id);
        
        if (storageData.appointments.length === initialLength) {
          return false; // Appointment not found
        }
        
        saveStorageData(storageData);
        logger.debug(`✅ Appointment ${id} deleted from JSON storage`);
        return true;
      } catch (jsonError) {
        console.error("Error deleting appointment in JSON:", jsonError);
        return false;
      }
    }
  }

  // CONSENT OPERATIONS
  async getConsent(id: number): Promise<Consent | undefined> {
    try {
      const [consent] = await db.select().from(consents).where(eq(consents.id, id));
      return consent;
    } catch (error) {
      console.error("Error getting consent:", error);
      return undefined;
    }
  }

  async getConsentByClient(clientId: number): Promise<Consent | undefined> {
    try {
      const [consent] = await db
        .select()
        .from(consents)
        .where(eq(consents.clientId, clientId))
        .orderBy(desc(consents.signedAt))
        .limit(1);
      return consent;
    } catch (error) {
      console.error("Error getting consent by client:", error);
      return undefined;
    }
  }

  async createConsent(consent: InsertConsent): Promise<Consent> {
    try {
      const consentData: Record<string, any> = { ...consent };
      const [newConsent] = await db.insert(consents).values(consentData).returning();
      
      // Update hasConsent to true for client
      await db
        .update(clients)
        .set({ hasConsent: true })
        .where(eq(clients.id, consent.clientId));
        
      return newConsent;
    } catch (error) {
      console.error("Error creating consent:", error);
      throw error;
    }
  }

  // SPECIAL OPERATIONS
  async getClientWithAppointments(clientId: number): Promise<ClientWithAppointments | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
      if (!client) return undefined;

      const clientAppointments = await this.getAppointmentsByClient(clientId);
      
      return {
        ...client,
        appointments: clientAppointments
      };
    } catch (error) {
      console.error("Error getting client with appointments:", error);
      return undefined;
    }
  }

  async searchClients(query: string): Promise<Client[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const searchResults = await db
        .select()
        .from(clients)
        .where(
          or(
            like(sql`LOWER(${clients.firstName})`, searchTerm),
            like(sql`LOWER(${clients.lastName})`, searchTerm),
            like(sql`LOWER(${clients.phone})`, searchTerm),
            like(sql`LOWER(COALESCE(${clients.email}, ''))`, searchTerm)
          )
        )
        .orderBy(clients.lastName);
        
      return searchResults;
    } catch (error) {
      console.error("Error searching clients:", error);
      return [];
    }
  }

  // INVOICE OPERATIONS
  async getInvoice(id: number): Promise<InvoiceWithDetails | undefined> {
    try {
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
      if (!invoice) return undefined;

      const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
      const items = await this.getInvoiceItemsByInvoice(id);
      const paymentsList = await db.select().from(payments).where(eq(payments.invoiceId, id));
      
      return {
        ...invoice,
        client,
        items,
        payments: paymentsList
      };
    } catch (error) {
      console.error("Error getting invoice:", error);
      return undefined;
    }
  }

  async getInvoices(): Promise<InvoiceWithDetails[]> {
    try {
      const result: InvoiceWithDetails[] = [];
      const invoicesList = await db.select().from(invoices).orderBy(desc(invoices.date));

      for (const invoice of invoicesList) {
        const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
        const items = await this.getInvoiceItemsByInvoice(invoice.id);
        const paymentsList = await db.select().from(payments).where(eq(payments.invoiceId, invoice.id));
        
        result.push({
          ...invoice,
          client,
          items,
          payments: paymentsList
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting invoices:", error);
      return [];
    }
  }

  async getInvoicesByClient(clientId: number): Promise<InvoiceWithDetails[]> {
    try {
      const result: InvoiceWithDetails[] = [];
      const invoicesList = await db
        .select()
        .from(invoices)
        .where(eq(invoices.clientId, clientId))
        .orderBy(desc(invoices.date));

      for (const invoice of invoicesList) {
        const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
        const items = await this.getInvoiceItemsByInvoice(invoice.id);
        const paymentsList = await db.select().from(payments).where(eq(payments.invoiceId, invoice.id));
        
        result.push({
          ...invoice,
          client,
          items,
          payments: paymentsList
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting invoices by client:", error);
      return [];
    }
  }

  async getInvoicesByDateRange(startDate: string, endDate: string): Promise<InvoiceWithDetails[]> {
    try {
      const result: InvoiceWithDetails[] = [];
      const invoicesList = await db
        .select()
        .from(invoices)
        .where(
          and(
            gte(invoices.date, startDate),
            lte(invoices.date, endDate)
          )
        )
        .orderBy(desc(invoices.date));

      for (const invoice of invoicesList) {
        const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
        const items = await this.getInvoiceItemsByInvoice(invoice.id);
        const paymentsList = await db.select().from(payments).where(eq(payments.invoiceId, invoice.id));
        
        result.push({
          ...invoice,
          client,
          items,
          payments: paymentsList
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting invoices by date range:", error);
      return [];
    }
  }

  async getInvoicesByStatus(status: string): Promise<InvoiceWithDetails[]> {
    try {
      const result: InvoiceWithDetails[] = [];
      const invoicesList = await db
        .select()
        .from(invoices)
        .where(eq(invoices.status, status))
        .orderBy(desc(invoices.date));

      for (const invoice of invoicesList) {
        const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
        const items = await this.getInvoiceItemsByInvoice(invoice.id);
        const paymentsList = await db.select().from(payments).where(eq(payments.invoiceId, invoice.id));
        
        result.push({
          ...invoice,
          client,
          items,
          payments: paymentsList
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting invoices by status:", error);
      return [];
    }
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    try {
      const [newInvoice] = await db.insert(invoices).values(invoice).returning();
      return newInvoice;
    } catch (error) {
      console.error("Error creating invoice:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.invoices) {
          storageData.invoices = [];
        }
        
        const maxId = storageData.invoices.reduce((max: number, [id]: [number, any]) => 
          Math.max(max, id), 0);
        
        const newInvoice: Invoice = {
          id: maxId + 1,
          ...invoice,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        storageData.invoices.push([newInvoice.id, newInvoice]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Invoice ${newInvoice.id} created in JSON storage`);
        return newInvoice;
      } catch (jsonError) {
        console.error("Error creating invoice in JSON:", jsonError);
        throw error;
      }
    }
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    try {
      const [updatedInvoice] = await db
        .update(invoices)
        .set(invoice)
        .where(eq(invoices.id, id))
        .returning();
      return updatedInvoice;
    } catch (error) {
      console.error("Error updating invoice:", error);
      return undefined;
    }
  }

  async deleteInvoice(id: number): Promise<boolean> {
    try {
      // First delete all related items and payments
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await db.delete(payments).where(eq(payments.invoiceId, id));
      
      // Then delete the invoice
      await db.delete(invoices).where(eq(invoices.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting invoice:", error);
      return false;
    }
  }

  // INVOICE ITEM OPERATIONS
  async getInvoiceItem(id: number): Promise<InvoiceItemWithDetails | undefined> {
    try {
      const [item] = await db.select().from(invoiceItems).where(eq(invoiceItems.id, id));
      if (!item) return undefined;

      const [service] = item.serviceId ? 
        await db.select().from(services).where(eq(services.id, item.serviceId)) : 
        [undefined];
        
      const [appointment] = item.appointmentId ? 
        await db.select().from(appointments).where(eq(appointments.id, item.appointmentId)) : 
        [undefined];
      
      return {
        ...item,
        service,
        appointment
      };
    } catch (error) {
      console.error("Error getting invoice item:", error);
      return undefined;
    }
  }

  async getInvoiceItemsByInvoice(invoiceId: number): Promise<InvoiceItemWithDetails[]> {
    try {
      const result: InvoiceItemWithDetails[] = [];
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId));

      for (const item of items) {
        const [service] = item.serviceId ? 
          await db.select().from(services).where(eq(services.id, item.serviceId)) : 
          [undefined];
          
        const [appointment] = item.appointmentId ? 
          await db.select().from(appointments).where(eq(appointments.id, item.appointmentId)) : 
          [undefined];
        
        result.push({
          ...item,
          service,
          appointment
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting invoice items by invoice:", error);
      return [];
    }
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    try {
      const [newItem] = await db.insert(invoiceItems).values(item).returning();
      return newItem;
    } catch (error) {
      console.error("Error creating invoice item:", error);
      throw error;
    }
  }

  async updateInvoiceItem(id: number, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    try {
      const [updatedItem] = await db
        .update(invoiceItems)
        .set(item)
        .where(eq(invoiceItems.id, id))
        .returning();
      return updatedItem;
    } catch (error) {
      console.error("Error updating invoice item:", error);
      return undefined;
    }
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    try {
      await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting invoice item:", error);
      return false;
    }
  }

  // PAYMENT OPERATIONS
  async getPayment(id: number): Promise<Payment | undefined> {
    try {
      const [payment] = await db.select().from(payments).where(eq(payments.id, id));
      return payment;
    } catch (error) {
      console.error("Error getting payment:", error);
      return undefined;
    }
  }

  async getPaymentsByInvoice(invoiceId: number): Promise<Payment[]> {
    try {
      return await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId))
        .orderBy(desc(payments.paymentDate));
    } catch (error) {
      console.error("Error getting payments by invoice:", error);
      return [];
    }
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    try {
      const [newPayment] = await db.insert(payments).values(payment).returning();
      
      // Update the invoice status if necessary
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, payment.invoiceId));
      const existingPayments = await this.getPaymentsByInvoice(payment.invoiceId);
      
      // Calculate total paid including the new payment
      const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + payment.amount;
      
      // If total paid is equal to or greater than total amount, update status to "paid"
      if (totalPaid >= invoice.totalAmount && invoice.status !== "paid") {
        await db
          .update(invoices)
          .set({ status: "paid" })
          .where(eq(invoices.id, payment.invoiceId));
      }
      
      return newPayment;
    } catch (error) {
      console.error("Error creating payment:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.payments) {
          storageData.payments = [];
        }
        
        const maxId = storageData.payments.reduce((max: number, [id]: [number, any]) => 
          Math.max(max, id), 0);
        
        const newPayment: Payment = {
          id: maxId + 1,
          ...payment,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        storageData.payments.push([newPayment.id, newPayment]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Payment ${newPayment.id} created in JSON storage`);
        return newPayment;
      } catch (jsonError) {
        console.error("Error creating payment in JSON:", jsonError);
        throw error;
      }
    }
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    try {
      const [updatedPayment] = await db
        .update(payments)
        .set(payment)
        .where(eq(payments.id, id))
        .returning();
      return updatedPayment;
    } catch (error) {
      console.error("Error updating payment:", error);
      return undefined;
    }
  }

  async deletePayment(id: number): Promise<boolean> {
    try {
      // First get the payment to know the associated invoice
      const [payment] = await db.select().from(payments).where(eq(payments.id, id));
      if (!payment) return false;
      
      // Delete the payment
      await db.delete(payments).where(eq(payments.id, id));
      
      // Update the invoice status if necessary
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, payment.invoiceId));
      const remainingPayments = await this.getPaymentsByInvoice(payment.invoiceId);
      
      // Calculate total paid after payment removal
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // If total paid is less than total amount and status was "paid", update status to "unpaid"
      if (totalPaid < invoice.totalAmount && invoice.status === "paid") {
        await db
          .update(invoices)
          .set({ status: "unpaid" })
          .where(eq(invoices.id, payment.invoiceId));
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting payment:", error);
      return false;
    }
  }

  async generateInvoiceNumber(): Promise<string> {
    try {
      // Get the current year
      const currentYear = new Date().getFullYear();
      
      // Count how many invoices there are for the current year
      const yearPrefix = `${currentYear}-`;
      const invoicesForYear = await db
        .select()
        .from(invoices)
        .where(like(invoices.invoiceNumber, `${yearPrefix}%`));
      
      // Generate the new invoice number
      const counter = invoicesForYear.length + 1;
      return `${yearPrefix}${counter.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error("Error generating invoice number:", error);
      
      // Fallback with timestamp
      const now = new Date();
      return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getTime().toString().substring(7)}`;
    }
  }

  // USER OPERATIONS
  async getUser(id: number): Promise<User | undefined> {
    // Skip database if not available - direct to JSON (no timeout delay)
    if (!isDatabaseAvailable) {
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        const userEntry = storageData.users?.find(([userId, u]: [number, any]) => userId === id);
        
        if (userEntry) {
          return userEntry[1];
        }
      } catch (jsonError) {
        console.error("Error loading user from JSON:", jsonError);
      }
      return undefined;
    }
    
    try {
      // getUser search - debug log removed for performance
      const [user] = await db.select().from(users).where(eq(users.id, id));
      
      if (!user) {
        // getUser not found - try JSON storage
        try {
          const { loadStorageData } = await import('./utils/jsonStorage.js');
          const storageData = loadStorageData();
          const userEntry = storageData.users?.find(([userId, u]: [number, any]) => userId === id);
          
          if (userEntry) {
            logger.debug(`✅ User ${id} found in JSON storage`);
            return userEntry[1];
          }
        } catch (jsonError) {
          console.error("Error loading user from JSON:", jsonError);
        }
        return undefined;
      }
      
      // getUser found - debug log removed for performance
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      
      // Fallback to JSON storage on database error
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        const userEntry = storageData.users?.find(([userId, u]: [number, any]) => userId === id);
        
        if (userEntry) {
          logger.debug(`✅ User ${id} found in JSON storage (after DB error)`);
          return userEntry[1];
        }
      } catch (jsonError) {
        console.error("Error loading user from JSON:", jsonError);
      }
      
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Skip database if not available - direct to JSON (no timeout delay)
    if (!isDatabaseAvailable) {
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        const userEntry = storageData.users?.find(([id, u]: [number, any]) => 
          u.username === username || u.email === username
        );
        
        if (userEntry) {
          return userEntry[1];
        }
      } catch (jsonError) {
        console.error("Error loading user from JSON:", jsonError);
      }
      return undefined;
    }
    
    try {
      // Search by username OR email (supports login with both)
      const [user] = await db.select().from(users).where(
        or(
          eq(users.username, username),
          eq(users.email, username)
        )
      );
      
      // If the user is not found in the database, try with JSON
      if (!user) {
        console.log(`User not found in DB, trying JSON storage for: ${username}`);
        try {
          const { loadStorageData } = await import('./utils/jsonStorage.js');
          const storageData = loadStorageData();
          const userEntry = storageData.users?.find(([id, u]: [number, any]) => 
            u.username === username || u.email === username
          );
          
          if (userEntry) {
            logger.debug(`✅ User found in JSON storage: ${username}`);
            return userEntry[1];
          }
        } catch (jsonError) {
          console.error("Error loading user from JSON:", jsonError);
        }
      }
      
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      
      // Fallback to JSON storage when the database is not available
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        const userEntry = storageData.users?.find(([id, u]: [number, any]) => 
          u.username === username || u.email === username
        );
        
        if (userEntry) {
          logger.debug(`✅ User found in JSON storage (after DB error): ${username}`);
          return userEntry[1];
        }
      } catch (jsonError) {
        console.error("Error loading user from JSON:", jsonError);
      }
      
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Skip database if not available - direct to JSON (no timeout delay)
    if (!isDatabaseAvailable) {
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        const userEntry = storageData.users?.find(([id, u]: [number, any]) => 
          u.email === email
        );
        
        if (userEntry) {
          return userEntry[1];
        }
      } catch (jsonError) {
        console.error("Error loading user from JSON:", jsonError);
      }
      return undefined;
    }
    
    try {
      // Search by email in the users table (professionals/admin)
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (user) return user;
      
      // If not found in users, search in the staff table (collaborators)
      const { staff: staffTable } = await import('../shared/schema');
      const [staffMember] = await db.select().from(staffTable).where(eq(staffTable.email, email));
      if (staffMember) return staffMember as any;
      
      // If not found in the database, try with JSON
      console.log(`User not found in DB by email, trying JSON storage for: ${email}`);
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        const userEntry = storageData.users?.find(([id, u]: [number, any]) => 
          u.email === email
        );
        
        if (userEntry) {
          logger.debug(`✅ User found in JSON storage by email: ${email}`);
          return userEntry[1];
        }
      } catch (jsonError) {
        console.error("Error loading user from JSON:", jsonError);
      }
      
      return undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      
      // Fallback to JSON storage when the database is not available
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        const userEntry = storageData.users?.find(([id, u]: [number, any]) => 
          u.email === email
        );
        
        if (userEntry) {
          logger.debug(`✅ User found in JSON storage by email (after DB error): ${email}`);
          return userEntry[1];
        }
      } catch (jsonError) {
        console.error("Error loading user from JSON:", jsonError);
      }
      
      return undefined;
    }
  }

  async getUserByAssignmentCode(assignmentCode: string): Promise<User | undefined> {
    try {
      logger.debug(`🔍 Looking for user with assignment code: ${assignmentCode}`);
      const [user] = await db.select().from(users).where(eq(users.assignmentCode, assignmentCode));
      
      if (user) {
        logger.debug(`✅ Found user ${user.username} for code ${assignmentCode}`);
      } else {
        console.log(`❌ No user found for code ${assignmentCode}`);
      }
      
      return user;
    } catch (error) {
      console.error("Error getting user by assignment code:", error);
      return undefined;
    }
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    try {
      logger.debug(`🔍 Looking for user with referral code: ${referralCode}`);
      const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
      
      if (user) {
        logger.debug(`✅ Found user ${user.username} (ID: ${user.id}) with referral code ${referralCode}`);
      } else {
        console.log(`❌ No user found for referral code ${referralCode}`);
      }
      
      return user;
    } catch (error) {
      console.error("Error getting user by referral code:", error);
      return undefined;
    }
  }

  async getUsersByReferrer(referrerId: number): Promise<User[]> {
    try {
      logger.debug(`🔍 Looking for users sponsored by referrer ID: ${referrerId}`);
      const referredUsers = await db.select().from(users).where(eq(users.referredBy, referrerId));
      
      logger.debug(`✅ Found ${referredUsers.length} users sponsored by referrer ${referrerId}`);
      
      return referredUsers;
    } catch (error) {
      console.error("Error getting users by referrer:", error);
      return [];
    }
  }
  
  async getAllStaffUsers(): Promise<User[]> {
    try {
      console.log("Retrieving staff users...");
      
      // Select all staff users (including those who may have a clientId)
      const staffUsers = await db.select().from(users)
        .where(
          or(
            eq(users.role, "staff"),
            eq(users.role, "admin"),
            eq(users.role, "ev_staff"),
            eq(users.role, "ev_admin")
          )
        )
        .orderBy(asc(users.id));
      
      console.log(`Found ${staffUsers.length} staff users in database`);
      staffUsers.forEach(user => {
        console.log(`- Staff user: ${user.username}, role: ${user.role}, id: ${user.id}`);
      });
      
      return staffUsers;
    } catch (error) {
      console.error("Error getting all staff users:", error);
      return [];
    }
  }

  async getOwnersByIds(ownerIds: number[]): Promise<Array<{ id: number; assignmentCode: string | null; username: string }>> {
    try {
      if (ownerIds.length === 0) {
        return [];
      }

      logger.debug(`🔍 Retrieving metadata for ${ownerIds.length} owner professionals: ${ownerIds.join(', ')}`);
      
      const owners = await db
        .select({
          id: users.id,
          assignmentCode: users.assignmentCode,
          username: users.username
        })
        .from(users)
        .where(inArray(users.id, ownerIds));
      
      logger.debug(`✅ Found ${owners.length} professional owners with metadata`);
      owners.forEach(owner => {
        console.log(`  - Owner ID ${owner.id}: ${owner.assignmentCode || 'NO-CODE'} - ${owner.username}`);
      });
      
      return owners;
    } catch (error) {
      console.error("Error getting owners by IDs:", error);
      return [];
    }
  }

  // Functions for the referral system with authentic date
  async getReferralCodeForUser(userId: number): Promise<string | null> {
    try {
      // Retrieve the saved referral code for this user
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return null;
      
      // Generate code based on real user data
      if (userId === 14) return "BUS14"; // Silvia Busnari
      if (userId === 16) return "FAV16"; // Elisa Faverio
      if (userId === 8) return "ZAM08";  // Andrea Zambelli
      
      return `REF${userId}`; // Codice standard per altri staff
    } catch (error) {
      console.error("Error getting referral code:", error);
      return null;
    }
  }

  async getReferralsByStaffId(staffId: number): Promise<any[]> {
    try {
      // For now returns empty array - to be implemented when needed
      // Here will go the logic to retrieve real sponsorships
      return [];
    } catch (error) {
      console.error("Error getting referrals:", error);
      return [];
    }
  }

  async getBankingInfoForStaff(staffId: number): Promise<any> {
    try {
      // For now returns basic info - to be implemented when needed
      // Here will go the logic to retrieve real banking data
      return {
        hasIban: false,
        bankName: null,
        accountHolder: null
      };
    } catch (error) {
      console.error("Error getting banking info:", error);
      return {
        hasIban: false,
        bankName: null,
        accountHolder: null
      };
    }
  }

  async createReferralCommission(commission: any): Promise<any> {
    try {
      const [newCommission] = await db.insert(referralCommissions).values(commission).returning();
      logger.debug(`✅ Referral commission created: ${commission.monthly_amount/100}€/month for sponsor ID ${commission.referrer_id}`);
      return newCommission;
    } catch (error) {
      console.error("Error creating referral commission:", error);
      throw error;
    }
  }

  async getReferralCommissionsByReferrer(referrerId: number): Promise<any[]> {
    try {
      const commissions = await db.select()
        .from(referralCommissions)
        .where(eq(referralCommissions.referrerId, referrerId));
      return commissions;
    } catch (error) {
      console.error("Error getting referral commissions by referrer:", error);
      return [];
    }
  }

  async getReferralCommissionsByReferred(referredId: number): Promise<any> {
    try {
      const [commission] = await db.select()
        .from(referralCommissions)
        .where(eq(referralCommissions.referredId, referredId));
      return commission;
    } catch (error) {
      console.error("Error getting referral commission by referred:", error);
      return null;
    }
  }

  async getReferralCommissions(): Promise<any[]> {
    try {
      const commissions = await db.select().from(referralCommissions);
      return commissions;
    } catch (error) {
      console.error("Error getting all referral commissions:", error);
      return [];
    }
  }

  async updateReferralCommission(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db
        .update(referralCommissions)
        .set(data)
        .where(eq(referralCommissions.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating referral commission:", error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(user)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error updating user password:", error);
      return false;
    }
  }

  async updateStaffBanking(staffId: number, banking: { iban?: string; bic?: string; bankName?: string; accountHolder?: string }): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          iban: banking.iban,
          bic: banking.bic,
          bankName: banking.bankName,
          accountHolder: banking.accountHolder
        })
        .where(eq(users.id, staffId));
      return true;
    } catch (error) {
      console.error("Error updating staff banking info:", error);
      return false;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // CLIENT ACCOUNT OPERATIONS
  async getClientAccount(id: number): Promise<ClientAccount | undefined> {
    try {
      const [account] = await db.select().from(clientAccounts).where(eq(clientAccounts.id, id));
      return account;
    } catch (error) {
      console.error("Error getting client account:", error);
      return undefined;
    }
  }

  async getClientAccountByClientId(clientId: number): Promise<ClientAccount | undefined> {
    try {
      const [account] = await db.select().from(clientAccounts).where(eq(clientAccounts.clientId, clientId));
      return account;
    } catch (error) {
      console.error("Error getting client account by client id:", error);
      return undefined;
    }
  }

  async getClientAccountByUsername(username: string): Promise<ClientAccount | undefined> {
    try {
      const result = await db
        .select({
          id: clientAccounts.id,
          clientId: clientAccounts.clientId,
          username: clientAccounts.username,
          password: clientAccounts.password,
          isActive: clientAccounts.isActive,
          lastLogin: clientAccounts.lastLogin,
          activationToken: clientAccounts.activationToken,
          activationExpires: clientAccounts.activationExpires,
          resetToken: clientAccounts.resetToken,
          resetExpires: clientAccounts.resetExpires,
          createdAt: clientAccounts.createdAt,
        })
        .from(clientAccounts)
        .leftJoin(clients, eq(clientAccounts.clientId, clients.id))
        .leftJoin(codeMigrationCrosswalk, eq(clients.id, codeMigrationCrosswalk.clientId))
        .where(
          or(
            eq(clientAccounts.username, username),
            eq(clients.uniqueCode, username),
            eq(clients.newUniqueCode, username),
            eq(codeMigrationCrosswalk.oldUniqueCode, username),
            eq(codeMigrationCrosswalk.newUniqueCode, username)
          )
        )
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting client account by username:", error);
      return undefined;
    }
  }

  async createClientAccount(account: InsertClientAccount): Promise<ClientAccount> {
    try {
      const [newAccount] = await db.insert(clientAccounts).values(account).returning();
      return newAccount;
    } catch (error) {
      console.error("Error creating client account:", error);
      throw error;
    }
  }

  async updateClientAccount(id: number, account: Partial<InsertClientAccount>): Promise<ClientAccount | undefined> {
    try {
      const [updatedAccount] = await db
        .update(clientAccounts)
        .set(account)
        .where(eq(clientAccounts.id, id))
        .returning();
      return updatedAccount;
    } catch (error) {
      console.error("Error updating client account:", error);
      return undefined;
    }
  }

  async deleteClientAccount(id: number): Promise<boolean> {
    try {
      await db.delete(clientAccounts).where(eq(clientAccounts.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting client account:", error);
      return false;
    }
  }

  // NOTIFICATION OPERATIONS
  async getNotification(id: number): Promise<Notification | undefined> {
    try {
      const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
      return notification;
    } catch (error) {
      console.error("Error getting notification:", error);
      return undefined;
    }
  }

  async getNotificationsByClient(clientId: number): Promise<Notification[]> {
    try {
      const notificationsList = await db
        .select()
        .from(notifications)
        .where(eq(notifications.clientId, clientId))
        .orderBy(desc(notifications.sentAt));
      return notificationsList;
    } catch (error) {
      console.error("Error getting notifications by client:", error);
      return [];
    }
  }

  async getUnreadNotificationsByClient(clientId: number): Promise<Notification[]> {
    try {
      const notificationsList = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.clientId, clientId),
            eq(notifications.isRead, false)
          )
        )
        .orderBy(desc(notifications.sentAt));
      return notificationsList;
    } catch (error) {
      console.error("Error getting unread notifications by client:", error);
      return [];
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db.insert(notifications).values(notification).returning();
      return newNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.notifications) {
          storageData.notifications = [];
        }
        
        const maxId = storageData.notifications.reduce((max: number, [id]: [number, any]) => 
          Math.max(max, id), 0);
        
        const newNotification = {
          id: maxId + 1,
          ...notification,
          sentAt: new Date()
        } as Notification;
        
        storageData.notifications.push([newNotification.id, newNotification]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Notification ${newNotification.id} created in JSON storage`);
        return newNotification;
      } catch (jsonError) {
        console.error("Error creating notification in JSON:", jsonError);
        throw error;
      }
    }
  }
  
  // Alias for createNotification - for compatibility with notificationRoutes.ts
  async saveNotification(notification: InsertNotification): Promise<Notification> {
    return this.createNotification(notification);
  }
  
  async getNotificationsByType(type: string, limit: number = 100): Promise<Notification[]> {
    try {
      const notificationsList = await db
        .select()
        .from(notifications)
        .where(eq(notifications.type, type))
        .orderBy(desc(notifications.sentAt))
        .limit(limit);
      return notificationsList;
    } catch (error) {
      console.error(`Error getting notifications by type ${type}:`, error);
      return [];
    }
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      await db.delete(notifications).where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }
  
  // Methods for managing activation tokens
  async createActivationToken(token: InsertActivationToken): Promise<ActivationToken> {
    try {
      const [newToken] = await db.insert(activationTokens).values(token).returning();
      return newToken;
    } catch (error) {
      console.error("Error creating activation token:", error);
      throw error;
    }
  }
  
  async getActivationToken(token: string): Promise<ActivationToken | undefined> {
    try {
      const [activationToken] = await db
        .select()
        .from(activationTokens)
        .where(eq(activationTokens.token, token));
      
      return activationToken;
    } catch (error) {
      console.error("Error fetching activation token:", error);
      return undefined;
    }
  }
  
  async getActivationTokensByClientId(clientId: number): Promise<ActivationToken[]> {
    try {
      const tokens = await db
        .select()
        .from(activationTokens)
        .where(eq(activationTokens.clientId, clientId));
      
      return tokens;
    } catch (error) {
      console.error("Error fetching activation tokens by client ID:", error);
      return [];
    }
  }
  
  async updateActivationToken(token: string, data: Partial<InsertActivationToken>): Promise<ActivationToken | undefined> {
    try {
      const [updatedToken] = await db
        .update(activationTokens)
        .set(data)
        .where(eq(activationTokens.token, token))
        .returning();
      
      return updatedToken;
    } catch (error) {
      console.error("Error updating activation token:", error);
      return undefined;
    }
  }
  
  async updateActivationTokenExpiry(id: number, newExpiresAt: Date): Promise<ActivationToken | undefined> {
    try {
      console.log(`Updating token expiration with ID ${id} to ${newExpiresAt}`);
      
      const [updatedToken] = await db
        .update(activationTokens)
        .set({ expiresAt: newExpiresAt })
        .where(eq(activationTokens.id, id))
        .returning();
      
      console.log(`Token updated successfully, new expiry: ${updatedToken.expiresAt}`);
      return updatedToken;
    } catch (error) {
      console.error("Error updating token expiration:", error);
      return undefined;
    }
  }
  
  // Client Notes operations
  async getClientNote(id: number): Promise<ClientNote | undefined> {
    try {
      const [note] = await db
        .select()
        .from(clientNotes)
        .where(eq(clientNotes.id, id));
      
      return note;
    } catch (error) {
      console.error("Error retrieving note:", error);
      return undefined;
    }
  }

  async getClientNotes(clientId: number): Promise<ClientNote[]> {
    try {
      const notes = await db
        .select()
        .from(clientNotes)
        .where(eq(clientNotes.clientId, clientId))
        .orderBy(desc(clientNotes.createdAt));
      
      return notes;
    } catch (error) {
      console.error("Error retrieving client notes:", error);
      return [];
    }
  }
  
  async createClientNote(note: InsertClientNote): Promise<ClientNote> {
    try {
      const noteData: Record<string, any> = { ...note, createdAt: new Date() };
      const [createdNote] = await db
        .insert(clientNotes)
        .values(noteData)
        .returning();
      
      return createdNote;
    } catch (error) {
      console.error("Error creating client note:", error);
      throw error;
    }
  }
  
  async updateClientNote(id: number, note: Partial<InsertClientNote>): Promise<ClientNote | undefined> {
    try {
      const updateData: Record<string, any> = { ...note, updatedAt: new Date() };
      const [updatedNote] = await db
        .update(clientNotes)
        .set(updateData)
        .where(eq(clientNotes.id, id))
        .returning();
      
      return updatedNote;
    } catch (error) {
      console.error("Error updating client note:", error);
      return undefined;
    }
  }
  
  async deleteClientNote(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(clientNotes)
        .where(eq(clientNotes.id, id));
      
      return result.count > 0;
    } catch (error) {
      console.error("Error deleting client note:", error);
      return false;
    }
  }

  // Google Calendar operations
  async getGoogleCalendarSettings(): Promise<GoogleCalendarSettings | undefined> {
    try {
      const [settings] = await db.select().from(googleCalendarSettings);
      return settings;
    } catch (error) {
      console.error('Error retrieving Google Calendar settings:', error);
      return undefined;
    }
  }
  
  async saveGoogleCalendarSettings(settings: InsertGoogleCalendarSettings): Promise<GoogleCalendarSettings> {
    try {
      // First check if settings already exist
      const existing = await this.getGoogleCalendarSettings();
      
      if (existing) {
        // Update existing settings
        const [updated] = await db
          .update(googleCalendarSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(googleCalendarSettings.id, existing.id))
          .returning();
        return updated;
      } else {
        // Create new settings
        const [created] = await db
          .insert(googleCalendarSettings)
          .values({
            ...settings,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error('Error saving settings Google Calendar:', error);
      throw error;
    }
  }
  
  async updateGoogleCalendarSettings(id: number, settings: Partial<InsertGoogleCalendarSettings>): Promise<GoogleCalendarSettings | undefined> {
    try {
      const [updated] = await db
        .update(googleCalendarSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(googleCalendarSettings.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating Google Calendar settings:', error);
      return undefined;
    }
  }
  
  // Implementazione Google Calendar Events
  async getGoogleCalendarEvent(appointmentId: number): Promise<GoogleCalendarEvent | undefined> {
    try {
      const [event] = await db
        .select()
        .from(googleCalendarEvents)
        .where(eq(googleCalendarEvents.appointmentId, appointmentId));
      return event;
    } catch (error) {
      console.error('Error retrieving Google Calendar event:', error);
      return undefined;
    }
  }
  
  async createGoogleCalendarEvent(event: InsertGoogleCalendarEvent): Promise<GoogleCalendarEvent> {
    try {
      const [created] = await db
        .insert(googleCalendarEvents)
        .values({
          ...event,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }
  
  async updateGoogleCalendarEvent(appointmentId: number, event: Partial<InsertGoogleCalendarEvent>): Promise<GoogleCalendarEvent | undefined> {
    try {
      const [updated] = await db
        .update(googleCalendarEvents)
        .set({
          ...event,
          updatedAt: new Date()
        })
        .where(eq(googleCalendarEvents.appointmentId, appointmentId))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return undefined;
    }
  }
  
  async deleteGoogleCalendarEvent(appointmentId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(googleCalendarEvents)
        .where(eq(googleCalendarEvents.appointmentId, appointmentId));
      
      return result.count > 0;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return false;
    }
  }

  // Timezone settings operations
  async getTimezoneSettings(userId?: number): Promise<{ timezone: string; offset: number; name: string; } | undefined> {
    try {
      const timezoneSetting = await this.getSetting("timezone", userId);
      const offsetSetting = await this.getSetting("timezoneOffset", userId);
      const nameSetting = await this.getSetting("timezoneName", userId);
      
      if (!timezoneSetting) {
        return {
          timezone: "UTC",
          offset: 0,
          name: "Coordinated Universal Time"
        };
      }
      
      return {
        timezone: timezoneSetting.value,
        offset: offsetSetting ? parseInt(offsetSetting.value) : 0,
        name: nameSetting ? nameSetting.value : "Coordinated Universal Time"
      };
    } catch (error) {
      console.error("Error retrieving timezone settings:", error);
      return {
        timezone: "UTC",
        offset: 0,
        name: "Coordinated Universal Time"
      };
    }
  }
  
  async saveTimezoneSettings(timezone: string, offset: number, name: string): Promise<{ timezone: string; offset: number; name: string; }> {
    try {
      await this.saveSetting("timezone", timezone);
      await this.saveSetting("timezoneOffset", offset.toString());
      await this.saveSetting("timezoneName", name);
      
      return { timezone, offset, name };
    } catch (error) {
      console.error("Error saving timezone settings:", error);
      throw error;
    }
  }
  
  // Contact Info operations
  async getContactInfo(userId?: number): Promise<{ email: string; phone1: string; website: string; instagram: string; phone2: string; businessName?: string; address?: string; } | undefined> {
    try {
      const email = await this.getSetting("contactEmail", userId);
      const phone1 = await this.getSetting("contactPhone1", userId);
      const website = await this.getSetting("contactWebsite", userId);
      const instagram = await this.getSetting("contactInstagram", userId);
      const phone2 = await this.getSetting("contactPhone2", userId);
      const businessName = await this.getSetting("businessName", userId);
      const address = await this.getSetting("businessAddress", userId);
      
      if (!email && !phone1) {
        // If there is contact information, return undefined
        return undefined;
      }
      
      return {
        email: email ? email.value : "",
        phone1: phone1 ? phone1.value : "",
        website: website ? website.value : "",
        instagram: instagram ? instagram.value : "",
        phone2: phone2 ? phone2.value : "",
        businessName: businessName ? businessName.value : undefined,
        address: address ? address.value : undefined
      };
    } catch (error) {
      console.error("Error retrieving contact information:", error);
      return undefined;
    }
  }
  
  // Notification Settings operations
  async getNotificationSettings(): Promise<NotificationSettings | undefined> {
    try {
      const [settings] = await db.select().from(notificationSettings);
      return settings;
    } catch (error) {
      console.error("Error retrieving notification settings:", error);
      return undefined;
    }
  }
  
  async saveNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings> {
    try {
      // First check if settings already exist
      const existing = await this.getNotificationSettings();
      
      if (existing) {
        // Update existing settings
        const [updated] = await db
          .update(notificationSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(notificationSettings.id, existing.id))
          .returning();
        return updated;
      } else {
        // Create new settings
        const [created] = await db
          .insert(notificationSettings)
          .values({
            ...settings,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error saving notification settings:", error);
      throw error;
    }
  }
  
  async updateNotificationSettings(id: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings | undefined> {
    try {
      const [updated] = await db
        .update(notificationSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(notificationSettings.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating notification settings:", error);
      return undefined;
    }
  }
  
  // Reminder Template operations
  async getReminderTemplate(id: number): Promise<ReminderTemplate | undefined> {
    try {
      const [template] = await db
        .select()
        .from(reminderTemplates)
        .where(eq(reminderTemplates.id, id))
        .limit(1);

      return template;
    } catch (error) {
      console.error('Error retrieving reminder template:', error);
      return undefined;
    }
  }

  async getReminderTemplates(): Promise<ReminderTemplate[]> {
    try {
      const templates = await db
        .select()
        .from(reminderTemplates)
        .orderBy(desc(reminderTemplates.isDefault), asc(reminderTemplates.name));

      return templates;
    } catch (error) {
      console.error('Error retrieving reminder templates:', error);
      return [];
    }
  }

  async getDefaultReminderTemplate(type: string = 'sms'): Promise<ReminderTemplate | undefined> {
    try {
      const [template] = await db
        .select()
        .from(reminderTemplates)
        .where(and(
          eq(reminderTemplates.isDefault, true),
          eq(reminderTemplates.type, type)
        ))
        .limit(1);

      return template;
    } catch (error) {
      console.error('Error retrieving default reminder template:', error);
      return undefined;
    }
  }

  async getReminderTemplateByServiceId(serviceId: number, type: string = 'sms'): Promise<ReminderTemplate | undefined> {
    try {
      const [template] = await db
        .select()
        .from(reminderTemplates)
        .where(and(
          eq(reminderTemplates.serviceId, serviceId),
          eq(reminderTemplates.type, type)
        ))
        .limit(1);

      return template;
    } catch (error) {
      console.error('Error retrieving reminder template for service:', error);
      return undefined;
    }
  }

  // Implementation of the method required by the interface
  async getReminderTemplateByService(serviceId: number, type: string = 'sms'): Promise<ReminderTemplate | undefined> {
    // We use the existing method
    return this.getReminderTemplateByServiceId(serviceId, type);
  }

  async createReminderTemplate(template: InsertReminderTemplate): Promise<ReminderTemplate> {
    try {
      // If this template is set as default, remove the default setting from other templates of the same type
      if (template.isDefault) {
        await db
          .update(reminderTemplates)
          .set({ isDefault: false })
          .where(and(
            eq(reminderTemplates.isDefault, true),
            eq(reminderTemplates.type, template.type || 'sms')
          ));
      }

      const [createdTemplate] = await db
        .insert(reminderTemplates)
        .values({
          ...template,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return createdTemplate;
    } catch (error) {
      console.error('Error creating reminder template:', error);
      throw error;
    }
  }

  async updateReminderTemplate(id: number, template: Partial<InsertReminderTemplate>): Promise<ReminderTemplate | undefined> {
    try {
      const existingTemplate = await this.getReminderTemplate(id);

      if (!existingTemplate) {
        return undefined;
      }

      // If this template is set as default, remove the default setting from other templates of the same type
      if (template.isDefault) {
        await db
          .update(reminderTemplates)
          .set({ isDefault: false })
          .where(and(
            ne(reminderTemplates.id, id),
            eq(reminderTemplates.isDefault, true),
            eq(reminderTemplates.type, template.type || existingTemplate.type || 'sms')
          ));
      }

      const [updatedTemplate] = await db
        .update(reminderTemplates)
        .set({
          ...template,
          updatedAt: new Date()
        })
        .where(eq(reminderTemplates.id, id))
        .returning();

      return updatedTemplate;
    } catch (error) {
      console.error('Error updating reminder template:', error);
      return undefined;
    }
  }

  async deleteReminderTemplate(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(reminderTemplates)
        .where(eq(reminderTemplates.id, id));

      return true;
    } catch (error) {
      console.error('Error deleting reminder template:', error);
      return false;
    }
  }
  
  // Implementation of methods to manage application settings
  async getSetting(key: string, userId?: number): Promise<AppSettings | undefined> {
    try {
      const whereConditions = userId 
        ? and(eq(appSettings.key, key), eq(appSettings.userId, userId))
        : eq(appSettings.key, key);
        
      const [setting] = await db
        .select()
        .from(appSettings)
        .where(whereConditions);
      return setting;
    } catch (error) {
      console.error(`Error retrieving setting '${key}':`, error);
      return undefined;
    }
  }

  async getAllSettings(): Promise<AppSettings[]> {
    try {
      const settings = await db
        .select()
        .from(appSettings)
        .orderBy(asc(appSettings.key));
      return settings;
    } catch (error) {
      console.error("Error retrieving all settings:", error);
      return [];
    }
  }

  async getSettingsByCategory(category: string): Promise<AppSettings[]> {
    try {
      const settings = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.category, category))
        .orderBy(asc(appSettings.key));
      return settings;
    } catch (error) {
      console.error(`Error retrieving settings for category '${category}':`, error);
      return [];
    }
  }

  async saveSetting(
    key: string, 
    value: string, 
    description?: string, 
    category: string = 'general',
    userId: number = 1
  ): Promise<AppSettings> {
    try {
      // Check if the setting already exists for this user
      const existingSetting = await this.getSetting(key, userId);
      
      if (existingSetting) {
        // Update the existing setting
        const [updatedSetting] = await db
          .update(appSettings)
          .set({ 
            value, 
            updatedAt: new Date(),
            ...(description && { description }),
            ...(category && { category })
          })
          .where(eq(appSettings.id, existingSetting.id))
          .returning();
        
        return updatedSetting;
      } else {
        // Create a new setting for user
        const [newSetting] = await db
          .insert(appSettings)
          .values({
            key,
            userId,
            value,
            description: description || `Impostazione per ${key}`,
            category
          })
          .returning();
        
        return newSetting;
      }
    } catch (error) {
      console.error(`Error saving setting '${key}':`, error);
      throw error;
    }
  }

  async updateSetting(id: number, setting: Partial<InsertAppSettings>): Promise<AppSettings | undefined> {
    try {
      const [updatedSetting] = await db
        .update(appSettings)
        .set({ 
          ...setting,
          updatedAt: new Date()
        })
        .where(eq(appSettings.id, id))
        .returning();
      
      return updatedSetting;
    } catch (error) {
      console.error(`Error updating setting with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteSetting(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(appSettings)
        .where(eq(appSettings.id, id));
      
      return result.count > 0;
    } catch (error) {
      console.error(`Error deleting setting with ID ${id}:`, error);
      return false;
    }
  }
  
  // Company Name Settings operations - Multi-tenant isolation
  async getCompanyNameSettings(userId: number): Promise<CompanyNameSettings | undefined> {
    try {
      console.log(`🏢 Retrieving business name settings for user ${userId}`);
      
      const [settings] = await db
        .select()
        .from(companyNameSettings)
        .where(eq(companyNameSettings.userId, userId));
      
      if (!settings) {
        logger.debug(`ℹ️ No business name settings for user ${userId}`);
        return undefined;
      }
      
      logger.debug(`✅ Business name settings for user ${userId}:`, settings);
      return settings;
    } catch (error) {
      console.error(`Error retrieving settings for user ${userId}:`, error);
      return undefined;
    }
  }

  async saveCompanyNameSettings(userId: number, settings: any): Promise<CompanyNameSettings> {
    try {
      console.log(`🏢 Saving business name settings for user ${userId}:`, settings);
      
      const dataToSave = {
        userId,
        name: settings.name || "",
        fontSize: settings.fontSize || 24,
        fontFamily: settings.fontFamily || "Arial",
        fontWeight: settings.fontWeight || "normal",
        fontStyle: settings.fontStyle || "normal",
        textDecoration: settings.textDecoration || "none",
        color: settings.color || "#000000",
        enabled: settings.enabled !== undefined ? settings.enabled : true
      };
      
      const [saved] = await db
        .insert(companyNameSettings)
        .values(dataToSave)
        .returning();
      
      logger.debug(`✅ Business name settings saved for user ${userId}`);
      return saved;
    } catch (error) {
      console.error(`Error saving settings for user ${userId}:`, error);
      throw error;
    }
  }

  async updateCompanyNameSettings(userId: number, settings: any): Promise<CompanyNameSettings | undefined> {
    try {
      console.log(`🏢 Updating business name settings for user ${userId}:`, settings);
      
      const dataToUpdate = {
        name: settings.name || "",
        fontSize: settings.fontSize || 24,
        fontFamily: settings.fontFamily || "Arial",
        fontWeight: settings.fontWeight || "normal",
        fontStyle: settings.fontStyle || "normal",
        textDecoration: settings.textDecoration || "none",
        color: settings.color || "#000000",
        enabled: settings.enabled !== undefined ? settings.enabled : true,
        updatedAt: new Date()
      };
      
      const [updated] = await db
        .update(companyNameSettings)
        .set(dataToUpdate)
        .where(eq(companyNameSettings.userId, userId))
        .returning();
      
      logger.debug(`✅ Business name settings updated for user ${userId}`);
      return updated;
    } catch (error) {
      console.error(`Error updating settings for user ${userId}:`, error);
      return undefined;
    }
  }

  // Payment Transaction operations
  async getPaymentTransactionsByWiseId(transactionId: string): Promise<PaymentTransaction[]> {
    try {
      return await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.transactionId, transactionId))
        .orderBy(desc(paymentTransactions.createdAt));
    } catch (error) {
      console.error(`Error retrieving payment transactions for Wise ID ${transactionId}:`, error);
      return [];
    }
  }
  
  async getPaymentTransactionsByUser(userId: number): Promise<PaymentTransaction[]> {
    try {
      return await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.userId, userId))
        .orderBy(desc(paymentTransactions.createdAt));
    } catch (error) {
      console.error(`Error retrieving payment transactions for user ${userId}:`, error);
      return [];
    }
  }
  
  async getPaymentTransactionsBySubscription(subscriptionId: number): Promise<PaymentTransaction[]> {
    try {
      return await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.subscriptionId, subscriptionId))
        .orderBy(desc(paymentTransactions.createdAt));
    } catch (error) {
      console.error(`Error retrieving payment transactions for subscription ${subscriptionId}:`, error);
      return [];
    }
  }
  
  async getPaymentTransactionsByMethod(method: string): Promise<PaymentTransaction[]> {
    try {
      return await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.paymentMethod, method))
        .orderBy(desc(paymentTransactions.createdAt));
    } catch (error) {
      console.error(`Error retrieving payment transactions for method ${method}:`, error);
      return [];
    }
  }
  
  async getAllPaymentTransactions(): Promise<PaymentTransaction[]> {
    try {
      return await db
        .select()
        .from(paymentTransactions)
        .orderBy(desc(paymentTransactions.createdAt));
    } catch (error) {
      console.error('Error retrieving all payment transactions:', error);
      return [];
    }
  }
  
  /**
   * Update an existing subscription
   * @param id ID of the subscription to update
   * @param subscription Partial data to update
   * @returns Updated subscription or undefined if not found
   */
  async updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    try {
      console.log(`Updating subscription ID: ${id} with data:`, subscription);
      const [updated] = await db.update(subscriptions)
        .set(subscription)
        .where(eq(subscriptions.id, id))
        .returning();
      
      console.log(`Subscription updated:`, updated);
      return updated;
    } catch (error) {
      console.error(`Error updating subscription ID ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Cancel a subscription
   * @param id ID of the subscription to cancel
   * @param cancelAtPeriodEnd If true, the subscription will end at the end of the current period
   * @returns Updated subscription or undefined if not found
   */
  async cancelSubscription(id: number, cancelAtPeriodEnd: boolean): Promise<Subscription | undefined> {
    try {
      console.log(`Cancelling subscription ID: ${id}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}`);
      
      const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
      if (!subscription) {
        console.error(`Subscription ID ${id} not found for cancellation`);
        return undefined;
      }
      
      // If cancelAtPeriodEnd is true, we only set the flag and the subscription will end at the end of the period
      // otherwise, we immediately set the status to 'cancelled'
      const updateData: Record<string, any> = {
        cancelAtPeriodEnd,
        updatedAt: new Date()
      };
      
      if (!cancelAtPeriodEnd) {
        updateData.status = 'cancelled';
        updateData.cancelledAt = new Date();
      }
      
      const [updated] = await db.update(subscriptions)
        .set(updateData)
        .where(eq(subscriptions.id, id))
        .returning();
      
      console.log(`Subscription updated after cancellation:`, updated);
      return updated;
    } catch (error) {
      console.error(`Error cancelling subscription ID ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Create a new payment transaction
   * @param transaction Transaction data to create
   * @returns Created transaction
   */
  async createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    try {
      console.log(`Creating new payment transaction:`, transaction);
      const [newTransaction] = await db.insert(paymentTransactions)
        .values({
          ...transaction,
          createdAt: new Date(),
        })
        .returning();
      
      console.log(`Payment transaction created:`, newTransaction);
      return newTransaction;
    } catch (error) {
      console.error(`Error creating payment transaction:`, error);
      throw error;
    }
  }
  
  /**
   * Get all licenses present in the system
   */
  async getLicenses(): Promise<License[]> {
    try {
      console.log('Retrieving all licenses from database');
      const result = await db
        .select()
        .from(licenses)
        .orderBy(desc(licenses.createdAt));
      
      console.log(`Found ${result.length} total licenses`);
      return result;
    } catch (error) {
      console.error('Error retrieving licenses:', error);
      return [];
    }
  }
  
  /**
   * Get all licenses for a specific user
   */
  async getLicensesByUserId(userId: number): Promise<License[]> {
    try {
      console.log(`Retrieving licenses for user ID ${userId}`);
      const result = await db
        .select()
        .from(licenses)
        .where(eq(licenses.userId, userId))
        .orderBy(desc(licenses.createdAt));
      
      console.log(`Found ${result.length} licenses for user ${userId}`);
      return result;
    } catch (error) {
      console.error(`Error retrieving licenses for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get a specific license by ID
   */
  async getLicense(id: number): Promise<License | undefined> {
    try {
      console.log(`Retrieving license with ID ${id}`);
      const [result] = await db
        .select()
        .from(licenses)
        .where(eq(licenses.id, id))
        .limit(1);
      
      return result;
    } catch (error) {
      console.error(`Error retrieving license ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Create a new license
   */
  async createLicense(licenseData: InsertLicense): Promise<License> {
    try {
      console.log(`Creating new license of type: ${licenseData.type}`);
      const [license] = await db
        .insert(licenses)
        .values(licenseData)
        .returning();
      
      console.log(`License created with ID: ${license.id}`);
      return license;
    } catch (error) {
      console.error('Error creating license:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing license's date
   */
  async updateLicense(id: number, licenseData: Partial<InsertLicense>): Promise<License | undefined> {
    try {
      console.log(`Updating license with ID ${id}`);
      const [license] = await db
        .update(licenses)
        .set(licenseData)
        .where(eq(licenses.id, id))
        .returning();
      
      console.log(`License ${id} updated`);
      return license;
    } catch (error) {
      console.error(`Error updating license ${id}:`, error);
      return undefined;
    }
  }
  
  async getSubscriptions(): Promise<SubscriptionWithDetails[]> {
    try {
      // Retrieve all subscriptions with plan details
      const result = await db
        .select({
          subscriptions: subscriptions,
          plans: subscriptionPlans
        })
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .orderBy(desc(subscriptions.createdAt));
      
      // Transform the results into the required format
      const subscriptionsWithDetails = result.map((row) => ({
          ...row.subscriptions,
          plan: row.plans,
          user: null as unknown as User,
          transactions: [] as PaymentTransaction[]
        })) as unknown as SubscriptionWithDetails[];
        
      return subscriptionsWithDetails;
    } catch (error) {
      console.error('Error retrieving all subscriptions:', error);
      return [];
    }
  }
  
  async getActiveSubscriptions(): Promise<SubscriptionWithDetails[]> {
    try {
      const result = await db
        .select({
          subscriptions: subscriptions,
          plans: subscriptionPlans
        })
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.status, 'active'))
        .orderBy(desc(subscriptions.createdAt));
      
      const subscriptionsWithDetails = result.map((row) => ({
          ...row.subscriptions,
          plan: row.plans,
          user: null as unknown as User,
          transactions: [] as PaymentTransaction[]
        })) as unknown as SubscriptionWithDetails[];
        
      return subscriptionsWithDetails;
    } catch (error) {
      console.error('Error retrieving active subscriptions:', error);
      return [];
    }
  }
  
  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(asc(subscriptionPlans.sortOrder));
    } catch (error) {
      console.error('Error retrieving active subscription plans:', error);
      return [];
    }
  }
  
  /**
   * Retrieve a specific subscription plan by ID
   */
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));
      
      return plan;
    } catch (error) {
      console.error(`Error retrieving subscription plan with ID ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Retrieve all subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlans)
        .orderBy(asc(subscriptionPlans.sortOrder));
    } catch (error) {
      console.error('Error retrieving subscription plans:', error);
      return [];
    }
  }
  
  /**
   * Create a new subscription plan
   */
  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    try {
      const [newPlan] = await db
        .insert(subscriptionPlans)
        .values(plan)
        .returning();
      
      return newPlan;
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing subscription plan
   */
  async updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    try {
      const [updatedPlan] = await db
        .update(subscriptionPlans)
        .set(plan)
        .where(eq(subscriptionPlans.id, id))
        .returning();
      
      return updatedPlan;
    } catch (error) {
      console.error(`Error updating subscription plan with ID ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Delete a subscription plan
   */
  async deleteSubscriptionPlan(id: number): Promise<boolean> {
    try {
      await db
        .delete(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));
      
      return true;
    } catch (error) {
      console.error(`Error deleting subscription plan with ID ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Retrieve all payment methods configured from DATABASE (PostgreSQL)
   */
  async getPaymentMethods(): Promise<any[]> {
    try {
      console.log('📊 Retrieving payment methods from PostgreSQL');
      
      // Read da database PostgreSQL
      const methods = await db.select().from(paymentMethodsConfig);
      
      if (!methods || methods.length === 0) {
        console.log('❌ No payment method found in database, returning empty array');
        return [];
      }
      
      // Transform date from the database into the expected format
      const formattedMethods = methods.map(method => ({
        id: method.methodId,
        name: method.name,
        enabled: method.enabled,
        config: method.config
      }));
      
      logger.debug(`✅ Retrieved ${formattedMethods.length} payment methods from PostgreSQL`);
      return formattedMethods;
    } catch (error) {
      console.error('❌ Error retrieving payment methods from database:', error);
      return [];
    }
  }
  
  /**
   * Save payment method configuration in DATABASE (PostgreSQL)
   */
  async savePaymentMethods(methods: any[]): Promise<boolean> {
    try {
      logger.debug(`💾 Saving ${methods.length} payment methods to PostgreSQL`);
      
      for (const method of methods) {
        // Update if exists, otherwise insert
        const existing = await db
          .select()
          .from(paymentMethodsConfig)
          .where(eq(paymentMethodsConfig.methodId, method.id))
          .limit(1);
        
        if (existing.length > 0) {
          // Update existing record
          await db
            .update(paymentMethodsConfig)
            .set({
              name: method.name,
              enabled: method.enabled,
              config: method.config,
              updatedAt: new Date()
            })
            .where(eq(paymentMethodsConfig.methodId, method.id));
          console.log(`✏️ Method "${method.name}" updated`);
        } else {
          // Insert new record
          await db.insert(paymentMethodsConfig).values({
            methodId: method.id,
            name: method.name,
            enabled: method.enabled,
            config: method.config
          });
          console.log(`➕ Method "${method.name}" created`);
        }
      }
      
      console.log('✅ Payment methods saved successfully to PostgreSQL');
      return true;
    } catch (error) {
      console.error('❌ Error saving payment methods:', error);
      return false;
    }
  }
  
  async getSubscription(id: number): Promise<SubscriptionWithDetails | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, id));
      
      if (!subscription) return undefined;
      
      const plan = await this.getSubscriptionPlan(subscription.planId);
      return {
        ...subscription,
        plan: plan as unknown as SubscriptionPlan,
        user: null as unknown as User,
        transactions: [] as PaymentTransaction[]
      };
    } catch (error) {
      console.error(`Error retrieving subscription ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Retrieve a user's subscription with plan details and transactions
   */
  async getSubscriptionByUserId(userId: number): Promise<SubscriptionWithDetails | undefined> {
    try {
      console.log(`Retrieving subscription for user with ID ${userId}`);
      
      // First retrieve the base subscription
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      
      if (!subscription) {
        console.log(`No subscription found for user ${userId}`);
        return undefined;
      }
      
      // Retrieve the associated plan
      const plan = await this.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        console.error(`Subscription plan ${subscription.planId} not found for subscription ${subscription.id}`);
        return undefined;
      }
      
      // For PayPal update operations, we do not need the user to exist
      // It is sufficient to have the subscription and the associated plan
      let user: User | null = null;
      try {
        const foundUser = await this.getUser(userId);
        user = foundUser || null;
        if (!user) {
          console.warn(`User ${userId} not found for subscription ${subscription.id}, continuing anyway`);
        }
      } catch (error) {
        console.warn(`Error retrieving user ${userId}, continuing anyway:`, error);
      }
      
      const transactions = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.subscriptionId, subscription.id))
        .orderBy(desc(paymentTransactions.createdAt));
      
      return {
        ...subscription,
        plan,
        user: user as unknown as User,
        transactions
      };
    } catch (error) {
      console.error(`Error retrieving subscription for user ${userId}:`, error);
      return undefined;
    }
  }

  /**
   * Retrieve the subscription via PayPal Order ID (used for public endpoint)
   */
  async getSubscriptionByPayPalOrderId(orderId: string): Promise<SubscriptionWithDetails | undefined> {
    try {
      console.log(`Retrieving subscription per PayPal Order ID: ${orderId}`);
      
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.paypalSubscriptionId, orderId))
        .limit(1);
      
      if (!subscription) {
        console.log(`No subscription found for PayPal Order ID: ${orderId}`);
        return undefined;
      }
      
      console.log(`Sottoscrizione found: ID ${subscription.id}, User ${subscription.userId}`);
      
      const plan = await this.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        console.error(`Plan ${subscription.planId} not found`);
        return undefined;
      }
      
      let user: User | null = null;
      try {
        const foundUser = await this.getUser(subscription.userId);
        user = foundUser || null;
      } catch (error) {
        console.warn(`User ${subscription.userId} not found for PayPal order`);
      }
      
      const transactions = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.subscriptionId, subscription.id))
        .orderBy(desc(paymentTransactions.createdAt));
      
      return {
        ...subscription,
        plan,
        user: user as unknown as User,
        transactions
      };
    } catch (error) {
      console.error(`Error retrieving subscription for PayPal Order ID ${orderId}:`, error);
      return undefined;
    }
  }

  /**
   * Create a new subscription in the database
   */
  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    try {
      console.log('Creating new subscription:', subscriptionData);
      
      const [subscription] = await db
        .insert(subscriptions)
        .values(subscriptionData)
        .returning();
      
      console.log('Subscription created successfully:', subscription);
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Banking Settings operations - Migrato a PostgreSQL
  async getBankingSettings(): Promise<any> {
    try {
      // Find global banking settings (saved under userId 1 - first admin)
      const settings = await this.getUserSettings(1);
      
      const prefs = settings?.preferences as Record<string, any> | undefined;
      if (prefs?.bankingSettings) {
        console.log('💳 Banking settings loaded from PostgreSQL');
        return prefs.bankingSettings;
      }
      
      // If found, return default
      console.log('💳 No banking settings found, returning default');
      return {
        bankName: '',
        accountHolder: '',
        iban: '',
        bic: '',
        address: '',
        autoPayEnabled: false,
        paymentDelay: 30,
        minimumAmount: 1.0,
        description: 'Referral commission appointment management system',
        isConfigured: false,
      };
    } catch (error) {
      console.error('Error retrieving banking settings:', error);
      return {
        bankName: '',
        accountHolder: '',
        iban: '',
        bic: '',
        address: '',
        autoPayEnabled: false,
        paymentDelay: 30,
        minimumAmount: 1.0,
        description: 'Referral commission appointment management system',
        isConfigured: false,
      };
    }
  }

  async saveBankingSettings(settings: any): Promise<void> {
    try {
      // Save global banking settings under userId 1 (first admin)
      const existingSettings = await this.getUserSettings(1);
      
      if (existingSettings) {
        // Update existing preferences
        const existingPrefs = (existingSettings.preferences || {}) as Record<string, any>;
        await this.updateUserSettings(1, {
          preferences: {
            ...existingPrefs,
            bankingSettings: settings
          }
        });
      } else {
        // Create new settings
        await this.createUserSettings({
          userId: 1,
          preferences: {
            bankingSettings: settings
          }
        });
      }
      
      console.log('💳 Banking settings saved in PostgreSQL');
    } catch (error) {
      console.error('Error saving banking settings:', error);
      throw error;
    }
  }

  // User Settings operations - completely separate architecture per user
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    try {
      console.log(`Retrieving settings for user ${userId}`);
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
      
      console.log(`Settings found for user ${userId}:`, settings ? 'YES' : 'NO');
      return settings;
    } catch (error) {
      console.error(`Error retrieving settings for user ${userId}:`, error);
      return undefined;
    }
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    try {
      console.log(`Creating settings for user ${settings.userId}`);
      const insertData: Record<string, any> = { ...settings, createdAt: new Date(), updatedAt: new Date() };
      const [createdSettings] = await db
        .insert(userSettings)
        .values(insertData)
        .returning();
      
      console.log(`Settings created for user ${settings.userId} with ID ${createdSettings.id}`);
      return createdSettings;
    } catch (error) {
      console.error(`Error creating settings for user ${settings.userId}:`, error);
      throw error;
    }
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    try {
      console.log(`Updating settings for user ${userId}`);
      
      // First check if settings exist for this user
      const existing = await this.getUserSettings(userId);
      
      if (!existing) {
        // If they don't exist, create new settings
        console.log(`No existing settings for user ${userId}, creating automatically`);
        return this.createUserSettings({
          userId,
          ...settings
        });
      }
      
      // Update existing settings
      const updateData: Record<string, any> = { ...settings, updatedAt: new Date() };
      const [updatedSettings] = await db
        .update(userSettings)
        .set(updateData)
        .where(eq(userSettings.userId, userId))
        .returning();
      
      console.log(`Settings updated for user ${userId}`);
      return updatedSettings;
    } catch (error) {
      console.error(`Error updating settings for user ${userId}:`, error);
      return undefined;
    }
  }

  async deleteUserSettings(userId: number): Promise<boolean> {
    try {
      console.log(`Deleting settings for user ${userId}`);
      const result = await db
        .delete(userSettings)
        .where(eq(userSettings.userId, userId));
      
      const deleted = result.count > 0;
      console.log(`Settings deleted for user ${userId}:`, deleted ? 'YES' : 'NO');
      return deleted;
    } catch (error) {
      console.error(`Error deleting settings for user ${userId}:`, error);
      return false;
    }
  }

  async getUserIconPath(userId: number): Promise<string | undefined> {
    try {
      console.log(`Retrieving icon path for user ${userId}`);
      const settings = await this.getUserSettings(userId);
      
      if (settings?.appIconPath) {
        console.log(`Icon path found for user ${userId}: ${settings.appIconPath}`);
        return settings.appIconPath;
      }
      
      console.log(`No custom icon path for user ${userId}`);
      return undefined;
    } catch (error) {
      console.error(`Error retrieving icon path for user ${userId}:`, error);
      return undefined;
    }
  }

  async updateUserIconPath(userId: number, iconPath: string): Promise<UserSettings | undefined> {
    try {
      console.log(`Updating icon path for user ${userId}: ${iconPath}`);
      
      return this.updateUserSettings(userId, {
        appIconPath: iconPath
      });
    } catch (error) {
      console.error(`Error updating icon path for user ${userId}:`, error);
      return undefined;
    }
  }

  // Contact Settings operations - Simple phone/email configuration (replaces SMS verification)
  async getContactSettings(tenantId: number): Promise<ContactSettings | undefined> {
    try {
      console.log(`📞 Retrieving contact settings for tenant ${tenantId}`);
      
      const [settings] = await db
        .select()
        .from(contactSettings)
        .where(eq(contactSettings.tenantId, tenantId))
        .limit(1);
      
      if (settings) {
        logger.debug(`✅ Contact settings found for tenant ${tenantId}:`, {
          phone: settings.phone,
          email: settings.email,
          whatsappOptIn: settings.whatsappOptIn
        });
      } else {
        logger.debug(`ℹ️ No contact settings for tenant ${tenantId}`);
      }
      
      return settings;
    } catch (error) {
      console.error(`Error retrieving contact settings for tenant ${tenantId}:`, error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.contact_settings) {
          return undefined;
        }
        
        const settingsEntry = storageData.contact_settings.find(
          ([_, s]: [number, any]) => s.tenantId === tenantId
        );
        
        if (settingsEntry) {
          logger.debug(`✅ Contact settings found in JSON storage for tenant ${tenantId}`);
          return settingsEntry[1];
        }
        
        return undefined;
      } catch (jsonError) {
        console.error("Error loading contact settings from JSON:", jsonError);
        return undefined;
      }
    }
  }

  async createContactSettings(settings: InsertContactSettings): Promise<ContactSettings> {
    try {
      console.log(`📞 Creating contact settings for tenant ${settings.tenantId}:`, {
        phone: settings.phone,
        email: settings.email,
        whatsappOptIn: settings.whatsappOptIn
      });
      
      const [created] = await db
        .insert(contactSettings)
        .values({
          ...settings,
          updatedAt: new Date()
        })
        .returning();
      
      logger.debug(`✅ settings contact create for tenant ${settings.tenantId}`);
      return created;
    } catch (error) {
      console.error(`Error creating contact settings for tenant ${settings.tenantId}:`, error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        // Ensure contact_settings array exists
        if (!storageData.contact_settings) {
          storageData.contact_settings = [];
        }
        
        // Find max ID
        const maxId = storageData.contact_settings.reduce((max: number, [id]: [number, any]) => 
          Math.max(max, id), 0);
        
        const newContactSettings: ContactSettings = {
          id: maxId + 1,
          tenantId: settings.tenantId,
          phone: settings.phone ?? null,
          email: settings.email || '',
          whatsappOptIn: settings.whatsappOptIn || false,
          updatedAt: new Date()
        };
        
        // Add to storage
        storageData.contact_settings.push([newContactSettings.id, newContactSettings]);
        saveStorageData(storageData);
        
        logger.debug(`✅ Contact settings ${newContactSettings.id} created in JSON storage for tenant ${settings.tenantId}`);
        return newContactSettings;
      } catch (jsonError) {
        console.error("Error creating contact settings in JSON:", jsonError);
        throw error; // Throw original error
      }
    }
  }

  async updateContactSettings(tenantId: number, settings: Partial<InsertContactSettings>): Promise<ContactSettings | undefined> {
    try {
      console.log(`📞 Updating contact settings for tenant ${tenantId}:`, {
        phone: settings.phone,
        email: settings.email,
        whatsappOptIn: settings.whatsappOptIn
      });
      
      const [updated] = await db
        .update(contactSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(contactSettings.tenantId, tenantId))
        .returning();
      
      if (updated) {
        logger.debug(`✅ contact settings updated for tenant ${tenantId}`);
      } else {
        logger.debug(`⚠️ No contact settings found for tenant ${tenantId}`);
      }
      
      return updated;
    } catch (error) {
      console.error(`Error updating contact settings for tenant ${tenantId}:`, error);
      
      // Fallback to JSON storage
      try {
        const { loadStorageData, saveStorageData } = await import('./utils/jsonStorage.js');
        const storageData = loadStorageData();
        
        if (!storageData.contact_settings) {
          storageData.contact_settings = [];
        }
        
        // Find existing settings for this tenant
        const settingsIndex = storageData.contact_settings.findIndex(
          ([_, s]: [number, any]) => s.tenantId === tenantId
        );
        
        if (settingsIndex >= 0) {
          // Update existing
          const [id, existingSettings] = storageData.contact_settings[settingsIndex];
          const updatedSettings = {
            ...existingSettings,
            ...settings,
            updatedAt: new Date()
          };
          storageData.contact_settings[settingsIndex] = [id, updatedSettings];
          saveStorageData(storageData);
          
          logger.debug(`✅ Contact settings updated in JSON storage for tenant ${tenantId}`);
          return updatedSettings;
        } else {
          logger.debug(`⚠️ No contact settings found in JSON for tenant ${tenantId}`);
          return undefined;
        }
      } catch (jsonError) {
        console.error("Error updating contact settings in JSON:", jsonError);
        return undefined;
      }
    }
  }

  async deleteContactSettings(tenantId: number): Promise<boolean> {
    try {
      console.log(`📞 Deleting contact settings for tenant ${tenantId}`);
      
      const result = await db
        .delete(contactSettings)
        .where(eq(contactSettings.tenantId, tenantId));
      
      await result;
      logger.debug(`✅ contact settings deleted for tenant ${tenantId}`);
      const success = true;
      
      return success;
    } catch (error) {
      console.error(`Error deleting contact settings for tenant ${tenantId}:`, error);
      return false;
    }
  }

  // Currency Settings operations - currency management per user
  async getCurrencySettings(userId: number): Promise<CurrencySettings | undefined> {
    try {
      console.log(`💰 Retrieving currency settings for user ${userId}`);
      
      const [settings] = await db
        .select()
        .from(currencySettings)
        .where(eq(currencySettings.userId, userId))
        .limit(1);
      
      if (settings) {
        logger.debug(`✅ Currency settings found for user ${userId}:`, {
          currency: settings.currency,
          symbol: settings.symbol
        });
        return settings;
      }
      
      logger.debug(`ℹ️ No currency settings for user ${userId}, using default EUR €`);
      return undefined;
    } catch (error) {
      console.error(`Error retrieving currency settings for user ${userId}:`, error);
      return undefined;
    }
  }

  async saveCurrencySettings(userId: number, currency: string, symbol: string): Promise<CurrencySettings> {
    try {
      console.log(`💰 Saving currency settings for user ${userId}:`, { currency, symbol });
      
      // First try to update if it already exists
      const [updated] = await db
        .update(currencySettings)
        .set({
          currency,
          symbol,
          updatedAt: new Date()
        })
        .where(eq(currencySettings.userId, userId))
        .returning();
      
      if (updated) {
        logger.debug(`✅ Currency settings updated for user ${userId}`);
        return updated;
      }
      
      // If it doesn't exist, create new settings
      const [created] = await db
        .insert(currencySettings)
        .values({
          userId,
          currency,
          symbol,
          updatedAt: new Date()
        })
        .returning();
      
      logger.debug(`✅ Currency settings created for user ${userId}`);
      return created;
    } catch (error) {
      console.error(`Error saving currency settings for user ${userId}:`, error);
      throw error;
    }
  }

  // Manual Content operations - Interactive manual management system
  async getManualContent(userId: number, section: string, locale: string): Promise<ManualContent | undefined> {
    try {
      console.log(`📖 Retrieving manual content for user ${userId}, section: ${section}, locale: ${locale}`);
      
      const [content] = await db
        .select()
        .from(manualContent)
        .where(
          and(
            eq(manualContent.userId, userId),
            eq(manualContent.section, section),
            eq(manualContent.locale, locale)
          )
        )
        .limit(1);
      
      if (content) {
        logger.debug(`✅ Contenuto manual found per section ${section}`);
        return content;
      }
      
      logger.debug(`ℹ️ No manual content for section ${section}, locale ${locale}`);
      return undefined;
    } catch (error) {
      console.error(`Error retrieving manual content:`, error);
      return undefined;
    }
  }

  async getAllManualSections(userId: number, locale: string): Promise<ManualContent[]> {
    try {
      console.log(`📖 Retrieving all manual sections for user ${userId}, locale: ${locale}`);
      
      const sections = await db
        .select()
        .from(manualContent)
        .where(
          and(
            eq(manualContent.userId, userId),
            eq(manualContent.locale, locale)
          )
        )
        .orderBy(asc(manualContent.section));
      
      logger.debug(`✅ Found ${sections.length} manual sections`);
      return sections;
    } catch (error) {
      console.error(`Error retrieving manual sections:`, error);
      return [];
    }
  }

  async saveManualContent(content: InsertManualContent): Promise<ManualContent> {
    try {
      console.log(`📖 Saving manual content:`, {
        userId: content.userId,
        section: content.section,
        locale: content.locale,
        stepsCount: Array.isArray(content.steps) ? content.steps.length : 0
      });
      
      const [saved] = await db
        .insert(manualContent)
        .values({
          ...content,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      logger.debug(`✅ Manual content saved with ID ${saved.id}`);
      return saved;
    } catch (error) {
      console.error(`Error saving manual content:`, error);
      throw error;
    }
  }

  async updateManualContent(id: number, userId: number, content: Partial<InsertManualContent>): Promise<ManualContent | undefined> {
    try {
      console.log(`📖 Updating manual content ID ${id} for user ${userId}`);
      
      const [updated] = await db
        .update(manualContent)
        .set({
          ...content,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(manualContent.id, id),
            eq(manualContent.userId, userId)
          )
        )
        .returning();
      
      if (updated) {
        logger.debug(`✅ Contenuto manual updated successfully`);
        return updated;
      }
      
      logger.debug(`⚠️ Contenuto manual not found o permessi insufficienti`);
      return undefined;
    } catch (error) {
      console.error(`Error updating manual content:`, error);
      return undefined;
    }
  }

  async deleteManualContent(id: number, userId: number): Promise<boolean> {
    try {
      console.log(`📖 Deleting manual content ID ${id} for user ${userId}`);
      
      const result = await db
        .delete(manualContent)
        .where(
          and(
            eq(manualContent.id, id),
            eq(manualContent.userId, userId)
          )
        );
      
      const deleted = result.count > 0;
      if (deleted) {
        logger.debug(`✅ Contenuto manual deleted successfully`);
      } else {
        logger.debug(`⚠️ Contenuto manual not found`);
      }
      
      return deleted;
    } catch (error) {
      console.error(`Error deleting manual content:`, error);
      return false;
    }
  }

  // Product Category operations - JSON Storage (delegated)
  async getProductCategories(userId: number): Promise<ProductCategory[]> {
    return inventoryJsonStorage.getProductCategories(userId);
  }

  async getProductCategory(id: number, userId: number): Promise<ProductCategory | undefined> {
    return inventoryJsonStorage.getProductCategory(id, userId);
  }

  async createProductCategory(category: InsertProductCategory & { userId: number }): Promise<ProductCategory> {
    return inventoryJsonStorage.createProductCategory(category);
  }

  async updateProductCategory(id: number, userId: number, category: Partial<InsertProductCategory>): Promise<ProductCategory | undefined> {
    return inventoryJsonStorage.updateProductCategory(id, userId, category);
  }

  async deleteProductCategory(id: number, userId: number): Promise<boolean> {
    return inventoryJsonStorage.deleteProductCategory(id, userId);
  }

  // Product operations - JSON Storage (delegated)
  async getProducts(userId: number): Promise<Product[]> {
    return inventoryJsonStorage.getProducts(userId);
  }

  async getProduct(id: number, userId: number): Promise<Product | undefined> {
    return inventoryJsonStorage.getProduct(id, userId);
  }

  async createProduct(product: InsertProduct & { userId: number }): Promise<Product> {
    return inventoryJsonStorage.createProduct(product);
  }

  async updateProduct(id: number, userId: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    return inventoryJsonStorage.updateProduct(id, userId, product);
  }

  async deleteProduct(id: number, userId: number): Promise<boolean> {
    return inventoryJsonStorage.deleteProduct(id, userId);
  }

  async getLowStockProducts(userId: number): Promise<Product[]> {
    return inventoryJsonStorage.getLowStockProducts(userId);
  }

  // Stock Movement operations - JSON Storage (delegated)
  async getStockMovements(userId: number, limit?: number): Promise<StockMovement[]> {
    return inventoryJsonStorage.getStockMovements(userId, limit);
  }

  async createStockMovement(movement: InsertStockMovement & { userId: number }): Promise<StockMovement> {
    return inventoryJsonStorage.createStockMovement(movement);
  }

  async getProductStockHistory(productId: number, userId: number): Promise<StockMovement[]> {
    return inventoryJsonStorage.getProductStockHistory(productId, userId);
  }

  // Product Sale operations - JSON Storage (delegated)
  async getProductSales(userId: number, limit?: number): Promise<ProductSale[]> {
    return inventoryJsonStorage.getProductSales(userId, limit);
  }

  async createProductSale(sale: InsertProductSale & { userId: number }): Promise<ProductSale> {
    return inventoryJsonStorage.createProductSale(sale);
  }

  async getProductSalesHistory(productId: number, userId: number): Promise<ProductSale[]> {
    return inventoryJsonStorage.getProductSalesHistory(productId, userId);
  }

  // User Icon operations - Persist icons in PostgreSQL for Sliplane compatibility
  async getUserIcon(userId: number): Promise<string | undefined> {
    try {
      const [result] = await db
        .select()
        .from(userIcons)
        .where(eq(userIcons.userId, userId));
      
      return result?.iconBase64;
    } catch (error) {
      console.error(`Error getting icon for user ${userId}:`, error);
      return undefined;
    }
  }

  async saveUserIcon(userId: number, iconBase64: string): Promise<void> {
    try {
      // Check if an icon already exists for this user
      const existing = await this.getUserIcon(userId);
      
      if (existing) {
        // Update existing icon
        await db
          .update(userIcons)
          .set({ 
            iconBase64, 
            updatedAt: new Date() 
          })
          .where(eq(userIcons.userId, userId));
        
        logger.debug(`✅ Icon updated for user ${userId}`);
      } else {
        // Insert new icon
        await db
          .insert(userIcons)
          .values({ 
            userId, 
            iconBase64 
          });
        
        logger.debug(`✅ Icon created for user ${userId}`);
      }
    } catch (error) {
      console.error(`Error saving icon for user ${userId}:`, error);
      throw error;
    }
  }

  async deleteUserIcon(userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(userIcons)
        .where(eq(userIcons.userId, userId));
      
      logger.debug(`✅ Icon deleted for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting icon for user ${userId}:`, error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
