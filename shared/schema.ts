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
  assignmentCode: text("assignmentCode"), // Codice usato per assegnare il cliente all'account
  uniqueCode: text("uniqueCode"), // Codice univoco per identificare il cliente (legacy format: PROF_014_9C1F_CLIENT_14003_816C)
  newUniqueCode: text("newUniqueCode"), // NUOVO: Codice unificato formato BUS1422-001 (11 char, migrazione graduale, nullable)
  taxCode: text("taxCode"), // Codice fiscale
  vatNumber: text("vatNumber"), // Partita IVA
  emailBlocked: boolean("email_blocked").default(false), // NUOVO: Flag per bloccare invio email dopo bounce ripetuti
  emailBlockedReason: text("email_blocked_reason"), // Motivazione blocco (es: "mailbox_full", "user_unknown")
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  assignmentCode: true,
  newUniqueCode: true, // Generato automaticamente durante migrazione/creazione
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// Email Bounces table - Tracciamento errori invio email per prevenire bounce ripetuti
export const emailBounces = pgTable("email_bounces", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(), // Multi-tenant: professionista proprietario
  clientId: integer("client_id"), // Optional: riferimento al cliente se presente
  email: text("email").notNull(), // Indirizzo email che genera bounce
  errorCode: text("error_code"), // Codice errore SMTP (es: "550", "552", "554")
  errorMessage: text("error_message"), // Messaggio errore completo
  errorType: text("error_type").notNull(), // "permanent" (mailbox non esiste) o "temporary" (casella piena, server offline)
  bounceCount: integer("bounce_count").default(1).notNull(), // Numero bounce totali (storico)
  consecutivePermanentBounces: integer("consecutive_permanent_bounces").default(0).notNull(), // Bounce PERMANENTI consecutivi (reset su success/temporary)
  lastBounceAt: timestamp("last_bounce_at").defaultNow().notNull(), // Timestamp ultimo bounce
  isBlocked: boolean("is_blocked").default(false).notNull(), // Flag: email bloccata dopo 3+ bounce permanenti CONSECUTIVI
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indici per ricerca veloce
  emailIdx: index("email_idx").on(table.email),
  ownerIdx: index("owner_idx").on(table.ownerId),
  clientIdx: index("client_idx_bounces").on(table.clientId),
}));

export const insertEmailBounceSchema = createInsertSchema(emailBounces).omit({
  id: true,
  createdAt: true,
});

export type EmailBounce = typeof emailBounces.$inferSelect;
export type InsertEmailBounce = z.infer<typeof insertEmailBounceSchema>;

// Code Migration Crosswalk - Tabella per mapping vecchi/nuovi codici identificativi
export const codeMigrationCrosswalk = pgTable("code_migration_crosswalk", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(), // Multi-tenant: proprietario dello studio
  clientId: integer("client_id").notNull(), // Riferimento al cliente
  oldUniqueCode: text("old_unique_code").notNull(), // Vecchio formato: PROF_014_9C1F_CLIENT_14003_816C
  newUniqueCode: text("new_unique_code").notNull(), // Nuovo formato: BUS1422-001 (11 caratteri)
  migratedAt: timestamp("migrated_at").defaultNow(),
}, (table) => ({
  // Indici per ricerca veloce
  oldCodeIdx: index("old_code_idx").on(table.oldUniqueCode),
  newCodeIdx: index("new_code_idx").on(table.newUniqueCode),
  clientIdx: index("client_idx").on(table.clientId),
}));

export const insertCodeMigrationCrosswalkSchema = createInsertSchema(codeMigrationCrosswalk).omit({
  id: true,
  migratedAt: true,
});

export type CodeMigrationCrosswalk = typeof codeMigrationCrosswalk.$inferSelect;
export type InsertCodeMigrationCrosswalk = z.infer<typeof insertCodeMigrationCrosswalkSchema>;

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

// Appointments table schema - RISTRUTTURATO PER MULTI-TENANT + STAFF/ROOMS
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // AGGIUNTO: Separazione per utente
  clientId: integer("client_id").notNull(),
  serviceId: integer("service_id").notNull(),
  staffId: integer("staff_id"), // NUOVO: Collaboratore assegnato (optional)
  roomId: integer("room_id"), // NUOVO: Stanza/cabina assegnata (optional)
  packagePurchaseId: integer("package_purchase_id"), // NUOVO: Collegamento a pacchetto acquistato (optional, per funzionalità PRO)
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
  // Google Calendar sync columns
  synced: boolean("synced").default(false), // Traccia se l'appuntamento è stato sincronizzato con Google Calendar
  importedFromGoogle: boolean("imported_from_google").default(false), // Indica se l'appuntamento è stato importato da Google Calendar
  googleEventId: text("google_event_id"), // ID dell'evento in Google Calendar
  googleOrganizerSelf: boolean("google_organizer_self").default(true), // TRUE se siamo l'organizzatore, FALSE se siamo invitati (per eventi esterni)
  googleEventTitle: text("google_event_title"), // Titolo originale dell'evento Google (per preservare il nome durante la visualizzazione)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

// Booking Requests table schema - Per richieste appuntamento da parte dei clienti via PWA
export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Multi-tenant: professionista proprietario
  clientId: integer("client_id").notNull(), // Cliente che richiede l'appuntamento
  serviceId: integer("service_id").notNull(), // Servizio richiesto
  staffId: integer("staff_id"), // Optional: preferenza collaboratore
  roomId: integer("room_id"), // Optional: preferenza stanza/cabina
  requestedDate: text("requested_date").notNull(), // Data preferita (YYYY-MM-DD)
  requestedTimeStart: time("requested_time_start").notNull(), // Inizio fascia oraria preferita
  requestedTimeEnd: time("requested_time_end").notNull(), // Fine fascia oraria preferita
  proposedSlots: json("proposed_slots").$type<Array<{ start: string; end: string; staffId?: number; roomId?: number }>>(), // Array di slot proposti dal sistema
  selectedSlot: json("selected_slot").$type<{ start: string; end: string; staffId?: number; roomId?: number }>(), // Slot scelto dal cliente
  status: text("status").default("pending").notNull(), // pending, slots_proposed, client_selected, admin_confirmed, rejected, cancelled
  clientNotes: text("client_notes"), // Note/richieste del cliente
  adminNotes: text("admin_notes"), // Note dell'admin (es: motivo rifiuto)
  appointmentId: integer("appointment_id"), // ID appuntamento creato se confermato (nullable unique)
  channel: text("channel").default("pwa"), // Canale richiesta: pwa, web, phone
  selectionExpiresAt: timestamp("selection_expires_at"), // Scadenza per selezione cliente
  statusUpdatedAt: timestamp("status_updated_at"), // Ultimo cambio stato
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => ({
  // Indice composito per query veloci multi-tenant
  userStatusIdx: index("booking_requests_user_status_idx").on(table.userId, table.status, table.createdAt),
}));

export const insertBookingRequestSchema = createInsertSchema(bookingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  statusUpdatedAt: true,
});

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type InsertBookingRequest = z.infer<typeof insertBookingRequestSchema>;

// Staff/Collaboratori table schema
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Proprietario dello studio
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  specialization: text("specialization"), // Specializzazione del collaboratore
  iban: text("iban"), // IBAN per pagamenti commissioni
  bic: text("bic"), // BIC/SWIFT code (opzionale)
  bankName: text("bank_name"), // Nome banca (opzionale)
  accountHolder: text("account_holder"), // Intestatario conto
  isActive: boolean("is_active").default(true),
  resetToken: text("reset_token"), // Token per recupero password
  resetTokenExpiry: timestamp("reset_token_expiry"), // Scadenza token reset
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
});

// Treatment Rooms/Cabine table schema  
export const treatmentRooms = pgTable("treatment_rooms", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Proprietario dello studio
  name: text("name").notNull(), // Nome della stanza/cabina
  description: text("description"), // Descrizione optional
  color: text("color").default("#3f51b5"), // Colore per il calendario
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTreatmentRoomSchema = createInsertSchema(treatmentRooms).omit({
  id: true,
  createdAt: true,
});

// Marketing Messages table schema - Per messaggi WhatsApp delle campagne marketing
export const marketingMessages = pgTable("marketing_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Professionista che ha inviato la campagna
  clientId: integer("client_id").notNull(), // Cliente destinatario
  campaignName: text("campaign_name").notNull(), // Nome della campagna
  message: text("message").notNull(), // Testo del messaggio
  phone: text("phone").notNull(), // Numero WhatsApp del cliente
  status: text("status").default("pending"), // pending, sent, failed
  whatsappLink: text("whatsapp_link"), // Link wa.me generato
  sentAt: timestamp("sent_at"), // Quando il messaggio è stato inviato
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketingMessageSchema = createInsertSchema(marketingMessages).omit({
  id: true,
  createdAt: true,
});

// Marketing Campaigns table schema - Per salvare campagne con foto/video
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Professionista che ha creato la campagna
  title: text("title").notNull(), // Titolo campagna (es: "Sconto 30% Massaggi")
  message: text("message").notNull(), // Messaggio della campagna
  attachmentPaths: text("attachment_paths").array(), // Array di path dei file caricati (foto/video)
  attachmentTypes: text("attachment_types").array(), // Array di tipi: 'image' o 'video'
  uniqueCode: text("unique_code").notNull().unique(), // Codice univoco per link pubblico
  sentTo: integer("sent_to").default(0), // Numero clienti a cui è stata inviata
  status: text("status").notNull().default("pending"), // pending, locked, sending, sent, failed
  idempotencyKey: text("idempotency_key").notNull().unique(), // Hash univoco per prevenire duplicati
  sentAt: timestamp("sent_at"), // Quando è stata completata
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;

// User icons table schema - Per PWA personalizzate su Sliplane
export const userIcons = pgTable("user_icons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(), // Un'icona per utente
  iconBase64: text("icon_base64").notNull(), // Immagine in formato base64
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserIconSchema = createInsertSchema(userIcons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  
  // Colonne per gestione invio multicanale (PWA, Email, WhatsApp)
  publishedToPwa: boolean("published_to_pwa").default(false), // Flag: visibile nell'area clienti PWA
  pwaPublishedAt: timestamp("pwa_published_at"), // Quando è stata pubblicata sulla PWA
  sentViaEmail: boolean("sent_via_email").default(false), // Flag: inviata via email
  emailSentAt: timestamp("email_sent_at"), // Quando è stata inviata via email
  sentViaWhatsapp: boolean("sent_via_whatsapp").default(false), // Flag: inviata via WhatsApp
  whatsappSentAt: timestamp("whatsapp_sent_at"), // Quando è stata inviata via WhatsApp
  paidAt: timestamp("paid_at"), // Quando è stata segnata come pagata
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

// Package Templates - Modelli riutilizzabili di pacchetti promozionali (FUNZIONALITÀ PRO)
export const packageTemplates = pgTable("package_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Multi-tenant: proprietario del pacchetto
  name: text("name").notNull(), // es. "10 Trattamenti Viso Premium"
  description: text("description"), // Descrizione dettagliata
  serviceIds: integer("service_ids").array().notNull(), // Array di ID servizi inclusi (PSQL native array)
  totalSessions: integer("total_sessions").notNull(), // Numero totale di sedute/trattamenti
  price: integer("price").notNull(), // Prezzo totale in cents
  expirationDays: integer("expiration_days"), // Giorni di validità (nullable = nessuna scadenza)
  isActive: boolean("is_active").default(true), // Template attivo/disattivo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => ({
  // Indice composito per isolamento multi-tenant
  userIdIdx: index("package_templates_user_id_idx").on(table.userId),
}));

export const insertPackageTemplateSchema = createInsertSchema(packageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Package Purchases - Pacchetti venduti ai clienti (istanze)
export const packagePurchases = pgTable("package_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Multi-tenant: professionista
  templateId: integer("template_id").notNull(), // Riferimento al template
  clientId: integer("client_id").notNull(), // Cliente che ha acquistato
  invoiceId: integer("invoice_id"), // Collegamento fattura (nullable)
  purchaseDate: text("purchase_date").notNull(), // Data acquisto YYYY-MM-DD
  sessionsTotal: integer("sessions_total").notNull(), // Totale sedute acquistate
  sessionsRemaining: integer("sessions_remaining").notNull(), // Sedute rimanenti
  status: text("status").default("active").notNull(), // active, expired, refunded, completed
  expiresAt: text("expires_at"), // Data scadenza YYYY-MM-DD (nullable)
  notes: text("notes"), // Note del professionista
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"), // Quando tutte le sedute sono state consumate
}, (table) => ({
  // Indici compositi per isolamento multi-tenant e performance
  userIdIdx: index("package_purchases_user_id_idx").on(table.userId),
  clientIdIdx: index("package_purchases_client_id_idx").on(table.clientId),
  statusIdx: index("package_purchases_status_idx").on(table.status),
}));

export const insertPackagePurchaseSchema = createInsertSchema(packagePurchases).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Package Redemptions - Log utilizzi pacchetti (quale appuntamento ha consumato quale seduta)
export const packageRedemptions = pgTable("package_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Multi-tenant: professionista
  purchaseId: integer("purchase_id").notNull(), // Riferimento al pacchetto acquistato
  appointmentId: integer("appointment_id").notNull(), // Appuntamento che ha consumato la seduta
  sessionNumber: integer("session_number").notNull(), // Numero progressivo seduta (1, 2, 3...)
  redeemedAt: timestamp("redeemed_at").defaultNow(), // Quando è stata utilizzata
  performedBy: integer("performed_by"), // Staff che ha eseguito il trattamento (nullable)
  notes: text("notes"), // Note sul trattamento
}, (table) => ({
  // Indici per isolamento multi-tenant e ricerche
  userIdIdx: index("package_redemptions_user_id_idx").on(table.userId),
  purchaseIdIdx: index("package_redemptions_purchase_id_idx").on(table.purchaseId),
  appointmentIdIdx: index("package_redemptions_appointment_id_idx").on(table.appointmentId),
}));

export const insertPackageRedemptionSchema = createInsertSchema(packageRedemptions).omit({
  id: true,
  redeemedAt: true,
});

// Users table schema (staff/admin users)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").default("staff").notNull(), // admin, staff, client
  clientId: integer("client_id"), // Solo per utenti di tipo client
  type: text("type").default("staff").notNull(), // staff, client
  assignmentCode: text("assignment_code"), // Codice per assegnare clienti a questo account
  referralCode: text("referral_code"), // Codice referral per commissioni tra professionisti
  referredBy: integer("referred_by"), // ID dell'utente sponsor che ha invitato questo utente
  iban: text("iban"), // IBAN per pagamenti commissioni staff
  bic: text("bic"), // BIC/SWIFT code (opzionale)
  bankName: text("bank_name"), // Nome banca (opzionale)
  accountHolder: text("account_holder"), // Intestatario conto
  paypalEmail: text("paypal_email"), // Email PayPal per ricevere payout commissioni
  autoPayoutEnabled: boolean("auto_payout_enabled").default(true), // Abilita payout automatico PayPal
  resetToken: text("reset_token"), // Token per recupero password
  resetTokenExpiry: timestamp("reset_token_expiry"), // Scadenza token reset
  googleAuthToken: text("google_auth_token"), // Token OAuth di Google per Calendar/Gmail (encrypted)
  googleContactsToken: text("google_contacts_token"), // Token OAuth separato per Contatti Google (encrypted)
  googleCalendarEnabled: boolean("google_calendar_enabled").default(false), // Sincronizzazione Google Calendar abilitata
  googleCalendarId: text("google_calendar_id"), // ID del calendario Google (default "primary")
  lastGoogleSyncAt: timestamp("last_google_sync_at"), // Ultima sincronizzazione con Google Calendar
  termsAcceptedAt: timestamp("terms_accepted_at"), // Data e ora accettazione Termini di Servizio
  hideWelcomeGuide: boolean("hide_welcome_guide").default(false),
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
  imagePaths: json("image_paths").$type<string[]>(), // Array di percorsi foto (es. progressi trattamenti)
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
  syncDirection: text("sync_direction").default("export"), // export = created in app, import = from Google
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

// Google Calendar Sync Tokens - Per sincronizzazione incrementale veloce
export const googleCalendarSyncTokens = pgTable("google_calendar_sync_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  calendarId: text("calendar_id").notNull(), // ID del calendario Google
  calendarName: text("calendar_name"), // Nome leggibile del calendario
  syncToken: text("sync_token"), // Token per sync incrementale
  lastFullSyncAt: timestamp("last_full_sync_at"), // Ultima sync completa
  lastIncrementalSyncAt: timestamp("last_incremental_sync_at"), // Ultima sync incrementale
  eventCount: integer("event_count").default(0), // Numero eventi sincronizzati
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGoogleCalendarSyncTokenSchema = createInsertSchema(googleCalendarSyncTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GoogleCalendarSyncToken = typeof googleCalendarSyncTokens.$inferSelect;
export type InsertGoogleCalendarSyncToken = z.infer<typeof insertGoogleCalendarSyncTokenSchema>;

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
  
  // Configurazioni SMTP (per notifiche e campagne)
  smtpEnabled: boolean("smtp_enabled").default(false),
  smtpEmail: text("smtp_email"),
  smtpPasswordEncrypted: text("smtp_password_encrypted"),
  smtpServer: text("smtp_server").default("smtp.gmail.com"),
  smtpPort: integer("smtp_port").default(587),
  emailTemplate: text("email_template"),
  emailSubject: text("email_subject"),
  
  // Configurazioni SMS/WhatsApp
  smsEnabled: boolean("sms_enabled").default(false),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  whatsappNumber: text("whatsapp_number"),
  whatsappApiKey: text("whatsapp_api_key"),
  whatsappTemplate: text("whatsapp_template"),
  
  // Impostazioni Appuntamenti
  workingHoursStart: time("working_hours_start").default("08:00"),
  workingHoursEnd: time("working_hours_end").default("22:00"),
  workingDays: json("working_days").$type<string[]>().default(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]),
  lunchBreakEnabled: boolean("lunch_break_enabled").default(false),
  lunchBreakStart: time("lunch_break_start").default("13:00"),
  lunchBreakEnd: time("lunch_break_end").default("14:00"),
  dailySchedule: json("daily_schedule").$type<Record<string, { enabled: boolean; start: string; end: string; lunchEnabled: boolean; lunchStart: string; lunchEnd: string }>>(),
  holidaysEnabled: boolean("holidays_enabled").default(false),
  holidaysCountry: text("holidays_country").default("IT"),
  timeSlotDuration: integer("time_slot_duration").default(30),
  
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
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type TreatmentRoom = typeof treatmentRooms.$inferSelect;
export type InsertTreatmentRoom = z.infer<typeof insertTreatmentRoomSchema>;

export type MarketingMessage = typeof marketingMessages.$inferSelect;
export type InsertMarketingMessage = z.infer<typeof insertMarketingMessageSchema>;

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

export type PackageTemplate = typeof packageTemplates.$inferSelect;
export type InsertPackageTemplate = z.infer<typeof insertPackageTemplateSchema>;

export type PackagePurchase = typeof packagePurchases.$inferSelect;
export type InsertPackagePurchase = z.infer<typeof insertPackagePurchaseSchema>;

export type PackageRedemption = typeof packageRedemptions.$inferSelect;
export type InsertPackageRedemption = z.infer<typeof insertPackageRedemptionSchema>;

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

// Product Inventory System for PRO subscription
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Multi-tenant support
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3f51b5"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Multi-tenant support
  categoryId: integer("category_id").references(() => productCategories.id),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"), // Stock Keeping Unit
  barcode: text("barcode"),
  price: integer("price"), // in cents
  cost: integer("cost"), // in cents (purchase cost)
  currentStock: integer("current_stock").default(0),
  minStock: integer("min_stock").default(0), // Minimum stock alert threshold
  maxStock: integer("max_stock"), // Maximum stock capacity
  unit: text("unit").default("pz"), // Unit of measurement (pz, kg, l, etc.)
  supplier: text("supplier"),
  supplierContact: text("supplier_contact"),
  expirationDate: date("expiration_date"),
  location: text("location"), // Storage location
  imagePath: text("image_path"), // Product thumbnail image
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Multi-tenant support
  productId: integer("product_id").notNull().references(() => products.id),
  movementType: text("movement_type").notNull(), // 'IN', 'OUT', 'ADJUSTMENT', 'SALE', 'WASTE'
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price"), // in cents
  totalValue: integer("total_value"), // in cents
  reason: text("reason"),
  reference: text("reference"), // Invoice number, order number, etc.
  staffMember: text("staff_member"), // Who performed the movement
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productSales = pgTable("product_sales", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Multi-tenant support
  productId: integer("product_id").notNull().references(() => products.id),
  clientId: integer("client_id").references(() => clients.id),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // in cents
  totalAmount: integer("total_amount").notNull(), // in cents
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  finalAmount: integer("final_amount").notNull(), // in cents after discount
  saleDate: timestamp("sale_date").defaultNow(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  staffMember: text("staff_member"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertProductSaleSchema = createInsertSchema(productSales).omit({
  id: true,
  userId: true,
  createdAt: true,
});

// Types
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

export type ProductSale = typeof productSales.$inferSelect;
export type InsertProductSale = z.infer<typeof insertProductSaleSchema>;

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

export const packageTemplatesRelations = relations(packageTemplates, ({ many }) => ({
  purchases: many(packagePurchases),
}));

export const packagePurchasesRelations = relations(packagePurchases, ({ one, many }) => ({
  template: one(packageTemplates, {
    fields: [packagePurchases.templateId],
    references: [packageTemplates.id],
  }),
  client: one(clients, {
    fields: [packagePurchases.clientId],
    references: [clients.id],
  }),
  invoice: one(invoices, {
    fields: [packagePurchases.invoiceId],
    references: [invoices.id],
  }),
  redemptions: many(packageRedemptions),
  appointments: many(appointments),
}));

export const packageRedemptionsRelations = relations(packageRedemptions, ({ one }) => ({
  purchase: one(packagePurchases, {
    fields: [packageRedemptions.purchaseId],
    references: [packagePurchases.id],
  }),
  appointment: one(appointments, {
    fields: [packageRedemptions.appointmentId],
    references: [appointments.id],
  }),
  staff: one(users, {
    fields: [packageRedemptions.performedBy],
    references: [users.id],
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
  client?: Client;
  service?: Service;
  staff?: Staff;
  room?: TreatmentRoom;
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
  trialNotificationSent: boolean("trial_notification_sent").default(false), // Flag per notifica 10gg prima scadenza
  trialNotificationSentAt: timestamp("trial_notification_sent_at"), // Data invio notifica trial
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
  payoutScheduledDate: timestamp("payout_scheduled_date"), // Data programmata payout (30gg dopo startDate)
  payoutDate: timestamp("payout_date"), // Data effettiva payout
  payoutTransactionId: text("payout_transaction_id"), // ID transazione PayPal/bancaria
  payoutStatus: text("payout_status").default("pending"), // pending, scheduled, completed, failed, manual
  payoutMethod: text("payout_method"), // paypal, bank_transfer, manual
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

// Referral Payments table schema - Pagamenti commissioni referral
export const referralPayments = pgTable("referral_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // ID dell'utente che riceve il pagamento
  period: text("period").notNull(), // Periodo di riferimento (es. "2025-10")
  amount: integer("amount").notNull(), // Importo in centesimi
  status: text("status").default("pending").notNull(), // pending, processing, completed, failed
  bankAccountId: integer("bank_account_id"), // ID del conto bancario
  processingDate: timestamp("processing_date"), // Data elaborazione pagamento
  processingNote: text("processing_note"), // Note sull'elaborazione
  paymentReference: text("payment_reference"), // Riferimento transazione bancaria/PayPal
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReferralPaymentSchema = createInsertSchema(referralPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ReferralPayment = typeof referralPayments.$inferSelect;
export type InsertReferralPayment = z.infer<typeof insertReferralPaymentSchema>;

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

// Contact Settings - Configurazione semplice telefono/email per notifiche (sostituisce verifica SMS)
export const contactSettings = pgTable("contact_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  phone: varchar("phone", { length: 20 }), // Numero di telefono per WhatsApp
  email: varchar("email", { length: 255 }), // Email per invio notifiche
  businessName: varchar("business_name", { length: 255 }), // Nome dell'attività
  whatsappOptIn: boolean("whatsapp_opt_in").default(false), // WhatsApp attivo
  emailEnabled: boolean("email_enabled").default(false), // Email attiva
  isConfigured: boolean("is_configured").default(false), // Setup completato
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContactSettingsSchema = createInsertSchema(contactSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ContactSettings = typeof contactSettings.$inferSelect;
export type InsertContactSettings = z.infer<typeof insertContactSettingsSchema>;

// Currency Settings - Impostazioni valuta per ogni utente
export const currencySettings = pgTable("currency_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"), // EUR, CHF, USD, RUB, GBP, JPY, etc.
  symbol: varchar("symbol", { length: 10 }).notNull().default("€"), // €, CHF, $, ₽, £, ¥, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCurrencySettingsSchema = createInsertSchema(currencySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CurrencySettings = typeof currencySettings.$inferSelect;
export type InsertCurrencySettings = z.infer<typeof insertCurrencySettingsSchema>;

// Payment Methods Configuration - Configurazione globale metodi di pagamento (Stripe, PayPal, Wise, Bonifico)
export const paymentMethodsConfig = pgTable("payment_methods_config", {
  id: serial("id").primaryKey(),
  methodId: varchar("method_id", { length: 50 }).notNull().unique(), // stripe, paypal, wise, bank
  name: varchar("name", { length: 255 }).notNull(), // Nome metodo
  enabled: boolean("enabled").notNull().default(false),
  config: json("config").notNull().$type<Record<string, any>>(), // Salva l'intero JSON config
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentMethodsConfigSchema = createInsertSchema(paymentMethodsConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PaymentMethodsConfig = typeof paymentMethodsConfig.$inferSelect;
export type InsertPaymentMethodsConfig = z.infer<typeof insertPaymentMethodsConfigSchema>;

// Email Calendar Settings - Impostazioni email e calendario per ogni utente
export const emailCalendarSettings = pgTable("email_calendar_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  emailEnabled: boolean("email_enabled").notNull().default(false),
  emailAddress: varchar("email_address", { length: 255 }),
  emailPassword: text("email_password"), // Encrypted
  emailTemplate: text("email_template"),
  emailSubject: varchar("email_subject", { length: 255 }),
  calendarEnabled: boolean("calendar_enabled").notNull().default(false),
  calendarId: varchar("calendar_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailCalendarSettingsSchema = createInsertSchema(emailCalendarSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmailCalendarSettings = typeof emailCalendarSettings.$inferSelect;
export type InsertEmailCalendarSettings = z.infer<typeof insertEmailCalendarSettingsSchema>;

// Contact Info - Informazioni di contatto per ogni utente
export const contactInfo = pgTable("contact_info", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  email: varchar("email", { length: 255 }),
  phone1: varchar("phone1", { length: 20 }),
  phone2: varchar("phone2", { length: 20 }),
  website: varchar("website", { length: 255 }),
  facebook: varchar("facebook", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContactInfoSchema = createInsertSchema(contactInfo).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ContactInfo = typeof contactInfo.$inferSelect;
export type InsertContactInfo = z.infer<typeof insertContactInfoSchema>;

// Manual Content - Sistema gestione manuale interattivo con media
export const manualContent = pgTable("manual_content", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // Per condivisione multi-tenant
  section: varchar("section", { length: 100 }).notNull(), // 'intro', 'appointments', 'clients', 'billing', etc.
  locale: varchar("locale", { length: 5 }).notNull().default("it"), // 'it', 'en', 'de', etc.
  title: text("title").notNull(),
  steps: json("steps").notNull(), // Array di step: [{ stepNumber, title, content, mediaFiles: [{type, url, caption}], highlights: [{text, color}] }]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    ownerSectionLocaleIdx: index("manual_owner_section_locale_idx").on(table.ownerId, table.section, table.locale),
  };
});

// Schema di validazione Zod per ManualStep
const manualMediaSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string(),
  caption: z.string().optional(),
});

const manualHighlightSchema = z.object({
  text: z.string(),
  color: z.string(),
});

const manualStepSchema = z.object({
  stepNumber: z.number(),
  title: z.string(),
  content: z.string(),
  mediaFiles: z.array(manualMediaSchema).optional(),
  highlights: z.array(manualHighlightSchema).optional(),
});

export const insertManualContentSchema = createInsertSchema(manualContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  steps: z.array(manualStepSchema),
});

export type ManualContent = typeof manualContent.$inferSelect;
export type InsertManualContent = z.infer<typeof insertManualContentSchema>;
export type ManualStep = z.infer<typeof manualStepSchema>;
export type ManualMedia = z.infer<typeof manualMediaSchema>;
export type ManualHighlight = z.infer<typeof manualHighlightSchema>;

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

// User Login Tracking - Tracciamento accessi utenti
export const userLogins = pgTable("user_logins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  loginAt: timestamp("login_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => ({
  userIdIdx: index("user_logins_user_id_idx").on(table.userId),
  loginAtIdx: index("user_logins_login_at_idx").on(table.loginAt),
}));

export const insertUserLoginSchema = createInsertSchema(userLogins).omit({
  id: true,
  loginAt: true,
});

export type UserLogin = typeof userLogins.$inferSelect;
export type InsertUserLogin = z.infer<typeof insertUserLoginSchema>;

// User Logins Relations
export const userLoginsRelations = relations(userLogins, ({ one }) => ({
  user: one(users, {
    fields: [userLogins.userId],
    references: [users.id],
  }),
}));

// Push Subscriptions - Subscriptions per notifiche push PWA ai clienti
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(), // Cliente che ha attivato le notifiche
  ownerId: integer("owner_id").notNull(), // Multi-tenant: professionista proprietario
  endpoint: text("endpoint").notNull(), // URL endpoint per push notification
  p256dh: text("p256dh").notNull(), // Chiave pubblica del client
  auth: text("auth").notNull(), // Chiave di autenticazione
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: index("push_sub_client_idx").on(table.clientId),
  ownerIdx: index("push_sub_owner_idx").on(table.ownerId),
  endpointIdx: index("push_sub_endpoint_idx").on(table.endpoint),
}));

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// Push Subscriptions Relations
export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  client: one(clients, {
    fields: [pushSubscriptions.clientId],
    references: [clients.id],
  }),
}));