import fs from 'fs';
import path from 'path';

// Definizione del tipo per i dati di contatto
export interface ContactInfo {
  email?: string;
  phone1?: string;
  phone2?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
}

// Percorso del file di contatto
const CONTACT_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'contacts.json');

/**
 * Classe di servizio per la gestione delle informazioni di contatto
 */
class ContactService {
  /**
   * Carica le informazioni di contatto
   */
  getContactInfo(): ContactInfo {
    try {
      // Verifica che il file esista
      if (!fs.existsSync(CONTACT_FILE_PATH)) {
        return {};
      }
      
      // Legge il file JSON
      const contactData = fs.readFileSync(CONTACT_FILE_PATH, 'utf8');
      
      // Verifica che contenga dati validi
      if (!contactData) {
        return {};
      }
      
      // Converte da JSON a oggetto
      const contactInfo = JSON.parse(contactData) as ContactInfo;
      return contactInfo;
    } catch (error) {
      console.error('Errore durante il recupero delle informazioni di contatto:', error);
      return {};
    }
  }
  
  /**
   * Salva le informazioni di contatto
   */
  saveContactInfo(contactInfo: ContactInfo): boolean {
    try {
      // Crea la directory se non esiste
      const dirPath = path.dirname(CONTACT_FILE_PATH);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Converte l'oggetto in JSON e lo salva
      fs.writeFileSync(CONTACT_FILE_PATH, JSON.stringify(contactInfo, null, 2));
      console.log('Informazioni di contatto salvate con successo:', contactInfo);
      
      return true;
    } catch (error) {
      console.error('Errore durante il salvataggio delle informazioni di contatto:', error);
      return false;
    }
  }
}

// Esporta un'istanza singleton del servizio
export const contactService = new ContactService();