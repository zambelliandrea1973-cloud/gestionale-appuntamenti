import * as fs from 'fs';
import { 
  clients, type Client, type InsertClient,
  services, type Service, type InsertService,
  appointments, type Appointment, type InsertAppointment,
  consents, type Consent, type InsertConsent,
  invoices, type Invoice, type InsertInvoice, 
  invoiceItems, type InvoiceItem, type InsertInvoiceItem,
  payments, type Payment, type InsertPayment,
  users, type User, type InsertUser,
  clientAccounts, type ClientAccount, type InsertClientAccount,
  notifications, type Notification, type InsertNotification,
  activationTokens, type ActivationToken, type InsertActivationToken,
  clientNotes, type ClientNote, type InsertClientNote,
  googleCalendarEvents, type GoogleCalendarEvent, type InsertGoogleCalendarEvent,
  googleCalendarSettings, type GoogleCalendarSettings, type InsertGoogleCalendarSettings,
  notificationSettings, type NotificationSettings, type InsertNotificationSettings,
  reminderTemplates, type ReminderTemplate, type InsertReminderTemplate,
  appSettings, type AppSettings, type InsertAppSettings,
  betaInvitations, type BetaInvitation, type InsertBetaInvitation,
  betaFeedback, type BetaFeedback, type InsertBetaFeedback,
  subscriptionPlans, type SubscriptionPlan, type InsertSubscriptionPlan,
  subscriptions, type Subscription, type InsertSubscription,
  paymentMethods, type PaymentMethod, type InsertPaymentMethod,
  paymentTransactions, type PaymentTransaction, type InsertPaymentTransaction,
  type AppointmentWithDetails,
  type ClientWithAppointments,
  type InvoiceWithDetails,
  type InvoiceItemWithDetails,
  type SubscriptionWithDetails,
  type BetaFeedbackWithUserDetails
} from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { db } from "./db";
import { eq, desc, and, gte, lte, like, or, sql, ne, asc } from 'drizzle-orm';

// Interface defining all storage operations
export interface IStorage {
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
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
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Appointment operations
  getAppointment(id: number): Promise<AppointmentWithDetails | undefined>;
  getAppointments(): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDate(date: string): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<AppointmentWithDetails[]>;
  getAppointmentsByClient(clientId: number): Promise<AppointmentWithDetails[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  
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
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
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
  
  // Activation token operations
  createActivationToken(token: InsertActivationToken): Promise<ActivationToken>;
  getActivationToken(token: string): Promise<ActivationToken | undefined>;
  updateActivationToken(token: string, data: Partial<InsertActivationToken>): Promise<ActivationToken | undefined>;
  
  // Client Notes operations
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
  getSetting(key: string): Promise<AppSettings | undefined>;
  getAllSettings(): Promise<AppSettings[]>;
  getSettingsByCategory(category: string): Promise<AppSettings[]>;
  saveSetting(key: string, value: string, description?: string, category?: string): Promise<AppSettings>;
  updateSetting(id: number, setting: Partial<InsertAppSettings>): Promise<AppSettings | undefined>;
  deleteSetting(id: number): Promise<boolean>;
  
  // Notification Settings operations
  getNotificationSettings(): Promise<NotificationSettings | undefined>;
  saveNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings>;
  updateNotificationSettings(id: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings | undefined>;
  
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
}

// In-memory implementation of the storage interface with file persistence
export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private services: Map<number, Service>;
  private appointments: Map<number, Appointment>;
  private consents: Map<number, Consent>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem>;
  private payments: Map<number, Payment>;
  private betaInvitations: Map<number, BetaInvitation>;
  private betaFeedback: Map<number, BetaFeedback>;
  
  private clientIdCounter: number;
  private serviceIdCounter: number;
  private appointmentIdCounter: number;
  private consentIdCounter: number;
  private invoiceIdCounter: number;
  private invoiceItemIdCounter: number;
  private paymentIdCounter: number;
  private betaInvitationIdCounter: number;
  private betaFeedbackIdCounter: number;
  
  private dataFile: string;
  
  constructor() {
    // Definiamo la posizione in cui salvare i dati
    this.dataFile = `./storage_data.json`;
    
    try {
      // Verifica se esiste un file di storage
      if (fs.existsSync(this.dataFile)) {
        // Carica i dati dal file
        const rawData = fs.readFileSync(this.dataFile, 'utf-8');
        const data = JSON.parse(rawData);
        
        // Restore maps from the saved data
        this.clients = new Map(data.clients);
        this.services = new Map(data.services);
        this.appointments = new Map(data.appointments);
        this.consents = new Map(data.consents);
        
        // Restore invoice related maps if they exist in the saved data
        this.invoices = data.invoices ? new Map(data.invoices) : new Map();
        this.invoiceItems = data.invoiceItems ? new Map(data.invoiceItems) : new Map();
        this.payments = data.payments ? new Map(data.payments) : new Map();
        
        // Restore beta related maps if they exist
        this.betaInvitations = data.betaInvitations ? new Map(data.betaInvitations) : new Map();
        this.betaFeedback = data.betaFeedback ? new Map(data.betaFeedback) : new Map();
        
        // Restore counters
        this.clientIdCounter = data.clientIdCounter;
        this.serviceIdCounter = data.serviceIdCounter;
        this.appointmentIdCounter = data.appointmentIdCounter;
        this.consentIdCounter = data.consentIdCounter;
        this.invoiceIdCounter = data.invoiceIdCounter || 1;
        this.invoiceItemIdCounter = data.invoiceItemIdCounter || 1;
        this.paymentIdCounter = data.paymentIdCounter || 1;
        this.betaInvitationIdCounter = data.betaInvitationIdCounter || 1;
        this.betaFeedbackIdCounter = data.betaFeedbackIdCounter || 1;
        
        console.log('Dati caricati dal file:', this.dataFile);
      } else {
        console.log('Nessun file di dati trovato, inizializzazione storage vuoto');
        // Initialize empty maps if no saved data
        this.clients = new Map();
        this.services = new Map();
        this.appointments = new Map();
        this.consents = new Map();
        this.invoices = new Map();
        this.invoiceItems = new Map();
        this.payments = new Map();
        this.betaInvitations = new Map();
        this.betaFeedback = new Map();
        
        this.clientIdCounter = 1;
        this.serviceIdCounter = 1;
        this.appointmentIdCounter = 1;
        this.consentIdCounter = 1;
        this.invoiceIdCounter = 1;
        this.invoiceItemIdCounter = 1;
        this.paymentIdCounter = 1;
        this.betaInvitationIdCounter = 1;
        this.betaFeedbackIdCounter = 1;
        
        // Initialize with default services
        this.initDefaultServices();
      }
    } catch (error) {
      console.error('Errore durante il caricamento dei dati, inizializzazione storage vuoto', error);
      // Initialize empty maps if loading fails
      this.clients = new Map();
      this.services = new Map();
      this.appointments = new Map();
      this.consents = new Map();
      this.invoices = new Map();
      this.invoiceItems = new Map();
      this.payments = new Map();
      this.betaInvitations = new Map();
      this.betaFeedback = new Map();
      
      this.clientIdCounter = 1;
      this.serviceIdCounter = 1;
      this.appointmentIdCounter = 1;
      this.consentIdCounter = 1;
      this.invoiceIdCounter = 1;
      this.invoiceItemIdCounter = 1;
      this.paymentIdCounter = 1;
      this.betaInvitationIdCounter = 1;
      this.betaFeedbackIdCounter = 1;
      
      // Initialize with default services
      this.initDefaultServices();
    }
  }
  
  // Save data to file
  private saveToStorage() {
    try {
      const data = {
        clients: Array.from(this.clients.entries()),
        services: Array.from(this.services.entries()),
        appointments: Array.from(this.appointments.entries()),
        consents: Array.from(this.consents.entries()),
        invoices: Array.from(this.invoices.entries()),
        invoiceItems: Array.from(this.invoiceItems.entries()),
        payments: Array.from(this.payments.entries()),
        betaInvitations: Array.from(this.betaInvitations.entries()),
        betaFeedback: Array.from(this.betaFeedback.entries()),
        clientIdCounter: this.clientIdCounter,
        serviceIdCounter: this.serviceIdCounter,
        appointmentIdCounter: this.appointmentIdCounter,
        consentIdCounter: this.consentIdCounter,
        invoiceIdCounter: this.invoiceIdCounter,
        invoiceItemIdCounter: this.invoiceItemIdCounter,
        paymentIdCounter: this.paymentIdCounter,
        betaInvitationIdCounter: this.betaInvitationIdCounter,
        betaFeedbackIdCounter: this.betaFeedbackIdCounter
      };
      
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log('Dati salvati su file:', this.dataFile);
    } catch (error) {
      console.error('Errore durante il salvataggio dei dati su file', error);
    }
  }
  
  private initDefaultServices() {
    const defaultServices: InsertService[] = [
      { name: "Test Diacom", duration: 60, color: "#3f51b5", price: 6000 },
      { name: "Terapia Bicom", duration: 90, color: "#f44336", price: 8000 },
      { name: "Terapia luce Zapter", duration: 60, color: "#ff9800", price: 7000 },
      { name: "Detox", duration: 75, color: "#4caf50", price: 5500 }
    ];
    
    defaultServices.forEach(service => {
      this.createService(service);
    });
  }
  
  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    const newClient: Client = { ...client, id, createdAt: new Date() };
    this.clients.set(id, newClient);
    this.saveToStorage();
    return newClient;
  }
  
  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) return undefined;
    
    const updatedClient: Client = { ...existingClient, ...client };
    this.clients.set(id, updatedClient);
    this.saveToStorage();
    return updatedClient;
  }
  
  async deleteClient(id: number): Promise<boolean> {
    const result = this.clients.delete(id);
    this.saveToStorage();
    return result;
  }
  
  // Service operations
  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }
  
  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }
  
  async createService(service: InsertService): Promise<Service> {
    const id = this.serviceIdCounter++;
    const newService: Service = { ...service, id };
    this.services.set(id, newService);
    this.saveToStorage();
    return newService;
  }
  
  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const existingService = this.services.get(id);
    if (!existingService) return undefined;
    
    const updatedService: Service = { ...existingService, ...service };
    this.services.set(id, updatedService);
    this.saveToStorage();
    return updatedService;
  }
  
  async deleteService(id: number): Promise<boolean> {
    const result = this.services.delete(id);
    this.saveToStorage();
    return result;
  }
  
  // Appointment operations
  async getAppointment(id: number): Promise<AppointmentWithDetails | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;
    
    const client = await this.getClient(appointment.clientId);
    const service = await this.getService(appointment.serviceId);
    
    if (!client || !service) return undefined;
    
    return { ...appointment, client, service };
  }
  
  async getAppointments(): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointments.values());
    const result: AppointmentWithDetails[] = [];
    
    for (const appointment of appointments) {
      const client = await this.getClient(appointment.clientId);
      const service = await this.getService(appointment.serviceId);
      
      if (client && service) {
        result.push({ ...appointment, client, service });
      }
    }
    
    return result;
  }
  
  async getAppointmentsByDate(date: string): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointments.values())
      .filter(appointment => appointment.date === date);
    
    const result: AppointmentWithDetails[] = [];
    
    for (const appointment of appointments) {
      const client = await this.getClient(appointment.clientId);
      const service = await this.getService(appointment.serviceId);
      
      if (client && service) {
        result.push({ ...appointment, client, service });
      }
    }
    
    return result;
  }
  
  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointments.values())
      .filter(appointment => {
        return appointment.date >= startDate && appointment.date <= endDate;
      });
    
    const result: AppointmentWithDetails[] = [];
    
    for (const appointment of appointments) {
      const client = await this.getClient(appointment.clientId);
      const service = await this.getService(appointment.serviceId);
      
      if (client && service) {
        result.push({ ...appointment, client, service });
      }
    }
    
    return result;
  }
  
  async getAppointmentsByClient(clientId: number): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointments.values())
      .filter(appointment => appointment.clientId === clientId);
    
    const result: AppointmentWithDetails[] = [];
    
    for (const appointment of appointments) {
      const client = await this.getClient(appointment.clientId);
      const service = await this.getService(appointment.serviceId);
      
      if (client && service) {
        result.push({ ...appointment, client, service });
      }
    }
    
    return result;
  }
  
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    console.log("Creazione appuntamento con dati:", JSON.stringify(appointment));
    
    const id = this.appointmentIdCounter++;
    
    // Calcoliamo l'orario di fine in base al servizio selezionato
    let endTime = appointment.endTime;
    
    // Se non è specificato l'endTime, calcoliamolo in base alla durata del servizio
    if (!endTime) {
      try {
        // Otteniamo il servizio per conoscere la durata
        const service = await this.getService(appointment.serviceId);
        
        if (service) {
          // Calcoliamo l'orario di fine in base alla durata del servizio
          const [hours, minutes] = appointment.startTime.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const endMinutes = startMinutes + service.duration;
          
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          
          endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
          console.log(`Calcolato orario di fine: ${endTime} per servizio con durata ${service.duration} minuti`);
        }
      } catch (error) {
        console.error("Errore durante il calcolo dell'orario di fine:", error);
        // Se c'è un errore, mettiamo un'ora di default come durata
        endTime = appointment.startTime;
      }
    }
    
    // Se non è specificato lo status, impostiamolo a "scheduled"
    const status = appointment.status || 'scheduled';
    
    // Se non sono specificate le note, impostiamole a stringa vuota
    const notes = appointment.notes || '';
    
    const newAppointment: Appointment = { 
      ...appointment, 
      id, 
      endTime: endTime || appointment.startTime, // Fallback in caso di errore
      status,
      notes,
      createdAt: new Date()
    };
    
    console.log("Nuovo appuntamento creato:", JSON.stringify(newAppointment));
    
    this.appointments.set(id, newAppointment);
    this.saveToStorage();
    return newAppointment;
  }
  
  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const existingAppointment = this.appointments.get(id);
    if (!existingAppointment) return undefined;
    
    const updatedAppointment: Appointment = { ...existingAppointment, ...appointment };
    this.appointments.set(id, updatedAppointment);
    this.saveToStorage();
    return updatedAppointment;
  }
  
  async deleteAppointment(id: number): Promise<boolean> {
    const result = this.appointments.delete(id);
    this.saveToStorage();
    return result;
  }
  
  // Consent operations
  async getConsent(id: number): Promise<Consent | undefined> {
    return this.consents.get(id);
  }
  
  async getConsentByClient(clientId: number): Promise<Consent | undefined> {
    return Array.from(this.consents.values())
      .find(consent => consent.clientId === clientId);
  }
  
  async createConsent(consent: InsertConsent): Promise<Consent> {
    const id = this.consentIdCounter++;
    const newConsent: Consent = { ...consent, id, signedAt: new Date() };
    this.consents.set(id, newConsent);
    this.saveToStorage();
    
    // Update client to mark that they have consent
    const client = await this.getClient(consent.clientId);
    if (client) {
      await this.updateClient(client.id, { hasConsent: true });
    }
    
    return newConsent;
  }
  
  // Special operations
  async getClientWithAppointments(clientId: number): Promise<ClientWithAppointments | undefined> {
    const client = await this.getClient(clientId);
    if (!client) return undefined;
    
    const appointments = await this.getAppointmentsByClient(clientId);
    return { ...client, appointments };
  }
  
  async searchClients(query: string): Promise<Client[]> {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.clients.values()).filter(client => {
      return (
        client.firstName.toLowerCase().includes(lowerQuery) ||
        client.lastName.toLowerCase().includes(lowerQuery) ||
        client.phone.includes(query) ||
        (client.email && client.email.toLowerCase().includes(lowerQuery))
      );
    });
  }
  
  // Funzione per generare un nuovo numero di fattura
  async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear().toString().padStart(4, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const index = this.invoiceIdCounter.toString().padStart(4, '0');
    
    return `INV-${year}${month}-${index}`;
  }
  
  // Invoice operations
  async getInvoice(id: number): Promise<InvoiceWithDetails | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const client = await this.getClient(invoice.clientId);
    if (!client) return undefined;
    
    const items = await this.getInvoiceItemsByInvoice(id);
    const payments = await this.getPaymentsByInvoice(id);
    
    return { ...invoice, client, items, payments };
  }
  
  async getInvoices(): Promise<InvoiceWithDetails[]> {
    const invoices = Array.from(this.invoices.values());
    const result: InvoiceWithDetails[] = [];
    
    for (const invoice of invoices) {
      const client = await this.getClient(invoice.clientId);
      if (!client) continue;
      
      const items = await this.getInvoiceItemsByInvoice(invoice.id);
      const payments = await this.getPaymentsByInvoice(invoice.id);
      
      result.push({ ...invoice, client, items, payments });
    }
    
    return result;
  }
  
  async getInvoicesByClient(clientId: number): Promise<InvoiceWithDetails[]> {
    const invoices = Array.from(this.invoices.values())
      .filter(invoice => invoice.clientId === clientId);
    
    const result: InvoiceWithDetails[] = [];
    
    for (const invoice of invoices) {
      const client = await this.getClient(invoice.clientId);
      if (!client) continue;
      
      const items = await this.getInvoiceItemsByInvoice(invoice.id);
      const payments = await this.getPaymentsByInvoice(invoice.id);
      
      result.push({ ...invoice, client, items, payments });
    }
    
    return result;
  }
  
  async getInvoicesByDateRange(startDate: string, endDate: string): Promise<InvoiceWithDetails[]> {
    const invoices = Array.from(this.invoices.values())
      .filter(invoice => invoice.date >= startDate && invoice.date <= endDate);
    
    const result: InvoiceWithDetails[] = [];
    
    for (const invoice of invoices) {
      const client = await this.getClient(invoice.clientId);
      if (!client) continue;
      
      const items = await this.getInvoiceItemsByInvoice(invoice.id);
      const payments = await this.getPaymentsByInvoice(invoice.id);
      
      result.push({ ...invoice, client, items, payments });
    }
    
    return result;
  }
  
  async getInvoicesByStatus(status: string): Promise<InvoiceWithDetails[]> {
    const invoices = Array.from(this.invoices.values())
      .filter(invoice => invoice.status === status);
    
    const result: InvoiceWithDetails[] = [];
    
    for (const invoice of invoices) {
      const client = await this.getClient(invoice.clientId);
      if (!client) continue;
      
      const items = await this.getInvoiceItemsByInvoice(invoice.id);
      const payments = await this.getPaymentsByInvoice(invoice.id);
      
      result.push({ ...invoice, client, items, payments });
    }
    
    return result;
  }
  
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceIdCounter++;
    // Se non è stato fornito un numero di fattura, ne generiamo uno
    if (!invoice.invoiceNumber) {
      invoice.invoiceNumber = await this.generateInvoiceNumber();
    }
    
    const newInvoice: Invoice = { 
      ...invoice, 
      id, 
      createdAt: new Date()
    };
    
    this.invoices.set(id, newInvoice);
    this.saveToStorage();
    return newInvoice;
  }
  
  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existingInvoice = this.invoices.get(id);
    if (!existingInvoice) return undefined;
    
    const updatedInvoice: Invoice = { ...existingInvoice, ...invoice };
    this.invoices.set(id, updatedInvoice);
    this.saveToStorage();
    return updatedInvoice;
  }
  
  async deleteInvoice(id: number): Promise<boolean> {
    // Eliminiamo anche tutti gli elementi associati alla fattura
    const invoiceItems = Array.from(this.invoiceItems.values())
      .filter(item => item.invoiceId === id);
    
    for (const item of invoiceItems) {
      this.invoiceItems.delete(item.id);
    }
    
    // Eliminiamo anche tutti i pagamenti associati alla fattura
    const payments = Array.from(this.payments.values())
      .filter(payment => payment.invoiceId === id);
    
    for (const payment of payments) {
      this.payments.delete(payment.id);
    }
    
    const result = this.invoices.delete(id);
    this.saveToStorage();
    return result;
  }
  
  // Invoice Item operations
  async getInvoiceItem(id: number): Promise<InvoiceItemWithDetails | undefined> {
    const item = this.invoiceItems.get(id);
    if (!item) return undefined;
    
    let service: Service | undefined;
    let appointment: Appointment | undefined;
    
    if (item.serviceId) {
      service = await this.getService(item.serviceId);
    }
    
    if (item.appointmentId) {
      appointment = this.appointments.get(item.appointmentId);
    }
    
    return { ...item, service, appointment };
  }
  
  async getInvoiceItemsByInvoice(invoiceId: number): Promise<InvoiceItemWithDetails[]> {
    const items = Array.from(this.invoiceItems.values())
      .filter(item => item.invoiceId === invoiceId);
    
    const result: InvoiceItemWithDetails[] = [];
    
    for (const item of items) {
      let service: Service | undefined;
      let appointment: Appointment | undefined;
      
      if (item.serviceId) {
        service = await this.getService(item.serviceId);
      }
      
      if (item.appointmentId) {
        appointment = this.appointments.get(item.appointmentId);
      }
      
      result.push({ ...item, service, appointment });
    }
    
    return result;
  }
  
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = this.invoiceItemIdCounter++;
    const newItem: InvoiceItem = { ...item, id };
    
    this.invoiceItems.set(id, newItem);
    this.saveToStorage();
    
    // Aggiorniamo il totale della fattura
    const invoice = this.invoices.get(item.invoiceId);
    if (invoice) {
      const totalAmount = invoice.totalAmount + (item.unitPrice * item.quantity);
      this.updateInvoice(invoice.id, { totalAmount });
    }
    
    return newItem;
  }
  
  async updateInvoiceItem(id: number, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const existingItem = this.invoiceItems.get(id);
    if (!existingItem) return undefined;
    
    // Salviamo il vecchio prezzo unitario e la quantità per ricalcolare il totale della fattura
    const oldPrice = existingItem.unitPrice;
    const oldQuantity = existingItem.quantity;
    
    const updatedItem: InvoiceItem = { ...existingItem, ...item };
    this.invoiceItems.set(id, updatedItem);
    this.saveToStorage();
    
    // Aggiorniamo il totale della fattura se il prezzo o la quantità sono stati modificati
    if (item.unitPrice !== undefined || item.quantity !== undefined) {
      const invoice = this.invoices.get(existingItem.invoiceId);
      if (invoice) {
        const oldTotal = oldPrice * oldQuantity;
        const newTotal = updatedItem.unitPrice * updatedItem.quantity;
        const totalAmount = invoice.totalAmount - oldTotal + newTotal;
        this.updateInvoice(invoice.id, { totalAmount });
      }
    }
    
    return updatedItem;
  }
  
  async deleteInvoiceItem(id: number): Promise<boolean> {
    const item = this.invoiceItems.get(id);
    if (!item) return false;
    
    // Aggiorniamo il totale della fattura
    const invoice = this.invoices.get(item.invoiceId);
    if (invoice) {
      const totalAmount = invoice.totalAmount - (item.unitPrice * item.quantity);
      this.updateInvoice(invoice.id, { totalAmount });
    }
    
    const result = this.invoiceItems.delete(id);
    this.saveToStorage();
    return result;
  }
  
  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getPaymentsByInvoice(invoiceId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.invoiceId === invoiceId);
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const newPayment: Payment = { 
      ...payment, 
      id, 
      createdAt: new Date()
    };
    
    this.payments.set(id, newPayment);
    
    // Aggiorniamo lo stato della fattura se il pagamento la copre interamente
    const invoice = this.invoices.get(payment.invoiceId);
    if (invoice) {
      const payments = await this.getPaymentsByInvoice(invoice.id);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + payment.amount;
      
      let status = invoice.status;
      if (totalPaid >= invoice.totalAmount) {
        status = 'paid';
      }
      
      this.updateInvoice(invoice.id, { status });
    }
    
    this.saveToStorage();
    return newPayment;
  }
  
  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) return undefined;
    
    const oldAmount = existingPayment.amount;
    
    const updatedPayment: Payment = { ...existingPayment, ...payment };
    this.payments.set(id, updatedPayment);
    
    // Aggiorniamo lo stato della fattura se necessario
    if (payment.amount !== undefined && payment.amount !== oldAmount) {
      const invoice = this.invoices.get(existingPayment.invoiceId);
      if (invoice) {
        const payments = await this.getPaymentsByInvoice(invoice.id);
        const totalPaid = payments.reduce((sum, p) => sum + (p.id === id ? payment.amount! : p.amount), 0);
        
        let status = invoice.status;
        if (totalPaid >= invoice.totalAmount) {
          status = 'paid';
        } else if (invoice.status === 'paid') {
          status = 'unpaid';
        }
        
        this.updateInvoice(invoice.id, { status });
      }
    }
    
    this.saveToStorage();
    return updatedPayment;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    const payment = this.payments.get(id);
    if (!payment) return false;
    
    // Aggiorniamo lo stato della fattura
    const invoice = this.invoices.get(payment.invoiceId);
    if (invoice) {
      const payments = await this.getPaymentsByInvoice(invoice.id);
      const totalPaid = payments.reduce((sum, p) => sum + (p.id === id ? 0 : p.amount), 0);
      
      let status = invoice.status;
      if (totalPaid < invoice.totalAmount && invoice.status === 'paid') {
        status = 'unpaid';
      }
      
      this.updateInvoice(invoice.id, { status });
    }
    
    const result = this.payments.delete(id);
    this.saveToStorage();
    return result;
  }
  
  // Beta Invitation operations
  async createBetaInvitation(invitation: InsertBetaInvitation): Promise<BetaInvitation> {
    const id = this.betaInvitationIdCounter++;
    const newInvitation: BetaInvitation = {
      ...invitation,
      id,
      createdAt: new Date(),
      usedCount: 0,
      maxUses: invitation.maxUses || 1,
      isUsed: false,
      usedById: null,
      usedAt: null
    };
    this.betaInvitations.set(id, newInvitation);
    this.saveToStorage();
    return newInvitation;
  }
  
  async getBetaInvitation(code: string): Promise<BetaInvitation | undefined> {
    return Array.from(this.betaInvitations.values())
      .find(invitation => invitation.invitationCode === code);
  }
  
  async getBetaInvitations(): Promise<BetaInvitation[]> {
    return Array.from(this.betaInvitations.values());
  }
  
  async updateBetaInvitation(id: number, invitation: Partial<InsertBetaInvitation>): Promise<BetaInvitation | undefined> {
    const existingInvitation = this.betaInvitations.get(id);
    if (!existingInvitation) return undefined;
    
    const updatedInvitation: BetaInvitation = { ...existingInvitation, ...invitation };
    this.betaInvitations.set(id, updatedInvitation);
    this.saveToStorage();
    return updatedInvitation;
  }
  
  async deleteBetaInvitation(id: number): Promise<boolean> {
    const result = this.betaInvitations.delete(id);
    this.saveToStorage();
    return result;
  }
  
  async markBetaInvitationAsUsed(code: string, userId: number): Promise<BetaInvitation | undefined> {
    const invitation = await this.getBetaInvitation(code);
    if (!invitation) return undefined;
    
    const updatedInvitation: BetaInvitation = {
      ...invitation,
      isUsed: true,
      usedCount: (invitation.usedCount || 0) + 1,
      usedAt: new Date(),
      usedById: userId
    };
    
    this.betaInvitations.set(invitation.id, updatedInvitation);
    this.saveToStorage();
    return updatedInvitation;
  }
  
  // Beta Feedback operations
  async createBetaFeedback(feedback: InsertBetaFeedback): Promise<BetaFeedback> {
    const id = this.betaFeedbackIdCounter++;
    const newFeedback: BetaFeedback = {
      ...feedback,
      id,
      createdAt: new Date()
    };
    this.betaFeedback.set(id, newFeedback);
    this.saveToStorage();
    return newFeedback;
  }
  
  async getBetaFeedback(id: number): Promise<BetaFeedbackWithUserDetails | undefined> {
    const feedback = this.betaFeedback.get(id);
    if (!feedback) return undefined;
    
    const user = await this.getUser(feedback.userId);
    if (!user) return undefined;
    
    return {
      ...feedback,
      username: user.username
    };
  }
  
  async getBetaFeedbackByUser(userId: number): Promise<BetaFeedback[]> {
    return Array.from(this.betaFeedback.values())
      .filter(feedback => feedback.userId === userId);
  }
  
  async getAllBetaFeedback(): Promise<BetaFeedbackWithUserDetails[]> {
    const feedbacks = Array.from(this.betaFeedback.values());
    const result: BetaFeedbackWithUserDetails[] = [];
    
    for (const feedback of feedbacks) {
      const user = await this.getUser(feedback.userId);
      if (user) {
        result.push({
          ...feedback,
          username: user.username
        });
      }
    }
    
    return result;
  }
  
  async updateBetaFeedback(id: number, feedback: Partial<InsertBetaFeedback>): Promise<BetaFeedback | undefined> {
    const existingFeedback = this.betaFeedback.get(id);
    if (!existingFeedback) return undefined;
    
    const updatedFeedback: BetaFeedback = { ...existingFeedback, ...feedback };
    this.betaFeedback.set(id, updatedFeedback);
    this.saveToStorage();
    return updatedFeedback;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Setup PostgreSQL session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
      },
      createTableIfMissing: true
    });
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
      
      // Verifica se l'invito può essere ancora utilizzato
      if (invitation.usedCount >= invitation.maxUses) {
        return undefined;
      }
      
      // Aggiorna l'invito
      const isUsed = invitation.usedCount + 1 >= invitation.maxUses;
      const [updated] = await db.update(betaInvitations)
        .set({
          usedCount: invitation.usedCount + 1,
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
      
      // Ottieni i dettagli dell'utente
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
      
      // Aggiungi dettagli utente per ogni feedback
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
  // CLIENT OPERATIONS
  async getClient(id: number): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      return client;
    } catch (error) {
      console.error("Error getting client:", error);
      return undefined;
    }
  }

  async getClients(): Promise<Client[]> {
    try {
      return await db.select().from(clients).orderBy(clients.lastName);
    } catch (error) {
      console.error("Error getting clients:", error);
      return [];
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      const [newClient] = await db.insert(clients).values(client).returning();
      return newClient;
    } catch (error) {
      console.error("Error creating client:", error);
      throw error;
    }
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      const [updatedClient] = await db
        .update(clients)
        .set(client)
        .where(eq(clients.id, id))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error("Error updating client:", error);
      return undefined;
    }
  }

  async deleteClient(id: number): Promise<boolean> {
    try {
      const result = await db.delete(clients).where(eq(clients.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting client:", error);
      return false;
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

  async createService(service: InsertService): Promise<Service> {
    try {
      const [newService] = await db.insert(services).values(service).returning();
      return newService;
    } catch (error) {
      console.error("Error creating service:", error);
      throw error;
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
      return undefined;
    }
  }

  async deleteService(id: number): Promise<boolean> {
    try {
      await db.delete(services).where(eq(services.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting service:", error);
      return false;
    }
  }

  // APPOINTMENT OPERATIONS
  async getAppointment(id: number): Promise<AppointmentWithDetails | undefined> {
    try {
      const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
      if (!appointment) return undefined;

      const [client] = await db.select().from(clients).where(eq(clients.id, appointment.clientId));
      const [service] = await db.select().from(services).where(eq(services.id, appointment.serviceId));

      return {
        ...appointment,
        client,
        service
      };
    } catch (error) {
      console.error("Error getting appointment:", error);
      return undefined;
    }
  }

  async getAppointments(): Promise<AppointmentWithDetails[]> {
    try {
      const result: AppointmentWithDetails[] = [];
      const appointmentsList = await db.select().from(appointments).orderBy(appointments.date, appointments.startTime);

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
      console.error("Error getting appointments:", error);
      return [];
    }
  }

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
      const result: AppointmentWithDetails[] = [];
      const appointmentsList = await db
        .select()
        .from(appointments)
        .where(
          and(
            gte(appointments.date, startDate),
            lte(appointments.date, endDate)
          )
        )
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
      console.error("Error getting appointments by date range:", error);
      return [];
    }
  }

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
      throw error;
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
      return undefined;
    }
  }

  async deleteAppointment(id: number): Promise<boolean> {
    try {
      await db.delete(appointments).where(eq(appointments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting appointment:", error);
      return false;
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
      const [newConsent] = await db.insert(consents).values(consent).returning();
      
      // Aggiorna hasConsent a true per il cliente
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
      throw error;
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
      // Prima eliminiamo tutte le voci e i pagamenti correlati
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await db.delete(payments).where(eq(payments.invoiceId, id));
      
      // Poi eliminiamo la fattura
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
      
      // Aggiorna lo stato della fattura se necessario
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, payment.invoiceId));
      const existingPayments = await this.getPaymentsByInvoice(payment.invoiceId);
      
      // Calcola il totale pagato includendo il nuovo pagamento
      const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + payment.amount;
      
      // Se il totale pagato è uguale o superiore all'importo totale, aggiorna lo stato a "paid"
      if (totalPaid >= invoice.totalAmount && invoice.status !== "paid") {
        await db
          .update(invoices)
          .set({ status: "paid" })
          .where(eq(invoices.id, payment.invoiceId));
      }
      
      return newPayment;
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error;
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
      // Prima otteniamo il pagamento per conoscere la fattura associata
      const [payment] = await db.select().from(payments).where(eq(payments.id, id));
      if (!payment) return false;
      
      // Eliminiamo il pagamento
      await db.delete(payments).where(eq(payments.id, id));
      
      // Aggiorna lo stato della fattura se necessario
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, payment.invoiceId));
      const remainingPayments = await this.getPaymentsByInvoice(payment.invoiceId);
      
      // Calcola il totale pagato dopo la rimozione del pagamento
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Se il totale pagato è inferiore all'importo totale e lo stato era "paid", aggiorna lo stato a "unpaid"
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
      // Otteniamo l'anno corrente
      const currentYear = new Date().getFullYear();
      
      // Contiamo quante fatture ci sono per l'anno corrente
      const yearPrefix = `${currentYear}-`;
      const invoicesForYear = await db
        .select()
        .from(invoices)
        .where(like(invoices.invoiceNumber, `${yearPrefix}%`));
      
      // Genera il nuovo numero di fattura
      const counter = invoicesForYear.length + 1;
      return `${yearPrefix}${counter.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error("Error generating invoice number:", error);
      
      // Fallback con timestamp
      const now = new Date();
      return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getTime().toString().substring(7)}`;
    }
  }

  // USER OPERATIONS
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
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
      const [account] = await db.select().from(clientAccounts).where(eq(clientAccounts.username, username));
      return account;
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
      throw error;
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
  
  // Metodi per la gestione dei token di attivazione
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
      console.log(`Aggiornamento scadenza token con ID ${id} a ${newExpiresAt}`);
      
      const [updatedToken] = await db
        .update(activationTokens)
        .set({ expiresAt: newExpiresAt })
        .where(eq(activationTokens.id, id))
        .returning();
      
      console.log(`Token aggiornato con successo, nuova scadenza: ${updatedToken.expiresAt}`);
      return updatedToken;
    } catch (error) {
      console.error("Errore nell'aggiornamento della scadenza del token:", error);
      return undefined;
    }
  }
  
  // Client Notes operations
  async getClientNotes(clientId: number): Promise<ClientNote[]> {
    try {
      const notes = await db
        .select()
        .from(clientNotes)
        .where(eq(clientNotes.clientId, clientId))
        .orderBy(desc(clientNotes.createdAt));
      
      return notes;
    } catch (error) {
      console.error("Errore durante il recupero delle note del cliente:", error);
      return [];
    }
  }
  
  async createClientNote(note: InsertClientNote): Promise<ClientNote> {
    try {
      const [createdNote] = await db
        .insert(clientNotes)
        .values({
          ...note,
          createdAt: new Date()
        })
        .returning();
      
      return createdNote;
    } catch (error) {
      console.error("Errore durante la creazione della nota del cliente:", error);
      throw error;
    }
  }
  
  async updateClientNote(id: number, note: Partial<InsertClientNote>): Promise<ClientNote | undefined> {
    try {
      const [updatedNote] = await db
        .update(clientNotes)
        .set({
          ...note,
          updatedAt: new Date()
        })
        .where(eq(clientNotes.id, id))
        .returning();
      
      return updatedNote;
    } catch (error) {
      console.error("Errore durante l'aggiornamento della nota del cliente:", error);
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
      console.error("Errore durante l'eliminazione della nota del cliente:", error);
      return false;
    }
  }

  // Google Calendar operations
  async getGoogleCalendarSettings(): Promise<GoogleCalendarSettings | undefined> {
    try {
      const [settings] = await db.select().from(googleCalendarSettings);
      return settings;
    } catch (error) {
      console.error('Errore durante il recupero delle impostazioni Google Calendar:', error);
      return undefined;
    }
  }
  
  async saveGoogleCalendarSettings(settings: InsertGoogleCalendarSettings): Promise<GoogleCalendarSettings> {
    try {
      // Prima controlla se esistono già delle impostazioni
      const existing = await this.getGoogleCalendarSettings();
      
      if (existing) {
        // Aggiorna le impostazioni esistenti
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
        // Crea nuove impostazioni
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
      console.error('Errore durante il salvataggio delle impostazioni Google Calendar:', error);
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
      console.error('Errore durante l\'aggiornamento delle impostazioni Google Calendar:', error);
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
      console.error('Errore durante il recupero dell\'evento Google Calendar:', error);
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
      console.error('Errore durante la creazione dell\'evento Google Calendar:', error);
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
      console.error('Errore durante l\'aggiornamento dell\'evento Google Calendar:', error);
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
      console.error('Errore durante l\'eliminazione dell\'evento Google Calendar:', error);
      return false;
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
      console.error('Errore durante il recupero del modello di promemoria:', error);
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
      console.error('Errore durante il recupero dei modelli di promemoria:', error);
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
      console.error('Errore durante il recupero del modello di promemoria predefinito:', error);
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
      console.error('Errore durante il recupero del modello di promemoria per servizio:', error);
      return undefined;
    }
  }

  // Implementazione del metodo richiesto dall'interfaccia
  async getReminderTemplateByService(serviceId: number, type: string = 'sms'): Promise<ReminderTemplate | undefined> {
    // Utilizziamo il metodo esistente
    return this.getReminderTemplateByServiceId(serviceId, type);
  }

  async createReminderTemplate(template: InsertReminderTemplate): Promise<ReminderTemplate> {
    try {
      // Se questo modello è impostato come predefinito, rimuovi l'impostazione predefinita dagli altri modelli dello stesso tipo
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
      console.error('Errore durante la creazione del modello di promemoria:', error);
      throw error;
    }
  }

  async updateReminderTemplate(id: number, template: Partial<InsertReminderTemplate>): Promise<ReminderTemplate | undefined> {
    try {
      const existingTemplate = await this.getReminderTemplate(id);

      if (!existingTemplate) {
        return undefined;
      }

      // Se questo modello è impostato come predefinito, rimuovi l'impostazione predefinita dagli altri modelli dello stesso tipo
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
      console.error('Errore durante l\'aggiornamento del modello di promemoria:', error);
      return undefined;
    }
  }

  async deleteReminderTemplate(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(reminderTemplates)
        .where(eq(reminderTemplates.id, id));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Errore durante l\'eliminazione del modello di promemoria:', error);
      return false;
    }
  }
  
  // Implementazione dei metodi per gestire le impostazioni dell'applicazione
  async getSetting(key: string): Promise<AppSettings | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, key));
      return setting;
    } catch (error) {
      console.error(`Errore nel recupero dell'impostazione '${key}':`, error);
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
      console.error("Errore nel recupero di tutte le impostazioni:", error);
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
      console.error(`Errore nel recupero delle impostazioni per la categoria '${category}':`, error);
      return [];
    }
  }

  async saveSetting(
    key: string, 
    value: string, 
    description?: string, 
    category: string = 'general'
  ): Promise<AppSettings> {
    try {
      // Verifica se l'impostazione esiste già
      const existingSetting = await this.getSetting(key);
      
      if (existingSetting) {
        // Aggiorna l'impostazione esistente
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
        // Crea una nuova impostazione
        const [newSetting] = await db
          .insert(appSettings)
          .values({
            key,
            value,
            description: description || `Impostazione per ${key}`,
            category
          })
          .returning();
        
        return newSetting;
      }
    } catch (error) {
      console.error(`Errore nel salvataggio dell'impostazione '${key}':`, error);
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
      console.error(`Errore nell'aggiornamento dell'impostazione con ID ${id}:`, error);
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
      console.error(`Errore nell'eliminazione dell'impostazione con ID ${id}:`, error);
      return false;
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
      console.error(`Errore nel recupero delle transazioni di pagamento per il Wise ID ${transactionId}:`, error);
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
      console.error(`Errore nel recupero delle transazioni di pagamento per l'utente ${userId}:`, error);
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
      console.error(`Errore nel recupero delle transazioni di pagamento per la sottoscrizione ${subscriptionId}:`, error);
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
      console.error(`Errore nel recupero delle transazioni di pagamento per il metodo ${method}:`, error);
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
      console.error('Errore nel recupero di tutte le transazioni di pagamento:', error);
      return [];
    }
  }
  
  async getSubscriptions(): Promise<SubscriptionWithDetails[]> {
    try {
      // Recupera tutte le sottoscrizioni con i dettagli dei piani
      const result = await db
        .select({
          subscriptions: subscriptions,
          plans: subscriptionPlans
        })
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .orderBy(desc(subscriptions.createdAt));
      
      // Trasforma i risultati nel formato richiesto
      const subscriptionsWithDetails: SubscriptionWithDetails[] = result.map((row) => {
        const subscription: Subscription = {
          id: row.subscriptions.id,
          userId: row.subscriptions.userId,
          planId: row.subscriptions.planId,
          status: row.subscriptions.status || null,
          currentPeriodStart: row.subscriptions.currentPeriodStart || null,
          currentPeriodEnd: row.subscriptions.currentPeriodEnd || null,
          cancelAtPeriodEnd: row.subscriptions.cancelAtPeriodEnd || null,
          createdAt: row.subscriptions.createdAt || null,
          updatedAt: row.subscriptions.updatedAt || null,
          paymentMethod: row.subscriptions.paymentMethod || null,
          paypalSubscriptionId: row.subscriptions.paypalSubscriptionId || null,
          wiseSubscriptionId: row.subscriptions.wiseSubscriptionId || null,
          metadata: row.subscriptions.metadata
        };
        
        const plan = row.plans ? {
          id: row.plans.id,
          name: row.plans.name,
          description: row.plans.description,
          price: row.plans.price,
          interval: row.plans.interval,
          features: row.plans.features,
          clientLimit: row.plans.clientLimit,
          isActive: row.plans.isActive,
          sortOrder: row.plans.sortOrder,
          createdAt: row.plans.createdAt,
          updatedAt: row.plans.updatedAt
        } : null;

        return {
          ...subscription,
          plan
        };
      });
        
      return subscriptionsWithDetails;
    } catch (error) {
      console.error('Errore nel recupero di tutte le sottoscrizioni:', error);
      return [];
    }
  }
  
  async getActiveSubscriptions(): Promise<SubscriptionWithDetails[]> {
    try {
      // Recupera solo le sottoscrizioni attive con i dettagli dei piani
      const result = await db
        .select({
          subscriptions: subscriptions,
          plans: subscriptionPlans
        })
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.status, 'active'))
        .orderBy(desc(subscriptions.createdAt));
      
      // Trasforma i risultati nel formato richiesto
      const subscriptionsWithDetails: SubscriptionWithDetails[] = result.map((row) => {
        const subscription: Subscription = {
          id: row.subscriptions.id,
          userId: row.subscriptions.userId,
          planId: row.subscriptions.planId,
          status: row.subscriptions.status || null,
          currentPeriodStart: row.subscriptions.currentPeriodStart || null,
          currentPeriodEnd: row.subscriptions.currentPeriodEnd || null,
          cancelAtPeriodEnd: row.subscriptions.cancelAtPeriodEnd || null,
          createdAt: row.subscriptions.createdAt || null,
          updatedAt: row.subscriptions.updatedAt || null,
          paymentMethod: row.subscriptions.paymentMethod || null,
          paypalSubscriptionId: row.subscriptions.paypalSubscriptionId || null,
          wiseSubscriptionId: row.subscriptions.wiseSubscriptionId || null,
          metadata: row.subscriptions.metadata
        };
        
        const plan = row.plans ? {
          id: row.plans.id,
          name: row.plans.name,
          description: row.plans.description,
          price: row.plans.price,
          interval: row.plans.interval,
          features: row.plans.features,
          clientLimit: row.plans.clientLimit,
          isActive: row.plans.isActive,
          sortOrder: row.plans.sortOrder,
          createdAt: row.plans.createdAt,
          updatedAt: row.plans.updatedAt
        } : null;

        return {
          ...subscription,
          plan
        };
      });
        
      return subscriptionsWithDetails;
    } catch (error) {
      console.error('Errore nel recupero delle sottoscrizioni attive:', error);
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
      console.error('Errore nel recupero dei piani di abbonamento attivi:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
