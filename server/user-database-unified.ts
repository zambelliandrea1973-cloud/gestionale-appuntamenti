/**
 * UNIFIED SEPARATE DATABASE SYSTEM - COMPLETE REWRITE
 * 
 * Manages ALL customizable fields for each account in a harmonized way:
 * - Company name, colors, contacts, social media, hours, billing
 * - Single read/write schema for all fields
 * - Full independence from the removed shared database
 */

import postgres from 'postgres';

export const UNIFIED_FIELD_CODES = {
  // ===== BRANDING AND UI =====
  BUSINESS_NAME: 'COD_001',
  PRIMARY_COLOR: 'COD_002', 
  SECONDARY_COLOR: 'COD_003',
  LOGO_URL: 'COD_004',
  THEME: 'COD_005',
  APPEARANCE: 'COD_006',
  
  // ===== BUSINESS NAME TEXT STYLES =====
  FONT_SIZE: 'COD_071',
  FONT_FAMILY: 'COD_072',
  FONT_STYLE: 'COD_073',
  FONT_COLOR: 'COD_074',
  FONT_ENABLED: 'COD_075',
  
  // ===== BUSINESS CONTACTS =====
  CONTACT_EMAIL: 'COD_007',
  CONTACT_PHONE: 'COD_008',
  CONTACT_PHONE2: 'COD_009',
  WEBSITE: 'COD_010',
  ADDRESS: 'COD_011',
  CITY: 'COD_012',
  ZIP_CODE: 'COD_013',
  COUNTRY: 'COD_014',
  
  // ===== SOCIAL MEDIA =====
  INSTAGRAM: 'COD_015',
  FACEBOOK: 'COD_016',
  LINKEDIN: 'COD_017',
  TWITTER: 'COD_018',
  YOUTUBE: 'COD_019',
  TIKTOK: 'COD_020',
  
  // ===== HOURS AND APPOINTMENTS =====
  WORKING_HOURS_START: 'COD_021',
  WORKING_HOURS_END: 'COD_022',
  APPOINTMENT_DURATION: 'COD_023',
  BREAK_DURATION: 'COD_024',
  LUNCH_START: 'COD_025',
  LUNCH_END: 'COD_026',
  DAYS_AVAILABLE: 'COD_027',
  ADVANCE_BOOKING_DAYS: 'COD_028',
  CANCELLATION_HOURS: 'COD_029',
  
  // ===== BILLING AND PAYMENTS =====
  INVOICE_PREFIX: 'COD_030',
  TAX_RATE: 'COD_031',
  CURRENCY: 'COD_032',
  PAYMENT_TERMS: 'COD_033',
  BANK_ACCOUNT: 'COD_034',
  VAT_NUMBER: 'COD_035',
  FISCAL_CODE: 'COD_036',
  
  // ===== SERVICES AND PRICES =====
  DEFAULT_SERVICE_PRICE: 'COD_037',
  CONSULTATION_PRICE: 'COD_038',
  FOLLOW_UP_PRICE: 'COD_039',
  EMERGENCY_SURCHARGE: 'COD_040',
  
  // ===== MESSAGES AND COMMUNICATIONS =====
  WELCOME_MESSAGE: 'COD_041',
  APPOINTMENT_CONFIRMATION_MSG: 'COD_042',
  REMINDER_MESSAGE: 'COD_043',
  CANCELLATION_MESSAGE: 'COD_044',
  NO_SHOW_MESSAGE: 'COD_045',
  
  // ===== CLIENT CUSTOMIZATION =====
  CUSTOM_FIELD_1_NAME: 'COD_046',
  CUSTOM_FIELD_1_TYPE: 'COD_047',
  CUSTOM_FIELD_2_NAME: 'COD_048',
  CUSTOM_FIELD_2_TYPE: 'COD_049',
  CUSTOM_FIELD_3_NAME: 'COD_050',
  CUSTOM_FIELD_3_TYPE: 'COD_051',
  
  // ===== NOTIFICATIONS AND REMINDERS =====
  EMAIL_NOTIFICATIONS: 'COD_052',
  SMS_NOTIFICATIONS: 'COD_053',
  WHATSAPP_NOTIFICATIONS: 'COD_054',
  REMINDER_TIMING: 'COD_055',
  
  // ===== TIMEZONE AND LOCATION =====
  TIMEZONE: 'COD_056',
  LANGUAGE: 'COD_057',
  DATE_FORMAT: 'COD_058',
  TIME_FORMAT: 'COD_059',
  
  // ===== PRIVACY AND GDPR =====
  PRIVACY_POLICY_URL: 'COD_060',
  TERMS_OF_SERVICE_URL: 'COD_061',
  DATA_RETENTION_DAYS: 'COD_062',
  CONSENT_TEXT: 'COD_063',
  
  // ===== ADVANCED CUSTOMIZATION =====
  CUSTOM_CSS: 'COD_064',
  CUSTOM_HEADER: 'COD_065',
  CUSTOM_FOOTER: 'COD_066',
  FAVICON_URL: 'COD_067',
  
  // ===== EXTERNAL INTEGRATIONS =====
  GOOGLE_CALENDAR_ID: 'COD_068',
  STRIPE_ACCOUNT_ID: 'COD_069',
  PAYPAL_ACCOUNT: 'COD_070',
  
  // ===== BACKUP AND SECURITY =====
  BACKUP_FREQUENCY: 'COD_071',
  TWO_FACTOR_AUTH: 'COD_072',
  SESSION_TIMEOUT: 'COD_073',
  
  // ===== UI CUSTOMIZATION =====
  DASHBOARD_LAYOUT: 'COD_074_DASHBOARD',
  SIDEBAR_COLOR: 'COD_075_SIDEBAR',
  BUTTON_STYLE: 'COD_076_BUTTON',
  
  // ===== OTHER BUSINESS FIELDS =====
  BUSINESS_TYPE: 'COD_079',
  SPECIALIZATION: 'COD_080',
  YEARS_EXPERIENCE: 'COD_081',
  CERTIFICATIONS: 'COD_082',
  ABOUT_TEXT: 'COD_083',
  
  // ===== FUTURE EXTENSIONS =====
  CUSTOM_EXTENSION_1: 'COD_084',
  CUSTOM_EXTENSION_2: 'COD_085',
  CUSTOM_EXTENSION_3: 'COD_086',
  CUSTOM_EXTENSION_4: 'COD_087',
  CUSTOM_EXTENSION_5: 'COD_088',
  
  // ===== RESERVED FOR FUTURE IMPLEMENTATIONS =====
  RESERVED_FIELD_1: 'COD_089',
  RESERVED_FIELD_2: 'COD_090',
  RESERVED_FIELD_3: 'COD_091',
  RESERVED_FIELD_4: 'COD_092',
  RESERVED_FIELD_5: 'COD_093',
  RESERVED_FIELD_6: 'COD_094',
  RESERVED_FIELD_7: 'COD_095',
  RESERVED_FIELD_8: 'COD_096',
  RESERVED_FIELD_9: 'COD_097',
  RESERVED_FIELD_10: 'COD_098',
  RESERVED_FIELD_11: 'COD_099',
  SYSTEM_CONFIG: 'COD_100'
} as const;

export class UnifiedUserDatabase {
  private userId: number;
  private sql: any;

  constructor(userId: number) {
    this.userId = userId;
  }

  /**
   * Initialize the database connection
   */
  private async initConnection() {
    if (!this.sql) {
      this.sql = postgres(process.env.DATABASE_URL!);
    }
    return this.sql;
  }

  /**
   * Close the database connection
   */
  private async closeConnection() {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
    }
  }

  /**
   * READ SINGLE FIELD - Unified method for all fields
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
        console.log(`🔍 UNIFIED GET ${fieldCode}: No value for User ID ${this.userId}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ UNIFIED GET ${fieldCode} for User ID ${this.userId}:`, error);
      await this.closeConnection();
      return null;
    }
  }

  /**
   * WRITE SINGLE FIELD - Unified method for all fields
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
      
      console.log(`✅ UNIFIED SET ${fieldCode}: Saved "${value}" for User ID ${this.userId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ UNIFIED SET ${fieldCode} for User ID ${this.userId}:`, error);
      await this.closeConnection();
      return false;
    }
  }

  /**
   * MULTIPLE READ - Retrieve all account fields in a single query
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
      
      console.log(`✅ UNIFIED GET ALL: Loaded ${result.length} fields for User ID ${this.userId}`);
      return data;
      
    } catch (error) {
      console.error(`❌ UNIFIED GET ALL for User ID ${this.userId}:`, error);
      await this.closeConnection();
      return {};
    }
  }

  /**
   * FUNCTION REMOVED - Was causing overwrite of saved date
   * Now use only setField() to save individual fields
   */

  /**
   * INITIALIZATION DISABLED - Never overwrites the data
   */
  async initializeAccount(): Promise<boolean> {
    // COMPLETELY DISABLED to avoid data overwrite
    console.log(`🚫 INIT DISABLED for User ID ${this.userId} - preserving existing data`);
    return true;
  }
}

/**
 * Factory to create a unified database instance
 */
export function createUnifiedUserDatabase(userId: number): UnifiedUserDatabase {
  return new UnifiedUserDatabase(userId);
}

/**
 * Helper to map field names to unique codes - COMPLETE SYSTEM
 */
export const FIELD_MAPPING = {
  // ===== BRANDING AND UI =====
  'businessName': UNIFIED_FIELD_CODES.BUSINESS_NAME,
  'primaryColor': UNIFIED_FIELD_CODES.PRIMARY_COLOR,
  'secondaryColor': UNIFIED_FIELD_CODES.SECONDARY_COLOR,
  'logoUrl': UNIFIED_FIELD_CODES.LOGO_URL,
  'theme': UNIFIED_FIELD_CODES.THEME,
  'appearance': UNIFIED_FIELD_CODES.APPEARANCE,
  
  // ===== BUSINESS CONTACTS =====
  'contactEmail': UNIFIED_FIELD_CODES.CONTACT_EMAIL,
  'contactPhone': UNIFIED_FIELD_CODES.CONTACT_PHONE,
  'contactPhone2': UNIFIED_FIELD_CODES.CONTACT_PHONE2,
  'website': UNIFIED_FIELD_CODES.WEBSITE,
  'address': UNIFIED_FIELD_CODES.ADDRESS,
  'city': UNIFIED_FIELD_CODES.CITY,
  'zipCode': UNIFIED_FIELD_CODES.ZIP_CODE,
  'country': UNIFIED_FIELD_CODES.COUNTRY,
  
  // ===== SOCIAL MEDIA =====
  'instagramHandle': UNIFIED_FIELD_CODES.INSTAGRAM,
  'facebookPage': UNIFIED_FIELD_CODES.FACEBOOK,
  'linkedinProfile': UNIFIED_FIELD_CODES.LINKEDIN,
  'twitterHandle': UNIFIED_FIELD_CODES.TWITTER,
  'youtubeChannel': UNIFIED_FIELD_CODES.YOUTUBE,
  'tiktokHandle': UNIFIED_FIELD_CODES.TIKTOK,
  
  // ===== HOURS AND APPOINTMENTS =====
  'workingHoursStart': UNIFIED_FIELD_CODES.WORKING_HOURS_START,
  'workingHoursEnd': UNIFIED_FIELD_CODES.WORKING_HOURS_END,
  'appointmentDuration': UNIFIED_FIELD_CODES.APPOINTMENT_DURATION,
  'breakDuration': UNIFIED_FIELD_CODES.BREAK_DURATION,
  'lunchStart': UNIFIED_FIELD_CODES.LUNCH_START,
  'lunchEnd': UNIFIED_FIELD_CODES.LUNCH_END,
  'daysAvailable': UNIFIED_FIELD_CODES.DAYS_AVAILABLE,
  'advanceBookingDays': UNIFIED_FIELD_CODES.ADVANCE_BOOKING_DAYS,
  'cancellationHours': UNIFIED_FIELD_CODES.CANCELLATION_HOURS,
  
  // ===== BILLING AND PAYMENTS =====
  'invoicePrefix': UNIFIED_FIELD_CODES.INVOICE_PREFIX,
  'taxRate': UNIFIED_FIELD_CODES.TAX_RATE,
  'currency': UNIFIED_FIELD_CODES.CURRENCY,
  'paymentTerms': UNIFIED_FIELD_CODES.PAYMENT_TERMS,
  'bankAccount': UNIFIED_FIELD_CODES.BANK_ACCOUNT,
  'vatNumber': UNIFIED_FIELD_CODES.VAT_NUMBER,
  'fiscalCode': UNIFIED_FIELD_CODES.FISCAL_CODE,
  
  // ===== SERVICES AND PRICES =====
  'defaultServicePrice': UNIFIED_FIELD_CODES.DEFAULT_SERVICE_PRICE,
  'consultationPrice': UNIFIED_FIELD_CODES.CONSULTATION_PRICE,
  'followUpPrice': UNIFIED_FIELD_CODES.FOLLOW_UP_PRICE,
  'emergencySurcharge': UNIFIED_FIELD_CODES.EMERGENCY_SURCHARGE,
  
  // ===== MESSAGES AND COMMUNICATIONS =====
  'welcomeMessage': UNIFIED_FIELD_CODES.WELCOME_MESSAGE,
  'appointmentConfirmationMsg': UNIFIED_FIELD_CODES.APPOINTMENT_CONFIRMATION_MSG,
  'reminderMessage': UNIFIED_FIELD_CODES.REMINDER_MESSAGE,
  'cancellationMessage': UNIFIED_FIELD_CODES.CANCELLATION_MESSAGE,
  'noShowMessage': UNIFIED_FIELD_CODES.NO_SHOW_MESSAGE,
  
  // ===== CLIENT CUSTOMIZATION =====
  'customField1Name': UNIFIED_FIELD_CODES.CUSTOM_FIELD_1_NAME,
  'customField1Type': UNIFIED_FIELD_CODES.CUSTOM_FIELD_1_TYPE,
  'customField2Name': UNIFIED_FIELD_CODES.CUSTOM_FIELD_2_NAME,
  'customField2Type': UNIFIED_FIELD_CODES.CUSTOM_FIELD_2_TYPE,
  'customField3Name': UNIFIED_FIELD_CODES.CUSTOM_FIELD_3_NAME,
  'customField3Type': UNIFIED_FIELD_CODES.CUSTOM_FIELD_3_TYPE,
  
  // ===== NOTIFICATIONS AND REMINDERS =====
  'emailNotifications': UNIFIED_FIELD_CODES.EMAIL_NOTIFICATIONS,
  'smsNotifications': UNIFIED_FIELD_CODES.SMS_NOTIFICATIONS,
  'whatsappNotifications': UNIFIED_FIELD_CODES.WHATSAPP_NOTIFICATIONS,
  'reminderTiming': UNIFIED_FIELD_CODES.REMINDER_TIMING,
  
  // ===== TIMEZONE AND LOCATION =====
  'timezone': UNIFIED_FIELD_CODES.TIMEZONE,
  'language': UNIFIED_FIELD_CODES.LANGUAGE,
  'dateFormat': UNIFIED_FIELD_CODES.DATE_FORMAT,
  'timeFormat': UNIFIED_FIELD_CODES.TIME_FORMAT,
  
  // ===== PRIVACY AND GDPR =====
  'privacyPolicyUrl': UNIFIED_FIELD_CODES.PRIVACY_POLICY_URL,
  'termsOfServiceUrl': UNIFIED_FIELD_CODES.TERMS_OF_SERVICE_URL,
  'dataRetentionDays': UNIFIED_FIELD_CODES.DATA_RETENTION_DAYS,
  'consentText': UNIFIED_FIELD_CODES.CONSENT_TEXT,
  
  // ===== ADVANCED CUSTOMIZATION =====
  'customCss': UNIFIED_FIELD_CODES.CUSTOM_CSS,
  'customHeader': UNIFIED_FIELD_CODES.CUSTOM_HEADER,
  'customFooter': UNIFIED_FIELD_CODES.CUSTOM_FOOTER,
  'faviconUrl': UNIFIED_FIELD_CODES.FAVICON_URL,
  
  // ===== EXTERNAL INTEGRATIONS =====
  'googleCalendarId': UNIFIED_FIELD_CODES.GOOGLE_CALENDAR_ID,
  'stripeAccountId': UNIFIED_FIELD_CODES.STRIPE_ACCOUNT_ID,
  'paypalAccount': UNIFIED_FIELD_CODES.PAYPAL_ACCOUNT,
  
  // ===== BACKUP AND SECURITY =====
  'backupFrequency': UNIFIED_FIELD_CODES.BACKUP_FREQUENCY,
  'twoFactorAuth': UNIFIED_FIELD_CODES.TWO_FACTOR_AUTH,
  'sessionTimeout': UNIFIED_FIELD_CODES.SESSION_TIMEOUT,
  
  // ===== UI CUSTOMIZATION =====
  'dashboardLayout': UNIFIED_FIELD_CODES.DASHBOARD_LAYOUT,
  'sidebarColor': UNIFIED_FIELD_CODES.SIDEBAR_COLOR,
  'buttonStyle': UNIFIED_FIELD_CODES.BUTTON_STYLE,
  'fontFamily': UNIFIED_FIELD_CODES.FONT_FAMILY,
  'fontSize': UNIFIED_FIELD_CODES.FONT_SIZE,
  
  // ===== OTHER BUSINESS FIELDS =====
  'businessType': UNIFIED_FIELD_CODES.BUSINESS_TYPE,
  'specialization': UNIFIED_FIELD_CODES.SPECIALIZATION,
  'yearsExperience': UNIFIED_FIELD_CODES.YEARS_EXPERIENCE,
  'certifications': UNIFIED_FIELD_CODES.CERTIFICATIONS,
  'aboutText': UNIFIED_FIELD_CODES.ABOUT_TEXT
} as const;