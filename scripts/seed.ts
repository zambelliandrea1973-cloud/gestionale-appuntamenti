import { db } from '../server/db';
import { clients, services, appointments, consents, invoices, invoiceItems, payments } from '../shared/schema';

/**
 * Script per inserire dati iniziali nel database
 */
async function seed() {
  console.log('Inizializzazione del database con i dati predefiniti...');
  
  try {
    // Verifica se ci sono già servizi nel database
    const existingServices = await db.select().from(services);
    
    // Se non ci sono servizi, inserisci quelli predefiniti
    if (existingServices.length === 0) {
      console.log('Inserimento dei servizi predefiniti...');
      
      await db.insert(services).values([
        {
          name: "Test Diacom",
          duration: 60,
          color: "#3f51b5",
          price: 8000, // 80 € in centesimi
        },
        {
          name: "Terapia Bicom",
          duration: 90,
          color: "#4caf50",
          price: 10000, // 100 € in centesimi
        },
        {
          name: "Terapia Luce Zapter",
          duration: 45,
          color: "#ff9800", 
          price: 6000, // 60 € in centesimi
        },
        {
          name: "Detox",
          duration: 120,
          color: "#9c27b0",
          price: 12000, // 120 € in centesimi
        },
      ]);
      
      console.log('Servizi predefiniti inseriti con successo!');
    } else {
      console.log(`Trovati ${existingServices.length} servizi esistenti, salto l'inserimento.`);
    }

    console.log('Inizializzazione completata con successo!');
    process.exit(0);
  } catch (error) {
    console.error('Errore durante l\'inizializzazione del database:', error);
    process.exit(1);
  }
}

// Esegui il seed
seed();