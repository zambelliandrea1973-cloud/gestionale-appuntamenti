/**
 * CUSTOM DATABASE SYSTEM FOR EACH USER
 * System implementation with unique codes as per provided schema
 */

// Map of unique codes for each customizable field
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
  
  // Email configurations (COD_014 - COD_018)
  EMAIL_PROVIDER: 'COD_014',     // Provider Email
  EMAIL_API_KEY: 'COD_015',      // Chiave API Email
  EMAIL_FROM_NAME: 'COD_016',    // Nome Mittente
  EMAIL_FROM_ADDRESS: 'COD_017', // Indirizzo Mittente
  EMAIL_SIGNATURE: 'COD_018',    // Firma Email
  
  // Orari e Appointments (COD_019 - COD_024)
  WORKING_HOURS_START: 'COD_019', // Orario Inizio
  WORKING_HOURS_END: 'COD_020',   // Orario Fine
  WORKING_DAYS: 'COD_021',        // Giorni Lavorativi
  TIME_SLOT_DURATION: 'COD_022',  // Durata Slot
  
  // Fatturazione (COD_023 - COD_025)
  INVOICE_PREFIX: 'COD_023',      // Invoice Prefix
  TAX_RATE: 'COD_024',           // Aliquota IVA
  CURRENCY: 'COD_025'            // Valuta
} as const;

/**
 * Class to manage each user's custom database
 */
export class UserDatabaseSystem {
  private userId: number;
  
  constructor(userId: number) {
    this.userId = userId;
  }
  
  /**
   * Retrieve a value from the user's database using the unique code
   */
  async getValue(fieldCode: string): Promise<string | null> {
    // Implementation that retrieves from the specific user's database
    return this.getUserFieldValue(fieldCode);
  }
  
  /**
   * Set a value in the user database using the unique code
   */
  async setValue(fieldCode: string, value: string): Promise<boolean> {
    // Implementation that saves to the specific user's database
    return this.setUserFieldValue(fieldCode, value);
  }
  
  /**
   * Retrieve ALL values from the user's database at login
   */
  async getAllUserData(): Promise<Record<string, string | null>> {
    const userData: Record<string, string | null> = {};
    
    // Load all values usando i codici univoci
    for (const [key, code] of Object.entries(FIELD_CODES)) {
      userData[code] = await this.getValue(code);
    }
    
    return userData;
  }
  
  /**
   * Initialize the database of the user con values predefiniti PERSONALIZZATI
   */
  async initializeUserDatabase(): Promise<void> {
    console.log(`🎯 SEPARATE DATABASE INITIALIZATION for User ID: ${this.userId}`);
    
    // CUSTOM default values for each user - AS IN YOUR SCHEMA
    const defaultValues = {
      [FIELD_CODES.BUSINESS_NAME]: `Activity ${this.userId}`,
      [FIELD_CODES.TEXT_SIZE]: "16px", 
      [FIELD_CODES.FONT_TYPE]: "Arial",
      [FIELD_CODES.TEXT_STYLE]: "normal",
      [FIELD_CODES.PRIMARY_COLOR]: `#${(0x1000000 + (Math.random()) * 0xffffff).toString(16).substr(1,6)}`, // Colore primario casuale
      [FIELD_CODES.SECONDARY_COLOR]: "#ffffff", // White secondary color
      [FIELD_CODES.WORKING_HOURS_START]: "09:00",
      [FIELD_CODES.WORKING_HOURS_END]: "18:00", 
      [FIELD_CODES.TIME_SLOT_DURATION]: "30",
      [FIELD_CODES.INVOICE_PREFIX]: `INV-${this.userId}`,
      [FIELD_CODES.TAX_RATE]: "22.00",
      [FIELD_CODES.CURRENCY]: "EUR"
    };
    
    // Force initialization with custom values for each user
    for (const [code, value] of Object.entries(defaultValues)) {
      const existing = await this.getValue(code);
      if (!existing || existing === "La tua Attività" || existing === "INV") {
        // Force saving of custom values
        const success = await this.setValue(code, value);
        console.log(`🎯 INITIALIZED ${code}="${value}" for User ID ${this.userId}: ${success ? 'OK' : 'ERROR'}`);
      } else {
        console.log(`🎯 already EXISTS ${code}="${existing}" for User ID ${this.userId}`);
      }
    }
  }
  
  // Metodi privati di implementazione - REPLICANO IL SISTEMA BACKUP15
  private async getUserFieldValue(fieldCode: string): Promise<string | null> {
    try {
      // USA IL CLIENT POSTGRES DIRETTO CON SINTASSI CORRETTA
      const postgres = (await import('postgres')).default;
      const sql = postgres(process.env.DATABASE_URL!);
      
      const result = await sql`
        SELECT value FROM user_custom_data 
        WHERE user_id = ${this.userId} AND field_code = ${fieldCode}
      `;
      
      await sql.end();
      
      if (result.length > 0) {
        const value = result[0].value as string;
        console.log(`✅ CODE ${fieldCode}: Retrieved "${value}" for User ID ${this.userId}`);
        return value;
      } else {
        console.log(`🔍 CODE ${fieldCode}: No settings found for User ID ${this.userId}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Error retrieving ${fieldCode} for User ID ${this.userId}:`, error);
      return null;
    }
  }
  
  private async setUserFieldValue(fieldCode: string, value: string): Promise<boolean> {
    try {
      // USA LA STESSA SINTASSI DEL METODO DI LETTURA
      const postgres = (await import('postgres')).default;
      const sql = postgres(process.env.DATABASE_URL!);
      
      const result = await sql`
        INSERT INTO user_custom_data (user_id, field_code, value, created_at, updated_at)
        VALUES (${this.userId}, ${fieldCode}, ${value}, NOW(), NOW())
        ON CONFLICT (user_id, field_code) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        RETURNING *
      `;
      
      await sql.end();
      
      console.log(`✅ CODE ${fieldCode}: Saved "${value}" for User ID ${this.userId} in separate database`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error saving ${fieldCode} for User ID ${this.userId}:`, error);
      return false;
    }
  }
}

/**
 * Factory to create a database instance for a specific user
 */
export function createUserDatabase(userId: number): UserDatabaseSystem {
  return new UserDatabaseSystem(userId);
}