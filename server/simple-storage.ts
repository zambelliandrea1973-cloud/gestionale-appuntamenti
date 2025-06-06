import fs from 'fs';
import path from 'path';

// Tipi semplificati per il sistema lineare
interface SimpleClient {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  createdAt: Date;
}

interface SimpleService {
  id: number;
  userId: number;
  name: string;
  duration: number;
  price: number;
  color: string;
  createdAt: Date;
}

interface SimpleAppointment {
  id: number;
  userId: number;
  clientId: number;
  serviceId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  createdAt: Date;
}

interface SimpleSettings {
  [key: string]: any;
}

// Sistema di storage semplificato con architettura lineare
export class SimpleStorage {
  private dataFile: string;
  private clients: Map<number, SimpleClient> = new Map();
  private services: Map<number, SimpleService> = new Map();
  private appointments: Map<number, SimpleAppointment> = new Map();
  private settings: Map<string, SimpleSettings> = new Map();
  
  private clientIdCounter = 1;
  private serviceIdCounter = 1;
  private appointmentIdCounter = 1;

  constructor() {
    this.dataFile = path.join(process.cwd(), 'simple-storage.json');
    this.loadFromFile();
    this.initDefaultData();
  }

  // Caricamento dati da file
  private loadFromFile() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        
        // Carica clients
        if (data.clients) {
          this.clients = new Map(data.clients.map((c: any) => [c.id, c]));
          this.clientIdCounter = Math.max(...Array.from(this.clients.keys()), 0) + 1;
        }
        
        // Carica services
        if (data.services) {
          this.services = new Map(data.services.map((s: any) => [s.id, s]));
          this.serviceIdCounter = Math.max(...Array.from(this.services.keys()), 0) + 1;
        }
        
        // Carica appointments
        if (data.appointments) {
          this.appointments = new Map(data.appointments.map((a: any) => [a.id, a]));
          this.appointmentIdCounter = Math.max(...Array.from(this.appointments.keys()), 0) + 1;
        }
        
        // Carica settings
        if (data.settings) {
          this.settings = new Map(Object.entries(data.settings));
        }
        
        console.log('Dati caricati dal file simple-storage.json');
      }
    } catch (error) {
      console.error('Errore durante il caricamento dei dati:', error);
    }
  }

  // Salvataggio dati su file
  private saveToFile() {
    try {
      const data = {
        clients: Array.from(this.clients.values()),
        services: Array.from(this.services.values()),
        appointments: Array.from(this.appointments.values()),
        settings: Object.fromEntries(this.settings),
        counters: {
          clientIdCounter: this.clientIdCounter,
          serviceIdCounter: this.serviceIdCounter,
          appointmentIdCounter: this.appointmentIdCounter
        }
      };
      
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log('Dati salvati su simple-storage.json');
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
    }
  }

  // Inizializzazione dati predefiniti
  private initDefaultData() {
    // Aggiungi servizi predefiniti se non esistono
    if (this.services.size === 0) {
      const defaultServices = [
        { name: "Visita Generale", duration: 30, price: 80, color: "#3b82f6" },
        { name: "Controllo", duration: 15, price: 40, color: "#ef4444" },
        { name: "Consulenza", duration: 45, price: 100, color: "#10b981" }
      ];
      
      defaultServices.forEach(service => {
        this.createService(1, service); // userId = 1 per i servizi predefiniti
      });
    }
  }

  // ==================== CLIENTI ====================
  getClients(userId: number): SimpleClient[] {
    return Array.from(this.clients.values()).filter(client => client.userId === userId);
  }

  createClient(userId: number, clientData: Omit<SimpleClient, 'id' | 'userId' | 'createdAt'>): SimpleClient {
    const client: SimpleClient = {
      id: this.clientIdCounter++,
      userId,
      ...clientData,
      createdAt: new Date()
    };
    
    this.clients.set(client.id, client);
    this.saveToFile();
    return client;
  }

  updateClient(clientId: number, userId: number, updates: Partial<SimpleClient>): SimpleClient | null {
    const client = this.clients.get(clientId);
    if (!client || client.userId !== userId) return null;
    
    const updatedClient = { ...client, ...updates };
    this.clients.set(clientId, updatedClient);
    this.saveToFile();
    return updatedClient;
  }

  deleteClient(clientId: number, userId: number): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.userId !== userId) return false;
    
    this.clients.delete(clientId);
    this.saveToFile();
    return true;
  }

  // ==================== SERVIZI ====================
  getServices(userId?: number): SimpleService[] {
    if (userId) {
      return Array.from(this.services.values()).filter(service => service.userId === userId);
    }
    return Array.from(this.services.values());
  }

  createService(userId: number, serviceData: Omit<SimpleService, 'id' | 'userId' | 'createdAt'>): SimpleService {
    const service: SimpleService = {
      id: this.serviceIdCounter++,
      userId,
      ...serviceData,
      createdAt: new Date()
    };
    
    this.services.set(service.id, service);
    this.saveToFile();
    return service;
  }

  updateService(serviceId: number, userId: number, updates: Partial<SimpleService>): SimpleService | null {
    const service = this.services.get(serviceId);
    if (!service || service.userId !== userId) return null;
    
    const updatedService = { ...service, ...updates };
    this.services.set(serviceId, updatedService);
    this.saveToFile();
    return updatedService;
  }

  deleteService(serviceId: number, userId: number): boolean {
    const service = this.services.get(serviceId);
    if (!service || service.userId !== userId) return false;
    
    this.services.delete(serviceId);
    this.saveToFile();
    return true;
  }

  // ==================== APPUNTAMENTI ====================
  getAppointments(userId: number): SimpleAppointment[] {
    return Array.from(this.appointments.values()).filter(appointment => appointment.userId === userId);
  }

  createAppointment(userId: number, appointmentData: Omit<SimpleAppointment, 'id' | 'userId' | 'createdAt'>): SimpleAppointment {
    const appointment: SimpleAppointment = {
      id: this.appointmentIdCounter++,
      userId,
      ...appointmentData,
      createdAt: new Date()
    };
    
    this.appointments.set(appointment.id, appointment);
    this.saveToFile();
    return appointment;
  }

  updateAppointment(appointmentId: number, userId: number, updates: Partial<SimpleAppointment>): SimpleAppointment | null {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment || appointment.userId !== userId) return null;
    
    const updatedAppointment = { ...appointment, ...updates };
    this.appointments.set(appointmentId, updatedAppointment);
    this.saveToFile();
    return updatedAppointment;
  }

  deleteAppointment(appointmentId: number, userId: number): boolean {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment || appointment.userId !== userId) return false;
    
    this.appointments.delete(appointmentId);
    this.saveToFile();
    return true;
  }

  // ==================== IMPOSTAZIONI ====================
  getSettings(key: string): SimpleSettings | null {
    return this.settings.get(key) || null;
  }

  saveSettings(key: string, data: SimpleSettings): void {
    this.settings.set(key, data);
    this.saveToFile();
  }

  // ==================== METODI SPECIFICI ====================
  getCompanyNameSettings(userId: number): any {
    const key = `company_name_${userId}`;
    return this.settings.get(key) || {
      businessName: "Studio Medico",
      showBusinessName: true
    };
  }

  saveCompanyNameSettings(userId: number, settings: any): any {
    const key = `company_name_${userId}`;
    this.settings.set(key, settings);
    this.saveToFile();
    return settings;
  }
}