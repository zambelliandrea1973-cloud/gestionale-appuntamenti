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

// Chiave utilizzata per salvare i dati nel localStorage
const CONTACT_INFO_KEY = 'healthcare_app_contact_info';

/**
 * Carica le informazioni di contatto dall'API
 */
export async function loadContactInfoFromAPI(): Promise<ContactInfo> {
  try {
    const response = await apiRequest('GET', '/api/contact-info');
    const data = await response.json();
    
    // Se abbiamo ricevuto dati validi, li salviamo anche in localStorage
    if (data && typeof data === 'object') {
      localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(data));
      return data;
    }
    
    // Se non abbiamo ricevuto dati validi, usiamo quelli in localStorage
    return loadContactInfo();
  } catch (error) {
    console.error('Errore durante il recupero delle informazioni di contatto dall\'API:', error);
    // Fallback al localStorage in caso di errore
    return loadContactInfo();
  }
}

/**
 * Carica le informazioni di contatto salvate da localStorage
 */
export function loadContactInfo(): ContactInfo {
  const savedInfo = localStorage.getItem(CONTACT_INFO_KEY);
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
export async function saveContactInfoToAPI(contactInfo: ContactInfo): Promise<boolean> {
  try {
    console.log('📞 Salvataggio informazioni contatto:', contactInfo);
    
    // Salva nel localStorage
    localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(contactInfo));
    
    // Salva tramite API - uso fetch diretto come backup15
    const response = await fetch('/api/contact-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactInfo)
    });
    
    if (!response.ok) {
      console.error(`Errore HTTP: ${response.status}`);
      const errorText = await response.text();
      console.error('Risposta server:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Informazioni di contatto salvate con successo:', result);
    
    // Invia un evento personalizzato per notificare che i dati sono cambiati
    window.dispatchEvent(new CustomEvent('contactInfoUpdated'));
    
    return true;
  } catch (error) {
    console.error('Errore durante il salvataggio delle informazioni di contatto:', error);
    return false;
  }
}

/**
 * Salva le informazioni di contatto in localStorage e tenta di salvarle sull'API
 */
export function saveContactInfo(contactInfo: ContactInfo): void {
  try {
    // Salva nel localStorage
    localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(contactInfo));
    
    // Tenta anche di salvare tramite API in background
    saveContactInfoToAPI(contactInfo).catch(error => {
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