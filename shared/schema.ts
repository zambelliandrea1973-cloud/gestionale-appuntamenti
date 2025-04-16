import { pgTable, text, serial, integer, boolean, timestamp, time, decimal, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Clients table schema
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  birthday: text("birthday"),
  notes: text("notes"),
  isFrequent: boolean("is_frequent").default(false),
  medicalNotes: text("medical_notes"),
  allergies: text("allergies"),
  createdAt: timestamp("created_at").defaultNow(),
  hasConsent: boolean("has_consent").default(false),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

// Services table schema
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  duration: integer("duration").notNull(), // in minutes
  color: text("color").default("#3f51b5"),
  price: integer("price"), // in cents
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
});

// Appointments table schema
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
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

// Consent documents table schema
export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
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

// Invoices table schema
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
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

// Invoice items table schema
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
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

// Payments table schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
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
  channel: text("channel").default("app"), // app, sms, email
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

// Define relations
export const clientsRelations = relations(clients, ({ many, one }) => ({
  appointments: many(appointments),
  consents: many(consents),
  invoices: many(invoices),
  notifications: many(notifications),
  notes: many(clientNotes),
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

export const usersRelations = relations(users, ({ one }) => ({
  client: one(clients, {
    fields: [users.clientId],
    references: [clients.id],
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

export type InvoiceWithDetails = Invoice & {
  client: Client;
  items: (InvoiceItem & { service?: Service })[];
  payments: Payment[];
};

export type InvoiceItemWithDetails = InvoiceItem & {
  service?: Service;
  appointment?: Appointment;
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

// Impostazioni generali dell'applicazione
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
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