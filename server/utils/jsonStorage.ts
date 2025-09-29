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