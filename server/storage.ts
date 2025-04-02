import { 
  clients, type Client, type InsertClient,
  services, type Service, type InsertService,
  appointments, type Appointment, type InsertAppointment,
  consents, type Consent, type InsertConsent,
  type AppointmentWithDetails,
  type ClientWithAppointments
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
  
  // Special operations
  getClientWithAppointments(clientId: number): Promise<ClientWithAppointments | undefined>;
  searchClients(query: string): Promise<Client[]>;
}

// In-memory implementation of the storage interface with localStorage persistence
export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private services: Map<number, Service>;
  private appointments: Map<number, Appointment>;
  private consents: Map<number, Consent>;
  
  private clientIdCounter: number;
  private serviceIdCounter: number;
  private appointmentIdCounter: number;
  private consentIdCounter: number;
  
  constructor() {
    // Attempt to load from localStorage first
    try {
      const savedData = global.localStorage?.getItem('appData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Restore maps from the saved data
        this.clients = new Map(data.clients);
        this.services = new Map(data.services);
        this.appointments = new Map(data.appointments);
        this.consents = new Map(data.consents);
        
        this.clientIdCounter = data.clientIdCounter;
        this.serviceIdCounter = data.serviceIdCounter;
        this.appointmentIdCounter = data.appointmentIdCounter;
        this.consentIdCounter = data.consentIdCounter;
        
        console.log('Data loaded from localStorage');
      } else {
        // Initialize empty maps if no saved data
        this.clients = new Map();
        this.services = new Map();
        this.appointments = new Map();
        this.consents = new Map();
        
        this.clientIdCounter = 1;
        this.serviceIdCounter = 1;
        this.appointmentIdCounter = 1;
        this.consentIdCounter = 1;
        
        // Initialize with default services
        this.initDefaultServices();
      }
    } catch (error) {
      console.error('Error loading from localStorage, initializing empty storage', error);
      // Initialize empty maps if loading fails
      this.clients = new Map();
      this.services = new Map();
      this.appointments = new Map();
      this.consents = new Map();
      
      this.clientIdCounter = 1;
      this.serviceIdCounter = 1;
      this.appointmentIdCounter = 1;
      this.consentIdCounter = 1;
      
      // Initialize with default services
      this.initDefaultServices();
    }
  }
  
  // Save data to localStorage
  private saveToStorage() {
    try {
      if (typeof global.localStorage !== 'undefined') {
        const data = {
          clients: Array.from(this.clients.entries()),
          services: Array.from(this.services.entries()),
          appointments: Array.from(this.appointments.entries()),
          consents: Array.from(this.consents.entries()),
          clientIdCounter: this.clientIdCounter,
          serviceIdCounter: this.serviceIdCounter,
          appointmentIdCounter: this.appointmentIdCounter,
          consentIdCounter: this.consentIdCounter
        };
        
        global.localStorage.setItem('appData', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error saving to localStorage', error);
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
}

export const storage = new MemStorage();
