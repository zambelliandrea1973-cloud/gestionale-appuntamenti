import { apiRequest } from "./queryClient";

// Definizione dell'interfaccia per i dati di contatto
export interface ContactInfo {
  email?: string;
  phone1?: string;
  phone2?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
}

// Funzione per ottenere la chiave localStorage specifica per utente
function getContactInfoKey(userId?: number): string {
  if (userId) {
    return `healthcare_app_contact_info_user_${userId}`;
  }
  return 'healthcare_app_contact_info'; // Fallback per compatibilità
}

/**
 * Carica le informazioni di contatto dall'API
 */
export async function loadContactInfoFromAPI(userId?: number): Promise<ContactInfo> {
  try {
    const response = await apiRequest('GET', '/api/contact-info');
    const data = await response.json();
    
    // Se abbiamo ricevuto dati validi, li salviamo anche in localStorage con separazione utente
    if (data && typeof data === 'object') {
      const storageKey = getContactInfoKey(userId);
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      // Pulisci cache di altri utenti per evitare contaminazione
      if (userId) {
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          if (key.startsWith('healthcare_app_contact_info_user_') && key !== storageKey) {
            localStorage.removeItem(key);
          }
        });
      }
      
      return data;
    }
    
    // Se non abbiamo ricevuto dati validi, usiamo quelli in localStorage
    return loadContactInfo(userId);
  } catch (error) {
    console.error('Errore durante il recupero delle informazioni di contatto dall\'API:', error);
    // Fallback al localStorage in caso di errore
    return loadContactInfo(userId);
  }
}

/**
 * Carica le informazioni di contatto salvate da localStorage
 */
export function loadContactInfo(userId?: number): ContactInfo {
  const storageKey = getContactInfoKey(userId);
  const savedInfo = localStorage.getItem(storageKey);
  if (!savedInfo) {
    return {};
  }
  
  try {
    return JSON.parse(savedInfo) as ContactInfo;
  } catch (error) {
    console.error('Errore durante il caricamento delle informazioni di contatto:', error);
    return {};
  }
}

/**
 * Salva le informazioni di contatto in localStorage e sull'API
 */
export async function saveContactInfoToAPI(contactInfo: ContactInfo, userId?: number): Promise<boolean> {
  try {
    // Salva nel localStorage con separazione utente
    const storageKey = getContactInfoKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(contactInfo));
    
    // Pulisci cache di altri utenti per evitare contaminazione
    if (userId) {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('healthcare_app_contact_info_user_') && key !== storageKey) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Salva tramite API
    const response = await apiRequest('POST', '/api/contact-info', contactInfo);
    const result = await response.json();
    
    // Invia un evento personalizzato per notificare che i dati sono cambiati
    window.dispatchEvent(new CustomEvent('contactInfoUpdated', { 
      detail: { contactInfo, userId } 
    }));
    
    return result.success;
  } catch (error) {
    console.error('Errore durante il salvataggio delle informazioni di contatto tramite API:', error);
    return false;
  }
}

/**
 * Salva le informazioni di contatto in localStorage e tenta di salvarle sull'API
 */
export function saveContactInfo(contactInfo: ContactInfo, userId?: number): void {
  try {
    // Salva nel localStorage con separazione utente
    const storageKey = getContactInfoKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(contactInfo));
    
    // Pulisci cache di altri utenti per evitare contaminazione
    if (userId) {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('healthcare_app_contact_info_user_') && key !== storageKey) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Tenta anche di salvare tramite API in background
    saveContactInfoToAPI(contactInfo, userId).catch(error => {
      console.error('Errore durante il salvataggio delle informazioni di contatto in background:', error);
    });
    
    // Invia un evento personalizzato per notificare che i dati sono cambiati
    window.dispatchEvent(new CustomEvent('contactInfoUpdated'));
  } catch (error) {
    console.error('Errore durante il salvataggio delle informazioni di contatto:', error);
  }
}

/**
 * Verifica se un'informazione di contatto è valida
 */
export function isValidContactInfo(key: keyof ContactInfo, value?: string): boolean {
  if (!value) return false;
  
  switch (key) {
    case 'email':
      // Semplice validazione email
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'website':
      // Validazione più permissiva per URL
      // Accetta sia domain.com che www.domain.com che http://domain.com
      return /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/.test(value);
    case 'facebook':
      // Semplice validazione URL Facebook o username
      return /^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/[a-zA-Z0-9.]+/.test(value) || 
             /^[a-zA-Z0-9.]{5,}$/.test(value);
    case 'instagram':
      // Semplice validazione URL Instagram o username
      return /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/.test(value) ||
             /^[a-zA-Z0-9_.]{1,30}$/.test(value);
    default:
      return true; // Per gli altri campi come telefono accettiamo qualsiasi formato
  }
}

/**
 * Formatta le informazioni di contatto per la visualizzazione
 */
export function formatContactInfo(key: keyof ContactInfo, value?: string): string {
  if (!value) return '';
  
  switch (key) {
    case 'facebook':
      // Se è solo uno username, aggiunge l'URL completo
      if (!value.includes('facebook.com') && !value.includes('fb.com')) {
        return `https://facebook.com/${value}`;
      }
      // Se non inizia con http, aggiunge https
      if (!value.startsWith('http')) {
        return `https://${value}`;
      }
      return value;
    case 'instagram':
      // Se è solo uno username, aggiunge l'URL completo
      if (!value.includes('instagram.com')) {
        return `https://instagram.com/${value}`;
      }
      // Se non inizia con http, aggiunge https
      if (!value.startsWith('http')) {
        return `https://${value}`;
      }
      return value;
    case 'website':
      // Se non inizia con http, aggiunge https
      if (!value.startsWith('http')) {
        return `https://${value}`;
      }
      return value;
    default:
      return value;
  }
}