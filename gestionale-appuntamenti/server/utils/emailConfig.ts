import fs from 'fs';
import { db } from '../db';
import { userSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { decryptPassword } from './encryption';

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

const DEFAULT_TEMPLATE = "Gentile {{nome}} {{cognome}},\n\nQuesto è un promemoria per il Suo appuntamento di {{servizio}} previsto per il giorno {{data}} alle ore {{ora}}.\n\nPer qualsiasi modifica o cancellazione, La preghiamo di contattarci.\n\nCordiali saluti,\nStudio Professionale";
const DEFAULT_SUBJECT = "Promemoria appuntamento del {{data}}";

export async function getEmailConfig(userId: number): Promise<EmailConfig | null> {
  try {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    
    if (settings?.smtpEnabled && settings?.smtpEmail && settings?.smtpPasswordEncrypted) {
      console.log(`✅ [EMAIL CONFIG] Usando credenziali DB per utente ${userId}`);
      
      let password: string;
      try {
        password = decryptPassword(settings.smtpPasswordEncrypted);
      } catch (error) {
        console.error('❌ [EMAIL CONFIG] Errore decrypt password, fallback a ENV/JSON');
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
    
    console.log(`⚠️ [EMAIL CONFIG] Nessuna config SMTP in DB per utente ${userId}, fallback a ENV/JSON`);
    return await getFallbackEmailConfig();
    
  } catch (error) {
    console.error('❌ [EMAIL CONFIG] Errore nel caricamento configurazione DB:', error);
    return await getFallbackEmailConfig();
  }
}

async function getFallbackEmailConfig(): Promise<EmailConfig | null> {
  if (process.env.EMAIL_ADDRESS && process.env.EMAIL_PASSWORD) {
    console.log('✅ [EMAIL CONFIG] Usando credenziali da variabili d\'ambiente');
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
    console.log('✅ [EMAIL CONFIG] Usando credenziali da email_settings.json (retrocompatibilità)');
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
  
  console.warn('⚠️ [EMAIL CONFIG] Nessuna configurazione email trovata (DB, ENV, né JSON)');
  return null;
}
