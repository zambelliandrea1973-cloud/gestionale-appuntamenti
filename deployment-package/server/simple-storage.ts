// Sistema lineare semplificato con dati reali dal backup15
import { Client } from "@shared/schema";

export class SimpleStorage {
  private clients: Map<number, Client> = new Map();
  
  constructor() {
    this.loadRealClients();
  }
  
  // Carica i clienti reali dal backup15
  private loadRealClients() {
    const realClients: Client[] = [
      { id: 1, userId: 3, firstName: "Mario", lastName: "Rossi", phone: "3201234567", email: "mario.rossi@esempio.it", address: null, birthday: null, notes: null, isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-04-02T16:08:04.062Z"), uniqueCode: "MR001" },
      { id: 2, userId: 3, firstName: "Zambelli", lastName: "Andrea", phone: "3472550110", email: "zambelli.andrea.1973@gmail.com", address: "Via Cavallotti", birthday: "2025-04-24", notes: "fruy", isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-04-02T16:43:36.683Z"), uniqueCode: "ZA002" },
      { id: 3, userId: 3, firstName: "Bruna", lastName: "Pizzolato", phone: "+393401234567", email: "brunapizzolato77@gmail.com", address: "Via Monte Rosa 4b , 22070 Appiano Gentile ", birthday: "1987-03-14", notes: null, isFrequent: true, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.644Z"), uniqueCode: "BP003" },
      { id: 4, userId: 3, firstName: "Cristina", lastName: "Valetti", phone: "+393337124083", email: null, address: null, birthday: null, notes: null, isFrequent: true, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.645Z"), uniqueCode: "CV004" },
      { id: 5, userId: 3, firstName: "Matteo", lastName: "Somaschini", phone: "+393920820219", email: null, address: null, birthday: null, notes: null, isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.645Z"), uniqueCode: "MS005" },
      { id: 6, userId: 3, firstName: "Leila", lastName: "Baldovin", phone: "+393312936414", email: "leila.baldovin22@gmail.com", address: null, birthday: "1999-07-10", notes: "Allergia mandorle + graminacee", isFrequent: true, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.646Z"), uniqueCode: "LB006" },
      { id: 7, userId: 3, firstName: "Rosa", lastName: "Nappi", phone: "+393479687939", email: null, address: null, birthday: null, notes: null, isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.646Z"), uniqueCode: "RN007" },
      { id: 8, userId: 3, firstName: "Giovanna", lastName: "Spano", phone: "+393666249288", email: null, address: null, birthday: null, notes: null, isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.646Z"), uniqueCode: "GS008" },
      { id: 9, userId: 3, firstName: "Giulio", lastName: "Carimati", phone: "+393396253936", email: null, address: null, birthday: null, notes: null, isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.646Z"), uniqueCode: "GC009" },
      { id: 10, userId: 3, firstName: "Daniela", lastName: "Biglione", phone: "+393392327893", email: null, address: null, birthday: null, notes: null, isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.647Z"), uniqueCode: "DB010" },
      { id: 11, userId: 3, firstName: "Roberto", lastName: "Mascheroni", phone: "+393357004464", email: null, address: null, birthday: null, notes: null, isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.647Z"), uniqueCode: "RM011" },
      { id: 12, userId: 3, firstName: "Valeria", lastName: "Benvenuto", phone: "+393348006444", email: null, address: null, birthday: null, notes: null, isFrequent: false, medicalNotes: null, allergies: null, hasConsent: false, createdAt: new Date("2025-06-03T13:34:58.647Z"), uniqueCode: "VB012" }
    ];
    
    realClients.forEach(client => {
      this.clients.set(client.id, client);
    });
    
    console.log(`✅ Caricati ${realClients.length} clienti reali dal backup15`);
  }
  
  // Operazioni base per i clienti
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
}

export const simpleStorage = new SimpleStorage();