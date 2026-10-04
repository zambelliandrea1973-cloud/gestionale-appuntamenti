import fs from 'fs';
import { db } from '../db';
import { userSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { decryptPassword } from './encryption';
import { getReminderEmailStrings, SupportedLang } from './emailTranslations';
import { getUserLanguage } from './userLanguage';

export interface EmailConfig {
  emailEnabled: boolean;
  emailAddress: string;
  emailPassword: string;
  smtpServer?: string;
  smtpPort?: number;
  emailTemplate?: string;
  emailSubject?: string;
  calendarEnabled?: boolean;
  calendarId?: string;
  googleAuthStatus?: {
    authorized: boolean;
  };
}

// Builds the default reminder email template in the given language
export function buildDefaultEmailTemplate(lang: SupportedLang = 'it'): string {
  const s = getReminderEmailStrings(lang);
  return `${s.greeting} {{nome}} {{cognome}},\n\n${s.bodyIntro} ${s.forService} {{servizio}} ${s.onDate} {{data}} ${s.atTime} {{ora}}.\n\n${s.closing}\n\nCordiali saluti,\nStudio Professionale`;
}

export function buildDefaultEmailSubject(lang: SupportedLang = 'it'): string {
  const s = getReminderEmailStrings(lang);
  return `${s.subject} {{data}}`;
}

// Legacy English defaults (used only as fallback when no userId is available)
const DEFAULT_TEMPLATE = buildDefaultEmailTemplate('it');
const DEFAULT_SUBJECT = buildDefaultEmailSubject('it');

export async function getEmailConfig(userId: number): Promise<EmailConfig | null> {
  try {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    
    if (settings?.smtpEnabled && settings?.smtpEmail && settings?.smtpPasswordEncrypted) {
      console.log(`✅ [EMAIL CONFIG] Using DB credentials for user ${userId}`);
      
      let password: string;
      try {
        password = decryptPassword(settings.smtpPasswordEncrypted);
      } catch (error) {
        console.error('❌ [EMAIL CONFIG] Error decrypting password, falling back to ENV/JSON');
        return await getFallbackEmailConfig();
      }
      
      return {
        emailEnabled: true,
        emailAddress: settings.smtpEmail,
        emailPassword: password,
        smtpServer: settings.smtpServer || 'smtp.gmail.com',
        smtpPort: settings.smtpPort || 587,
        emailTemplate: settings.emailTemplate || DEFAULT_TEMPLATE,
        emailSubject: settings.emailSubject || DEFAULT_SUBJECT,
        calendarEnabled: settings.calendarIntegrationEnabled || false,
        calendarId: settings.defaultCalendarId || '',
        googleAuthStatus: { authorized: false }
      };
    }
    
    console.log(`⚠️ [EMAIL CONFIG] No SMTP config in DB for user ${userId}, fallback a ENV/JSON`);
    return await getFallbackEmailConfig();
    
  } catch (error) {
    console.error('❌ [EMAIL CONFIG] Error loading DB configuration:', error);
    return await getFallbackEmailConfig();
  }
}

async function getFallbackEmailConfig(): Promise<EmailConfig | null> {
  if (process.env.EMAIL_ADDRESS && process.env.EMAIL_PASSWORD) {
    console.log('✅ [EMAIL CONFIG] Using credentials from environment variables');
    return {
      emailEnabled: process.env.EMAIL_ENABLED !== 'false',
      emailAddress: process.env.EMAIL_ADDRESS,
      emailPassword: process.env.EMAIL_PASSWORD,
      smtpServer: process.env.SMTP_SERVER || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      emailTemplate: process.env.EMAIL_TEMPLATE || DEFAULT_TEMPLATE,
      emailSubject: process.env.EMAIL_SUBJECT || DEFAULT_SUBJECT,
      calendarEnabled: process.env.CALENDAR_ENABLED === 'true',
      calendarId: process.env.CALENDAR_ID || '',
      googleAuthStatus: { authorized: false }
    };
  }
  
  if (fs.existsSync('email_settings.json')) {
    console.log('✅ [EMAIL CONFIG] Using credentials from email_settings.json (backwards compatibility)');
    const fileContent = fs.readFileSync('email_settings.json', 'utf8');
    const jsonConfig = JSON.parse(fileContent);
    return {
      emailEnabled: jsonConfig.emailEnabled || false,
      emailAddress: jsonConfig.emailAddress,
      emailPassword: jsonConfig.emailPassword,
      smtpServer: 'smtp.gmail.com',
      smtpPort: 587,
      emailTemplate: jsonConfig.emailTemplate || DEFAULT_TEMPLATE,
      emailSubject: jsonConfig.emailSubject || DEFAULT_SUBJECT,
      calendarEnabled: jsonConfig.calendarEnabled || false,
      calendarId: jsonConfig.calendarId || '',
      googleAuthStatus: jsonConfig.googleAuthStatus || { authorized: false }
    };
  }
  
  console.warn('⚠️ [EMAIL CONFIG] No email configuration found (DB, ENV, or JSON)');
  return null;
}
