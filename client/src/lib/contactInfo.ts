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
 * Carica le informazioni di contatto salvate
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
 * Salva le informazioni di contatto
 */
export function saveContactInfo(contactInfo: ContactInfo): void {
  try {
    localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(contactInfo));
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
      // Semplice validazione URL
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