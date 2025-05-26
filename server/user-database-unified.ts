/**
 * SISTEMA UNIFICATO DATABASE SEPARATI - RISCRITTURA COMPLETA
 * 
 * Gestisce TUTTI i campi personalizzabili per ogni account in modo armonico:
 * - Nome aziendale, colori, contatti, social media, orari, fatturazione
 * - Schema unico di lettura/scrittura per tutti i campi
 * - Completa indipendenza dal database condiviso eliminato
 */

import postgres from 'postgres';

export const UNIFIED_FIELD_CODES = {
  // Branding
  BUSINESS_NAME: 'COD_001',
  PRIMARY_COLOR: 'COD_002', 
  SECONDARY_COLOR: 'COD_003',
  LOGO_URL: 'COD_004',
  THEME: 'COD_005',
  APPEARANCE: 'COD_006',
  
  // Contatti
  CONTACT_EMAIL: 'COD_007',
  CONTACT_PHONE: 'COD_008',
  CONTACT_PHONE2: 'COD_009',
  WEBSITE: 'COD_010',
  ADDRESS: 'COD_011',
  
  // Social Media
  INSTAGRAM: 'COD_012',
  FACEBOOK: 'COD_013',
  LINKEDIN: 'COD_014',
  
  // Business Settings
  WORKING_HOURS_START: 'COD_015',
  WORKING_HOURS_END: 'COD_016',
  APPOINTMENT_DURATION: 'COD_017',
  
  // Fatturazione
  INVOICE_PREFIX: 'COD_018',
  TAX_RATE: 'COD_019',
  CURRENCY: 'COD_020'
} as const;

export class UnifiedUserDatabase {
  private userId: number;
  private sql: any;

  constructor(userId: number) {
    this.userId = userId;
  }

  /**
   * Inizializza la connessione database
   */
  private async initConnection() {
    if (!this.sql) {
      this.sql = postgres(process.env.DATABASE_URL!);
    }
    return this.sql;
  }

  /**
   * Chiude la connessione database
   */
  private async closeConnection() {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
    }
  }

  /**
   * LETTURA SINGOLO CAMPO - Metodo unificato per tutti i campi
   */
  async getField(fieldCode: string): Promise<string | null> {
    try {
      const sql = await this.initConnection();
      
      const result = await sql`
        SELECT value FROM user_custom_data 
        WHERE user_id = ${this.userId} AND field_code = ${fieldCode}
      `;
      
      await this.closeConnection();
      
      if (result.length > 0) {
        console.log(`✅ UNIFIED GET ${fieldCode}: "${result[0].value}" per User ID ${this.userId}`);
        return result[0].value;
      } else {
        console.log(`🔍 UNIFIED GET ${fieldCode}: Nessun valore per User ID ${this.userId}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ UNIFIED GET ${fieldCode} per User ID ${this.userId}:`, error);
      await this.closeConnection();
      return null;
    }
  }

  /**
   * SCRITTURA SINGOLO CAMPO - Metodo unificato per tutti i campi
   */
  async setField(fieldCode: string, value: string): Promise<boolean> {
    try {
      const sql = await this.initConnection();
      
      await sql`
        INSERT INTO user_custom_data (user_id, field_code, value, created_at, updated_at)
        VALUES (${this.userId}, ${fieldCode}, ${value}, NOW(), NOW())
        ON CONFLICT (user_id, field_code) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
      
      await this.closeConnection();
      
      console.log(`✅ UNIFIED SET ${fieldCode}: Salvato "${value}" per User ID ${this.userId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ UNIFIED SET ${fieldCode} per User ID ${this.userId}:`, error);
      await this.closeConnection();
      return false;
    }
  }

  /**
   * LETTURA MULTIPLA - Recupera tutti i campi dell'account in una sola query
   */
  async getAllFields(): Promise<Record<string, string | null>> {
    try {
      const sql = await this.initConnection();
      
      const result = await sql`
        SELECT field_code, value FROM user_custom_data 
        WHERE user_id = ${this.userId}
      `;
      
      await this.closeConnection();
      
      const data: Record<string, string | null> = {};
      result.forEach((row: any) => {
        data[row.field_code] = row.value;
      });
      
      console.log(`✅ UNIFIED GET ALL: Caricati ${result.length} campi per User ID ${this.userId}`);
      return data;
      
    } catch (error) {
      console.error(`❌ UNIFIED GET ALL per User ID ${this.userId}:`, error);
      await this.closeConnection();
      return {};
    }
  }

  /**
   * FUNZIONE ELIMINATA - Causava sovrascrittura dei dati salvati
   * Ora si usa solo setField() per salvare singoli campi
   */

  /**
   * INIZIALIZZAZIONE DISABILITATA - Non sovrascrive mai i dati
   */
  async initializeAccount(): Promise<boolean> {
    // COMPLETAMENTE DISABILITATA per evitare sovrascrittura dati
    console.log(`🚫 INIT DISABILITATA per User ID ${this.userId} - preservo dati esistenti`);
    return true;
  }
}

/**
 * Factory per creare istanza database unificato
 */
export function createUnifiedUserDatabase(userId: number): UnifiedUserDatabase {
  return new UnifiedUserDatabase(userId);
}

/**
 * Helper per mappare nomi campi ai codici
 */
export const FIELD_MAPPING = {
  'businessName': UNIFIED_FIELD_CODES.BUSINESS_NAME,
  'primaryColor': UNIFIED_FIELD_CODES.PRIMARY_COLOR,
  'secondaryColor': UNIFIED_FIELD_CODES.SECONDARY_COLOR,
  'logoUrl': UNIFIED_FIELD_CODES.LOGO_URL,
  'theme': UNIFIED_FIELD_CODES.THEME,
  'appearance': UNIFIED_FIELD_CODES.APPEARANCE,
  'contactEmail': UNIFIED_FIELD_CODES.CONTACT_EMAIL,
  'contactPhone': UNIFIED_FIELD_CODES.CONTACT_PHONE,
  'contactPhone2': UNIFIED_FIELD_CODES.CONTACT_PHONE2,
  'website': UNIFIED_FIELD_CODES.WEBSITE,
  'address': UNIFIED_FIELD_CODES.ADDRESS,
  'instagramHandle': UNIFIED_FIELD_CODES.INSTAGRAM,
  'facebookPage': UNIFIED_FIELD_CODES.FACEBOOK,
  'linkedinProfile': UNIFIED_FIELD_CODES.LINKEDIN,
  'workingHoursStart': UNIFIED_FIELD_CODES.WORKING_HOURS_START,
  'workingHoursEnd': UNIFIED_FIELD_CODES.WORKING_HOURS_END,
  'appointmentDuration': UNIFIED_FIELD_CODES.APPOINTMENT_DURATION,
  'invoicePrefix': UNIFIED_FIELD_CODES.INVOICE_PREFIX,
  'taxRate': UNIFIED_FIELD_CODES.TAX_RATE,
  'currency': UNIFIED_FIELD_CODES.CURRENCY
} as const;