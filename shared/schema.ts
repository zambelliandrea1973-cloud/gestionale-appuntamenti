import { pgTable, text, serial, integer, boolean, timestamp, time } from "drizzle-orm/pg-core";
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
