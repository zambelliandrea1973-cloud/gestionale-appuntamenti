import * as fs from 'fs';
import { 
  clients, type Client, type InsertClient,
  services, type Service, type InsertService,
  appointments, type Appointment, type InsertAppointment,
  consents, type Consent, type InsertConsent,
  invoices, type Invoice, type InsertInvoice, 
  invoiceItems, type InvoiceItem, type InsertInvoiceItem,
  payments, type Payment, type InsertPayment,
  type AppointmentWithDetails,
  type ClientWithAppointments,
  type InvoiceWithDetails,
  type InvoiceItemWithDetails
} from "@shared/schema";

// Interface defining all storage operations
export interface IStorage {
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  
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
  
  private clientIdCounter: number;
  private serviceIdCounter: number;
  private appointmentIdCounter: number;
  private consentIdCounter: number;
  private invoiceIdCounter: number;
  private invoiceItemIdCounter: number;
  private paymentIdCounter: number;
  
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
        
        // Restore counters
        this.clientIdCounter = data.clientIdCounter;
        this.serviceIdCounter = data.serviceIdCounter;
        this.appointmentIdCounter = data.appointmentIdCounter;
        this.consentIdCounter = data.consentIdCounter;
        this.invoiceIdCounter = data.invoiceIdCounter || 1;
        this.invoiceItemIdCounter = data.invoiceItemIdCounter || 1;
        this.paymentIdCounter = data.paymentIdCounter || 1;
        
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
        
        this.clientIdCounter = 1;
        this.serviceIdCounter = 1;
        this.appointmentIdCounter = 1;
        this.consentIdCounter = 1;
        this.invoiceIdCounter = 1;
        this.invoiceItemIdCounter = 1;
        this.paymentIdCounter = 1;
        
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
      
      this.clientIdCounter = 1;
      this.serviceIdCounter = 1;
      this.appointmentIdCounter = 1;
      this.consentIdCounter = 1;
      this.invoiceIdCounter = 1;
      this.invoiceItemIdCounter = 1;
      this.paymentIdCounter = 1;
      
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
        clientIdCounter: this.clientIdCounter,
        serviceIdCounter: this.serviceIdCounter,
        appointmentIdCounter: this.appointmentIdCounter,
        consentIdCounter: this.consentIdCounter,
        invoiceIdCounter: this.invoiceIdCounter,
        invoiceItemIdCounter: this.invoiceItemIdCounter,
        paymentIdCounter: this.paymentIdCounter
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
    const id = this.appointmentIdCounter++;
    const newAppointment: Appointment = { 
      ...appointment, 
      id, 
      createdAt: new Date()
    };
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
}

export class DatabaseStorage implements IStorage {
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
}

// IMPORTANTE: Usa il database PostgreSQL per l'archiviazione persistente
import { db } from './db';
import { eq, desc, and, gte, lte, like, or, sql } from 'drizzle-orm';

// Utilizza la classe DatabaseStorage invece di MemStorage
export const storage = new DatabaseStorage();
