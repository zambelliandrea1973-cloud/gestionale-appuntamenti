/**
 * SISTEMA DATABASE PERSONALIZZATO PER OGNI UTENTE
 * Implementazione del sistema con codici univoci come da schema fornito
 */

// Mappa dei codici univoci per ogni campo personalizzabile
export const FIELD_CODES = {
  // Branding (COD_001 - COD_006)
  BUSINESS_NAME: 'COD_001',      // Nome Aziendale
  TEXT_SIZE: 'COD_002',          // Dimensione Testo  
  FONT_TYPE: 'COD_003',          // Tipo di Carattere
  TEXT_STYLE: 'COD_004',         // Stile Testo
  PRIMARY_COLOR: 'COD_005',      // Colore Primario
  SECONDARY_COLOR: 'COD_006',    // Colore Secondario
  
  // Informazioni Contatto (COD_007 - COD_011)
  CONTACT_EMAIL: 'COD_007',      // Email di Contatto
  CONTACT_PHONE: 'COD_008',      // Telefono Principale
  CONTACT_PHONE2: 'COD_009',     // Telefono Secondario
  WEBSITE: 'COD_010',            // Sito Web
  ADDRESS: 'COD_011',            // Indirizzo
  
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
   * Inizializza il database dell'utente con valori predefiniti PERSONALIZZATI
   */
  async initializeUserDatabase(): Promise<void> {
    console.log(`🎯 INIZIALIZZAZIONE DATABASE SEPARATO per User ID: ${this.userId}`);
    
    // Valori predefiniti PERSONALIZZATI per ogni utente - COME NEL TUO SCHEMA
    const defaultValues = {
      [FIELD_CODES.BUSINESS_NAME]: `Attività ${this.userId}`,
      [FIELD_CODES.TEXT_SIZE]: "16px", 
      [FIELD_CODES.FONT_TYPE]: "Arial",
      [FIELD_CODES.TEXT_STYLE]: "normal",
      [FIELD_CODES.PRIMARY_COLOR]: `#${(0x1000000 + (Math.random()) * 0xffffff).toString(16).substr(1,6)}`, // Colore primario casuale
      [FIELD_CODES.SECONDARY_COLOR]: "#ffffff", // Colore secondario bianco
      [FIELD_CODES.WORKING_HOURS_START]: "09:00",
      [FIELD_CODES.WORKING_HOURS_END]: "18:00", 
      [FIELD_CODES.TIME_SLOT_DURATION]: "30",
      [FIELD_CODES.INVOICE_PREFIX]: `INV-${this.userId}`,
      [FIELD_CODES.TAX_RATE]: "22.00",
      [FIELD_CODES.CURRENCY]: "EUR"
    };
    
    // Forza l'inizializzazione con valori personalizzati per ogni utente
    for (const [code, value] of Object.entries(defaultValues)) {
      const existing = await this.getValue(code);
      if (!existing || existing === "La tua Attività" || existing === "INV") {
        // Forza il salvataggio di valori personalizzati
        const success = await this.setValue(code, value);
        console.log(`🎯 INIZIALIZZATO ${code}="${value}" per User ID ${this.userId}: ${success ? 'OK' : 'ERRORE'}`);
      } else {
        console.log(`🎯 GIÀ ESISTENTE ${code}="${existing}" per User ID ${this.userId}`);
      }
    }
  }
  
  // Metodi privati di implementazione - REPLICANO IL SISTEMA BACKUP15
  private async getUserFieldValue(fieldCode: string): Promise<string | null> {
    try {
      const { storage } = await import('./storage');
      const userSettings = await storage.getUserSettings(this.userId);
      
      if (!userSettings) {
        console.log(`🔍 CODICE ${fieldCode}: Nessuna impostazione trovata per User ID ${this.userId}`);
        return null;
      }
      
      // Mappa i codici univoci ai campi del database
      const fieldMapping: Record<string, keyof typeof userSettings> = {
        [FIELD_CODES.BUSINESS_NAME]: 'businessName',
        [FIELD_CODES.PRIMARY_COLOR]: 'primaryColor',
        [FIELD_CODES.SECONDARY_COLOR]: 'secondaryColor',
        [FIELD_CODES.CONTACT_EMAIL]: 'contactEmail',
        [FIELD_CODES.CONTACT_PHONE]: 'contactPhone',
        [FIELD_CODES.CONTACT_PHONE2]: 'contactPhone2',
        [FIELD_CODES.WEBSITE]: 'website',
        [FIELD_CODES.ADDRESS]: 'address',
        [FIELD_CODES.INSTAGRAM]: 'instagramHandle',
        [FIELD_CODES.FACEBOOK]: 'facebookPage',
        [FIELD_CODES.LINKEDIN]: 'linkedinProfile',
        [FIELD_CODES.EMAIL_PROVIDER]: 'emailProvider',
        [FIELD_CODES.EMAIL_API_KEY]: 'emailApiKey',
        [FIELD_CODES.EMAIL_FROM_NAME]: 'emailFromName',
        [FIELD_CODES.EMAIL_FROM_ADDRESS]: 'emailFromAddress',
        [FIELD_CODES.EMAIL_SIGNATURE]: 'emailSignature',
        [FIELD_CODES.WORKING_HOURS_START]: 'workingHoursStart',
        [FIELD_CODES.WORKING_HOURS_END]: 'workingHoursEnd',
        [FIELD_CODES.TIME_SLOT_DURATION]: 'timeSlotDuration',
        [FIELD_CODES.INVOICE_PREFIX]: 'invoicePrefix',
        [FIELD_CODES.TAX_RATE]: 'taxRate',
        [FIELD_CODES.CURRENCY]: 'currency'
      };
      
      const fieldKey = fieldMapping[fieldCode];
      if (!fieldKey) {
        console.log(`⚠️ CODICE ${fieldCode}: Campo non mappato per User ID ${this.userId}`);
        return null;
      }
      
      const value = userSettings[fieldKey];
      console.log(`✅ CODICE ${fieldCode}: Recuperato "${value}" per User ID ${this.userId}`);
      return value ? String(value) : null;
      
    } catch (error) {
      console.error(`❌ Errore recupero ${fieldCode} per User ID ${this.userId}:`, error);
      return null;
    }
  }
  
  private async setUserFieldValue(fieldCode: string, value: string): Promise<boolean> {
    try {
      const { pool } = await import('./db');
      
      // USA DIRETTAMENTE LA TABELLA user_custom_data (database separato)
      await pool.query(`
        INSERT INTO user_custom_data (user_id, field_code, value, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, field_code) 
        DO UPDATE SET value = $3, updated_at = NOW()
      `, [this.userId, fieldCode, value]);
      
      console.log(`✅ CODICE ${fieldCode}: Salvato "${value}" per User ID ${this.userId} in database separato`);
      return true;
      
    } catch (error) {
      console.error(`❌ Errore salvataggio ${fieldCode} per User ID ${this.userId}:`, error);
      return false;
    }
  }
}

/**
 * Factory per creare un'istanza del database per un utente specifico
 */
export function createUserDatabase(userId: number): UserDatabaseSystem {
  return new UserDatabaseSystem(userId);
}