import { pgTable, text, serial, integer, boolean, timestamp, time, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  consentText: text("consent_text").notNull(),
  signature: text("signature"),
  signedAt: timestamp("signed_at").defaultNow(),
});

export const insertConsentSchema = createInsertSchema(consents).omit({
  id: true,
  signedAt: true,
});

// Define types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Consent = typeof consents.$inferSelect;
export type InsertConsent = z.infer<typeof insertConsentSchema>;

// Extended types for frontend use
export type AppointmentWithDetails = Appointment & {
  client: Client;
  service: Service;
};

export type ClientWithAppointments = Client & {
  appointments: AppointmentWithDetails[];
};

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

// Export types for invoices and payments
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Extended types for frontend use
export type InvoiceWithDetails = Invoice & {
  client: Client;
  items: (InvoiceItem & { service?: Service })[];
  payments: Payment[];
};

export type InvoiceItemWithDetails = InvoiceItem & {
  service?: Service;
  appointment?: Appointment;
};
