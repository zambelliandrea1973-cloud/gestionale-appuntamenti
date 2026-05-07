import fs from 'fs';
import path from 'path';

/**
 * 📁 UTILITY CENTRALIZZATA PER JSON STORAGE
 * Replaces all duplicate load/save functions scattered in the code
 */

const STORAGE_FILE = path.join(process.cwd(), 'storage_data.json');

export function loadStorageData() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      
      // Initialize missing structures for compatibility
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
    console.error('❌ [JSON STORAGE] Error loading storage:', error);
  }
  
  // Struttura by default
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
    console.log('✅ [JSON STORAGE] Data saved correctly');
  } catch (error) {
    console.error('❌ [JSON STORAGE] Error saving storage:', error);
    throw error;
  }
}

/**
 * 🗓️ SHARED FILTER: Find tomorrow's appointments FROM POSTGRESQL
 * Used by both the WhatsApp Center and the automatic job for consistency
 * @returns Promise<Array> of tomorrow's appointments
 */
export async function getTomorrowAppointments() {
  // 🔄 USE POSTGRESQL instead of JSON
  const { db } = await import('../db');
  const { appointments, clients } = await import('../../shared/schema');
  const { eq } = await import('drizzle-orm');
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Format the date for PostgreSQL (YYYY-MM-DD)
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  console.log(`🗓️ [POSTGRESQL] Looking for appointments for tomorrow: ${tomorrowString}`);
  
  try {
    // Load appointments da PostgreSQL
    const tomorrowAppointments = await db
      .select()
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .where(eq(appointments.date, tomorrowString));
    
    // Transform result into format compatible with existing code
    const formattedAppointments = tomorrowAppointments.map(row => ({
      ...row.appointments,
      client: row.clients
    }));
    
    console.log(`🗓️ [POSTGRESQL] Found ${formattedAppointments.length} appointments for tomorrow (${tomorrow.toDateString()})`);
    
    return formattedAppointments;
  } catch (error) {
    console.error('❌ [POSTGRESQL] Error loading appointments:', error);
    return [];
  }
}