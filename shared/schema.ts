import { pgTable, text, serial, integer, boolean, timestamp, time, decimal, varchar, json, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Clients table schema - RISTRUTTURATO PER MULTI-TENANT
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  birthday: text("birthday"),
  notes: text("notes"),
  isFrequent: boolean("isFrequent").default(false),
  medicalNotes: text("medicalNotes"),
  allergies: text("allergies"),
  createdAt: timestamp("createdAt").defaultNow(),
  hasConsent: boolean("hasConsent").default(false),
  ownerId: integer("ownerId"), // ID dell'utente che ha creato questo cliente
  originalOwnerId: integer("originalOwnerId"), // ID dell'utente originale (per clienti importati)
  assignmentCode: text("assignmentCode"), // Codice usato per assegnare il cliente all'account
  uniqueCode: text("uniqueCode"), // Codice univoco per identificare il cliente
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  userId: true,
  ownerId: true,
  assignmentCode: true,
  uniqueCode: true,
});

// Services table schema - RISTRUTTURATO PER MULTI-TENANT
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  name: text("name").notNull(),
  duration: integer("duration").notNull(), // in minutes
  color: text("color").default("#3f51b5"),
  price: integer("price"), // in cents
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
});

// Appointments table schema - RISTRUTTURATO PER MULTI-TENANT
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  clientId: integer("client_id").notNull(),
  serviceId: integer("service_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  notes: text("notes"),
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  reminderType: text("reminder_type"), // single: sms, whatsapp, email / multiple: sms,whatsapp,email
  reminderStatus: text("reminder_status").default("pending"), // pending, sent, failed
  reminderTime: timestamp("reminder_time"), // When the reminder should be sent
  reminderSent: boolean("reminder_sent").default(false), // Flag to track if reminder was sent
  reminderConfirmed: boolean("reminder_confirmed").default(false), // Flag to track if the client confirmed the reminder
  reminderConfirmedAt: timestamp("reminder_confirmed_at"), // When the client confirmed the reminder
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

// Consent documents table schema - RISTRUTTURATO PER MULTI-TENANT
export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  clientId: integer("client_id").notNull(),
  consentText: text("consent_text"),
  consentProvided: boolean("consent_provided").default(true),
  consentDate: timestamp("consent_date").defaultNow(),
  signature: text("signature"),
  signedAt: timestamp("signed_at").defaultNow(),
});

export const insertConsentSchema = createInsertSchema(consents).omit({
  id: true,
  signedAt: true,
}).extend({
  consentDate: z.string().optional(),
});

// Invoices table schema - RISTRUTTURATO PER MULTI-TENANT
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  invoiceNumber: text("invoice_number").notNull(),
  clientId: integer("client_id").notNull(),
  totalAmount: integer("total_amount").notNull(), // in cents
  tax: integer("tax").default(0), // in cents
  date: text("date").notNull(), // YYYY-MM-DD format
  dueDate: text("due_date").notNull(), // YYYY-MM-DD format
  status: text("status").default("unpaid"), // unpaid, paid, overdue, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

// Invoice items table schema - RISTRUTTURATO PER MULTI-TENANT
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  invoiceId: integer("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(), // in cents
  appointmentId: integer("appointment_id"), // Optional connection to an appointment
  serviceId: integer("service_id"), // Optional connection to a service
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

// Payments table schema - RISTRUTTURATO PER MULTI-TENANT
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  invoiceId: integer("invoice_id").notNull(),
  amount: integer("amount").notNull(), // in cents
  paymentDate: text("payment_date").notNull(), // YYYY-MM-DD format
  paymentMethod: text("payment_method").notNull(), // cash, card, bank_transfer
  reference: text("reference"), // e.g., transaction ID
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Users table schema (staff/admin users)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  role: text("role").default("staff").notNull(), // admin, staff, client
  clientId: integer("client_id"), // Solo per utenti di tipo client
  type: text("type").default("staff").notNull(), // staff, client
  assignmentCode: text("assignment_code"), // Codice per assegnare clienti a questo account
  referralCode: text("referral_code"), // Codice referral per commissioni tra professionisti
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Client accounts table schema (for client portal access)
export const clientAccounts = pgTable("client_accounts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique(), // Collegamento one-to-one con il cliente
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  activationToken: text("activation_token"),
  activationExpires: timestamp("activation_expires"),
  resetToken: text("reset_token"),
  resetExpires: timestamp("reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientAccountSchema = createInsertSchema(clientAccounts).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

// Client Notes table schema
export const clientNotes = pgTable("client_notes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"), // general, medical, allergies
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientNoteSchema = createInsertSchema(clientNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Notifications table schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  appointmentId: integer("appointment_id"),
  type: text("type").notNull(), // appointment_reminder, consent_needed, etc.
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
  scheduledFor: timestamp("scheduled_for"),
  channel: text("channel").default("app"), // app, sms, email, whatsapp
  metadata: json("metadata"), // Metadati aggiuntivi (per esempio SID Twilio, stato dell'invio SMS, ecc.)
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
});

// Activation tokens table schema
export const activationTokens = pgTable("activation_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  clientId: integer("client_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivationTokenSchema = createInsertSchema(activationTokens).omit({
  id: true,
  createdAt: true,
});

// Google Calendar Events table schema
export const googleCalendarEvents = pgTable("google_calendar_events", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().unique(),
  googleEventId: text("google_event_id").notNull(),
  syncStatus: text("sync_status").default("synced"), // synced, pending, error
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  syncError: text("sync_error"),
  calendarId: text("calendar_id").default("primary"),
  metadata: json("metadata"), // Additional data about the event
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGoogleCalendarEventSchema = createInsertSchema(googleCalendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Google Calendar settings table schema
export const googleCalendarSettings = pgTable("google_calendar_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(false),
  apiKey: text("api_key"),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  redirectUri: text("redirect_uri"),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  tokenExpiry: timestamp("token_expiry"),
  calendarId: text("calendar_id").default("primary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGoogleCalendarSettingsSchema = createInsertSchema(googleCalendarSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Notification Settings table schema
// Tabella per tracciare gli accessi dei clienti all'app
export const clientAccesses = pgTable("client_accesses", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  accessTime: timestamp("access_time").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

export const insertClientAccessSchema = createInsertSchema(clientAccesses).omit({
  id: true,
});

export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  // Email settings
  emailEnabled: boolean("email_enabled").default(false),
  smtpServer: text("smtp_server"),
  smtpPort: integer("smtp_port").default(587),
  smtpUsername: text("smtp_username"),
  smtpPassword: text("smtp_password"),
  senderEmail: text("sender_email"),
  emailSignature: text("email_signature"),
  // Notifiche telefoniche settings
  smsEnabled: boolean("sms_enabled").default(false),
  smsGatewayMethod: text("sms_gateway_method").default("direct"), // direct, twilio
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  whatsappMethod: text("whatsapp_method").default("direct"), // direct, twilio
  // Numero di telefono per notifiche
  useContactPhoneForNotifications: boolean("use_contact_phone_for_notifications").default(true),
  preferredContactPhone: text("preferred_contact_phone").default("primary"), // primary o secondary
  notificationPhone: text("notification_phone"), // Numero di telefono dedicato per notifiche
  // Twilio settings (legacy)
  twilioEnabled: boolean("twilio_enabled").default(false),
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioPhoneNumber: text("twilio_phone_number"),
  // Settings for direct methods
  notificationCenterEnabled: boolean("notification_center_enabled").default(true),
  // General settings
  defaultReminderTime: integer("default_reminder_time").default(24), // in hours
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Beta Tester System Tables
export const betaInvitations = pgTable("beta_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  invitationCode: text("invitation_code").notNull().unique(),
  isUsed: boolean("is_used").default(false),
  usedById: integer("used_by_id"),
  usedCount: integer("used_count").default(0),
  maxUses: integer("max_uses").default(1),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
  notes: text("notes"),
});

export const insertBetaInvitationSchema = createInsertSchema(betaInvitations).omit({
  id: true,
  createdAt: true,
});

export const betaFeedback = pgTable("beta_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  feedbackType: text("feedback_type").default("general"), // general, bug, feature, usability
  content: text("content").notNull(),
  rating: integer("rating"), // 1-5 rating
  status: text("status").default("pending"), // pending, reviewed, implemented, rejected
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  screenshot: text("screenshot"), // URL to screenshot if attached
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBetaFeedbackSchema = createInsertSchema(betaFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Payment System Tables
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // in cents
  interval: text("interval").notNull().default("month"), // month, year
  features: json("features"), // JSON array of features included in this plan
  clientLimit: integer("client_limit"), // Maximum number of clients
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(), // The staff user who owns this subscription
  planId: integer("plan_id").notNull(),
  status: text("status").default("active"), // active, canceled, past_due, incomplete
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  paypalSubscriptionId: text("paypal_subscription_id"),
  wiseSubscriptionId: text("wise_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSessionId: text("stripe_session_id"),
  paymentMethod: text("payment_method"), // paypal, wise, stripe, etc.
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  paymentType: text("payment_type").notNull(), // paypal, wise, etc
  isDefault: boolean("is_default").default(false),
  paypalEmail: text("paypal_email"),
  wiseAccountId: text("wise_account_id"),
  lastFour: text("last_four"), // Last four characters of account
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subscriptionId: integer("subscription_id"),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("EUR").notNull(),
  status: text("status").notNull(), // completed, pending, failed
  paymentMethod: text("payment_method").notNull(), // paypal, wise, etc.
  transactionId: text("transaction_id"), // External ID from payment provider
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Settings table - Impostazioni personalizzate per ogni utente
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(), // Un record per utente
  
  // Informazioni Business
  businessName: text("business_name"),
  description: text("description"),
  website: text("website"),
  address: text("address"),
  
  // Contatti
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactPhone2: text("contact_phone2"),
  
  // Social Media
  instagramHandle: text("instagram_handle"),
  facebookPage: text("facebook_page"),
  linkedinProfile: text("linkedin_profile"),
  
  // Personalizzazione Aspetto
  logoUrl: text("logo_url"), // URL del logo personalizzato
  appIconPath: text("app_icon_path"), // Percorso icona app personalizzata
  primaryColor: text("primary_color").default("#3f51b5"),
  secondaryColor: text("secondary_color").default("#ffffff"),
  theme: text("theme").default("professional"), // professional, vibrant, tint
  appearance: text("appearance").default("light"), // light, dark, system
  
  // Configurazioni Email
  emailProvider: text("email_provider"), // sendgrid, gmail, outlook, etc.
  emailApiKey: text("email_api_key"),
  emailFromName: text("email_from_name"),
  emailFromAddress: text("email_from_address"),
  emailSignature: text("email_signature"),
  
  // Configurazioni SMS/WhatsApp
  smsEnabled: boolean("sms_enabled").default(false),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  whatsappNumber: text("whatsapp_number"),
  whatsappApiKey: text("whatsapp_api_key"),
  whatsappTemplate: text("whatsapp_template"),
  
  // Impostazioni Appuntamenti
  workingHoursStart: time("working_hours_start").default("09:00"),
  workingHoursEnd: time("working_hours_end").default("18:00"),
  workingDays: json("working_days").$type<string[]>().default(["monday", "tuesday", "wednesday", "thursday", "friday"]),
  timeSlotDuration: integer("time_slot_duration").default(30), // minuti
  
  // Impostazioni Notifiche
  reminderEnabled: boolean("reminder_enabled").default(true),
  reminderHoursBefore: integer("reminder_hours_before").default(24),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true),
  smsNotificationsEnabled: boolean("sms_notifications_enabled").default(false),
  
  // Impostazioni Calendario
  calendarIntegrationEnabled: boolean("calendar_integration_enabled").default(false),
  defaultCalendarId: text("default_calendar_id"),
  timezoneSettings: text("timezone_settings").default("Europe/Rome"),
  
  // Impostazioni Fatturazione
  invoicePrefix: text("invoice_prefix").default("INV"),
  invoiceCounter: integer("invoice_counter").default(1),
  taxRate: decimal("tax_rate").default("22.00"), // IVA predefinita
  paymentTerms: text("payment_terms").default("30 giorni"),
  
  // Impostazioni Privacy
  gdprCompliant: boolean("gdpr_compliant").default(true),
  consentRequired: boolean("consent_required").default(true),
  dataRetentionMonths: integer("data_retention_months").default(24),
  
  // Metadata e Timestamps
  preferences: json("preferences"), // Preferenze aggiuntive in formato JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type GoogleCalendarEvent = typeof googleCalendarEvents.$inferSelect;
export type InsertGoogleCalendarEvent = z.infer<typeof insertGoogleCalendarEventSchema>;

export type GoogleCalendarSettings = typeof googleCalendarSettings.$inferSelect;
export type InsertGoogleCalendarSettings = z.infer<typeof insertGoogleCalendarSettingsSchema>;

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;

export type Consent = typeof consents.$inferSelect;
export type InsertConsent = z.infer<typeof insertConsentSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ClientAccount = typeof clientAccounts.$inferSelect;
export type InsertClientAccount = z.infer<typeof insertClientAccountSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ActivationToken = typeof activationTokens.$inferSelect;
export type InsertActivationToken = z.infer<typeof insertActivationTokenSchema>;

export type ClientNote = typeof clientNotes.$inferSelect;
export type InsertClientNote = z.infer<typeof insertClientNoteSchema>;

export type ClientAccess = typeof clientAccesses.$inferSelect;
export type InsertClientAccess = z.infer<typeof insertClientAccessSchema>;

export type BetaInvitation = typeof betaInvitations.$inferSelect;
export type InsertBetaInvitation = z.infer<typeof insertBetaInvitationSchema>;

export type BetaFeedback = typeof betaFeedback.$inferSelect;
export type InsertBetaFeedback = z.infer<typeof insertBetaFeedbackSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Define relations
export const clientsRelations = relations(clients, ({ many, one }) => ({
  appointments: many(appointments),
  consents: many(consents),
  invoices: many(invoices),
  notifications: many(notifications),
  notes: many(clientNotes),
  accesses: many(clientAccesses),
  clientAccount: one(clientAccounts, {
    fields: [clients.id],
    references: [clientAccounts.clientId],
  }),
  userAccount: many(users),
  activationTokens: many(activationTokens),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  appointments: many(appointments),
  invoiceItems: many(invoiceItems),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  invoiceItems: many(invoiceItems),
  notifications: many(notifications),
  googleCalendarEvent: one(googleCalendarEvents, {
    fields: [appointments.id],
    references: [googleCalendarEvents.appointmentId],
  }),
}));

export const googleCalendarEventsRelations = relations(googleCalendarEvents, ({ one }) => ({
  appointment: one(appointments, {
    fields: [googleCalendarEvents.appointmentId],
    references: [appointments.id],
  }),
}));

export const consentsRelations = relations(consents, ({ one }) => ({
  client: one(clients, {
    fields: [consents.clientId],
    references: [clients.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  service: one(services, {
    fields: [invoiceItems.serviceId],
    references: [services.id],
  }),
  appointment: one(appointments, {
    fields: [invoiceItems.appointmentId],
    references: [appointments.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const clientAccountsRelations = relations(clientAccounts, ({ one }) => ({
  client: one(clients, {
    fields: [clientAccounts.clientId],
    references: [clients.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  client: one(clients, {
    fields: [notifications.clientId],
    references: [clients.id],
  }),
  appointment: one(appointments, {
    fields: [notifications.appointmentId],
    references: [appointments.id],
  }),
}));

export const activationTokensRelations = relations(activationTokens, ({ one }) => ({
  client: one(clients, {
    fields: [activationTokens.clientId],
    references: [clients.id],
  }),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  client: one(clients, {
    fields: [clientNotes.clientId],
    references: [clients.id],
  }),
}));

export const clientAccessesRelations = relations(clientAccesses, ({ one }) => ({
  client: one(clients, {
    fields: [clientAccesses.clientId],
    references: [clients.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  client: one(clients, {
    fields: [users.clientId],
    references: [clients.id],
  }),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  paymentMethods: many(paymentMethods),
  paymentTransactions: many(paymentTransactions),
  betaFeedback: many(betaFeedback),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  transactions: many(paymentTransactions),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  user: one(users, {
    fields: [paymentTransactions.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [paymentTransactions.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const betaInvitationsRelations = relations(betaInvitations, ({ one }) => ({
  usedBy: one(users, {
    fields: [betaInvitations.usedById],
    references: [users.id],
  }),
}));

export const betaFeedbackRelations = relations(betaFeedback, ({ one }) => ({
  user: one(users, {
    fields: [betaFeedback.userId],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [betaFeedback.reviewedBy],
    references: [users.id],
  }),
}));

// Extended types for frontend use
export type AppointmentWithDetails = Appointment & {
  client: Client;
  service: Service;
};

export type ClientWithAppointments = Client & {
  appointments: AppointmentWithDetails[];
};

export type ClientWithAccessCount = Client & {
  accessCount: number;
};

export type InvoiceWithDetails = Invoice & {
  client: Client;
  items: (InvoiceItem & { service?: Service })[];
  payments: Payment[];
};

export type InvoiceItemWithDetails = InvoiceItem & {
  service?: Service;
  appointment?: Appointment;
};

export type SubscriptionWithDetails = Subscription & {
  plan: SubscriptionPlan;
  user: User;
  transactions: PaymentTransaction[];
};

export type BetaFeedbackWithUserDetails = BetaFeedback & {
  user: User;
  reviewedByUser?: User;
};

// Template per i promemoria degli appuntamenti
export const reminderTemplates = pgTable("reminder_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  template: text("template").notNull(),
  serviceId: integer("service_id"),
  type: text("type").default("sms"), // sms, whatsapp, email
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReminderTemplateSchema = createInsertSchema(reminderTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ReminderTemplate = typeof reminderTemplates.$inferSelect;
export type InsertReminderTemplate = z.infer<typeof insertReminderTemplateSchema>;

// Impostazioni generali dell'applicazione - RISTRUTTURATO PER MULTI-TENANT
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  key: text("key").notNull(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;

export const reminderTemplatesRelations = relations(reminderTemplates, ({ one }) => ({
  service: one(services, {
    fields: [reminderTemplates.serviceId],
    references: [services.id],
    relationName: "service_reminder_templates",
  }),
}));

// Phones table schema (for direct phone configuration)
export const phones = pgTable("phones", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPhoneSchema = createInsertSchema(phones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Phone = typeof phones.$inferSelect;
export type InsertPhone = z.infer<typeof insertPhoneSchema>;

// Licenses table schema
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // trial, base, pro, business, passepartout
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  userId: integer("user_id"), // Collegamento con l'utente proprietario della licenza
  sponsoredBy: integer("sponsored_by"), // ID dello staff che ha sponsorizzato questa licenza
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({
  id: true,
  createdAt: true,
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;

// Staff Commissions table schema (Sistema Referral)
// Tabella referral commissions (esistente nel database)
export const referralCommissions = pgTable("referral_commissions", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(), // Staff che ha fatto il referral
  referredId: integer("referred_id").notNull(), // Utente sponsorizzato
  subscriptionId: integer("subscription_id"), // ID sottoscrizione
  monthlyAmount: integer("monthly_amount").default(100), // Commissione mensile in centesimi
  status: text("status").default("active"), // active, inactive, cancelled
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  lastPaidPeriod: timestamp("last_paid_period"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Manteniamo anche la tabella staff_commissions per compatibilità
export const staffCommissions = pgTable("staff_commissions", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(), // ID dello staff che riceve la commissione
  licenseId: integer("license_id").notNull(), // ID della licenza sponsorizzata
  commissionAmount: integer("commission_amount").default(100), // Commissione in centesimi (1€ = 100)
  isPaid: boolean("is_paid").default(false),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"), // Note per il pagamento
});

export const insertStaffCommissionSchema = createInsertSchema(staffCommissions).omit({
  id: true,
  createdAt: true,
});

export type StaffCommission = typeof staffCommissions.$inferSelect;
export type InsertStaffCommission = z.infer<typeof insertStaffCommissionSchema>;

// Onboarding Progress table schema
export const onboardingProgress = pgTable("onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  currentStep: integer("currentStep").default(0).notNull(),
  completedSteps: text("completedSteps").array().default([]),
  businessType: text("businessType"), // e.g., "medical", "beauty", "consulting"
  businessName: text("businessName"),
  primaryServices: text("primaryServices").array().default([]),
  workingHours: text("workingHours"), // JSON string for complex schedule
  appointmentDuration: integer("appointmentDuration").default(60), // minutes
  clientManagementNeeds: text("clientManagementNeeds").array().default([]),
  communicationPreferences: text("communicationPreferences").array().default([]),
  integrationGoals: text("integrationGoals").array().default([]),
  aiRecommendations: text("aiRecommendations"), // JSON string of AI suggestions
  isCompleted: boolean("isCompleted").default(false),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;

// Relazione tra licenses e users
export const licensesRelations = relations(licenses, ({ one, many }) => ({
  user: one(users, {
    fields: [licenses.userId],
    references: [users.id],
    relationName: "user_licenses",
  }),
  sponsoredByStaff: one(users, {
    fields: [licenses.sponsoredBy],
    references: [users.id],
    relationName: "sponsored_licenses",
  }),
  commissions: many(staffCommissions, {
    relationName: "license_commissions",
  }),
}));

// Relazioni per Staff Commissions
export const staffCommissionsRelations = relations(staffCommissions, ({ one }) => ({
  staff: one(users, {
    fields: [staffCommissions.staffId],
    references: [users.id],
    relationName: "staff_commissions",
  }),
  license: one(licenses, {
    fields: [staffCommissions.licenseId],
    references: [licenses.id],
    relationName: "license_commissions",
  }),
}));

// Company Name Settings - Isolamento completo per utente
export const companyNameSettings = pgTable("company_name_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull().default(""),
  fontSize: integer("font_size").notNull().default(24),
  fontFamily: text("font_family").notNull().default("Arial"),
  fontWeight: text("font_weight").notNull().default("normal"),
  fontStyle: text("font_style").notNull().default("normal"),
  textDecoration: text("text_decoration").notNull().default("none"),
  color: text("color").notNull().default("#000000"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CompanyNameSettings = typeof companyNameSettings.$inferSelect;
export type InsertCompanyNameSettings = typeof companyNameSettings.$inferInsert;

// Company Name Settings Relations
export const companyNameSettingsRelations = relations(companyNameSettings, ({ one }) => ({
  user: one(users, {
    fields: [companyNameSettings.userId],
    references: [users.id],
  }),
}));

// Onboarding Progress Relations
export const onboardingProgressRelations = relations(onboardingProgress, ({ one }) => ({
  user: one(users, {
    fields: [onboardingProgress.userId],
    references: [users.id],
  }),
}));