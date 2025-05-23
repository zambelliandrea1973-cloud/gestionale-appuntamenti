/**
 * SISTEMA DATABASE PERSONALIZZATO PER OGNI UTENTE
 * Implementazione del sistema con codici univoci come da schema fornito
 */

// Mappa dei codici univoci per ogni campo personalizzabile
export const FIELD_CODES = {
  // Branding (COD_001 - COD_005)
  BUSINESS_NAME: 'COD_001',      // Nome Aziendale
  TEXT_SIZE: 'COD_002',          // Dimensione Testo  
  FONT_TYPE: 'COD_003',          // Tipo di Carattere
  TEXT_STYLE: 'COD_004',         // Stile Testo
  COLOR: 'COD_005',              // Colore
  
  // Informazioni Contatto (COD_006 - COD_010)
  CONTACT_EMAIL: 'COD_006',      // Email di Contatto
  CONTACT_PHONE: 'COD_007',      // Telefono Principale
  CONTACT_PHONE2: 'COD_008',     // Telefono Secondario
  WEBSITE: 'COD_009',            // Sito Web
  ADDRESS: 'COD_010',            // Indirizzo
  
  // Social Media (COD_011 - COD_013)
  INSTAGRAM: 'COD_011',          // Instagram Handle
  FACEBOOK: 'COD_012',           // Pagina Facebook
  LINKEDIN: 'COD_013',           // Profilo LinkedIn
  
  // Configurazioni Email (COD_014 - COD_018)
  EMAIL_PROVIDER: 'COD_014',     // Provider Email
  EMAIL_API_KEY: 'COD_015',      // Chiave API Email
  EMAIL_FROM_NAME: 'COD_016',    // Nome Mittente
  EMAIL_FROM_ADDRESS: 'COD_017', // Indirizzo Mittente
  EMAIL_SIGNATURE: 'COD_018',    // Firma Email
  
  // Orari e Appuntamenti (COD_019 - COD_024)
  WORKING_HOURS_START: 'COD_019', // Orario Inizio
  WORKING_HOURS_END: 'COD_020',   // Orario Fine
  WORKING_DAYS: 'COD_021',        // Giorni Lavorativi
  TIME_SLOT_DURATION: 'COD_022',  // Durata Slot
  
  // Fatturazione (COD_023 - COD_025)
  INVOICE_PREFIX: 'COD_023',      // Prefisso Fattura
  TAX_RATE: 'COD_024',           // Aliquota IVA
  CURRENCY: 'COD_025'            // Valuta
} as const;

/**
 * Classe per gestire il database personalizzato di ogni utente
 */
export class UserDatabaseSystem {
  private userId: number;
  
  constructor(userId: number) {
    this.userId = userId;
  }
  
  /**
   * Recupera un valore dal database dell'utente usando il codice univoco
   */
  async getValue(fieldCode: string): Promise<string | null> {
    // Implementazione che recupera dal database dell'utente specifico
    return this.getUserFieldValue(fieldCode);
  }
  
  /**
   * Imposta un valore nel database dell'utente usando il codice univoco
   */
  async setValue(fieldCode: string, value: string): Promise<boolean> {
    // Implementazione che salva nel database dell'utente specifico
    return this.setUserFieldValue(fieldCode, value);
  }
  
  /**
   * Recupera TUTTI i valori del database dell'utente al login
   */
  async getAllUserData(): Promise<Record<string, string | null>> {
    const userData: Record<string, string | null> = {};
    
    // Carica tutti i valori usando i codici univoci
    for (const [key, code] of Object.entries(FIELD_CODES)) {
      userData[code] = await this.getValue(code);
    }
    
    return userData;
  }
  
  /**
   * Inizializza il database dell'utente con valori predefiniti
   */
  async initializeUserDatabase(): Promise<void> {
    const defaultValues = {
      [FIELD_CODES.BUSINESS_NAME]: "La tua Attività",
      [FIELD_CODES.TEXT_SIZE]: "16px",
      [FIELD_CODES.FONT_TYPE]: "Arial",
      [FIELD_CODES.TEXT_STYLE]: "normal",
      [FIELD_CODES.COLOR]: "#3f51b5",
      [FIELD_CODES.WORKING_HOURS_START]: "09:00",
      [FIELD_CODES.WORKING_HOURS_END]: "18:00",
      [FIELD_CODES.TIME_SLOT_DURATION]: "30",
      [FIELD_CODES.INVOICE_PREFIX]: "INV",
      [FIELD_CODES.TAX_RATE]: "22.00",
      [FIELD_CODES.CURRENCY]: "EUR"
    };
    
    // Salva i valori predefiniti solo se non esistono già
    for (const [code, value] of Object.entries(defaultValues)) {
      const existing = await this.getValue(code);
      if (!existing) {
        await this.setValue(code, value);
      }
    }
  }
  
  // Metodi privati di implementazione
  private async getUserFieldValue(fieldCode: string): Promise<string | null> {
    // TODO: Implementare recupero dal database user_settings
    return null;
  }
  
  private async setUserFieldValue(fieldCode: string, value: string): Promise<boolean> {
    // TODO: Implementare salvataggio nel database user_settings
    return true;
  }
}

/**
 * Factory per creare un'istanza del database per un utente specifico
 */
export function createUserDatabase(userId: number): UserDatabaseSystem {
  return new UserDatabaseSystem(userId);
}