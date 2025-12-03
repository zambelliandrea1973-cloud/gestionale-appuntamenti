import fs from 'fs';
import path from 'path';

/**
 * 📁 UTILITY CENTRALIZZATA PER JSON STORAGE
 * Sostituisce tutte le funzioni duplicate load/save sparpagliate nel codice
 */

const STORAGE_FILE = path.join(process.cwd(), 'storage_data.json');

export function loadStorageData() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      
      // Inizializza strutture mancanti per compatibilità
      if (!data.userIcons) data.userIcons = {};
      if (!data.userBusinessSettings) data.userBusinessSettings = {};
      if (!data.userBusinessData) data.userBusinessData = {};
      if (!data.userServices) data.userServices = {};
      if (!data.professionistCodes) data.professionistCodes = {};
      if (!data.clientCodes) data.clientCodes = {};
      if (!data.appointments) data.appointments = [];
      if (!data.clients) data.clients = [];
      
      return data;
    }
  } catch (error) {
    console.error('❌ [JSON STORAGE] Errore caricamento storage:', error);
  }
  
  // Struttura di default
  return {
    appointments: [],
    clients: [],
    userServices: {},
    userIcons: {},
    userBusinessSettings: {},
    userBusinessData: {},
    professionistCodes: {},
    clientCodes: {}
  };
}

export function saveStorageData(data: any) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ [JSON STORAGE] Dati salvati correttamente');
  } catch (error) {
    console.error('❌ [JSON STORAGE] Errore salvataggio storage:', error);
    throw error;
  }
}

/**
 * 🗓️ FILTRO CONDIVISO: Trova appuntamenti di domani DA POSTGRESQL
 * Usato sia dal Centro WhatsApp che dal job automatico per coerenza
 * @returns Promise<Array> di appuntamenti di domani
 */
export async function getTomorrowAppointments() {
  // 🔄 USA POSTGRESQL invece del JSON
  const { db } = await import('../db');
  const { appointments, clients } = await import('../../shared/schema');
  const { eq } = await import('drizzle-orm');
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Formatta la data per PostgreSQL (YYYY-MM-DD)
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  console.log(`🗓️ [POSTGRESQL] Cercando appuntamenti per domani: ${tomorrowString}`);
  
  try {
    // Carica appuntamenti da PostgreSQL
    const tomorrowAppointments = await db
      .select()
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .where(eq(appointments.date, tomorrowString));
    
    // Trasforma risultato in formato compatibile con il codice esistente
    const formattedAppointments = tomorrowAppointments.map(row => ({
      ...row.appointments,
      client: row.clients
    }));
    
    console.log(`🗓️ [POSTGRESQL] Trovati ${formattedAppointments.length} appuntamenti per domani (${tomorrow.toDateString()})`);
    
    return formattedAppointments;
  } catch (error) {
    console.error('❌ [POSTGRESQL] Errore caricamento appuntamenti:', error);
    return [];
  }
}