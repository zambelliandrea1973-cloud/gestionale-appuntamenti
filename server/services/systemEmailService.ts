import nodemailer from 'nodemailer';
import { getEmailConfig } from '../utils/emailConfig';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface SystemEmailResult {
  success: boolean;
  senderEmail: string;
  error?: string;
}

export async function getSystemTransporter(): Promise<{ transporter: nodemailer.Transporter; senderEmail: string } | null> {
  try {
    const admins = await db.select().from(users).where(eq(users.type, 'admin'));
    if (!admins.length) {
      console.log('📧 [SYSTEM EMAIL] Nessun utente admin trovato nel database');
      return null;
    }

    console.log(`📧 [SYSTEM EMAIL] Trovati ${admins.length} admin, cercando quello con SMTP configurato...`);

    const { userSettings } = await import('../../shared/schema');

    for (const admin of admins) {
      console.log(`📧 [SYSTEM EMAIL] Verifico admin ID ${admin.id} (${admin.username})...`);

      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, admin.id)).limit(1);

      if (settings?.smtpEnabled && settings?.smtpEmail && settings?.smtpPasswordEncrypted) {
        console.log(`📧 [SYSTEM EMAIL] Admin ID ${admin.id} ha SMTP configurato nel DB`);
        const config = await getEmailConfig(admin.id);
        if (config && config.emailEnabled && config.emailAddress && config.emailPassword) {
          console.log(`📧 [SYSTEM EMAIL] Usando config admin ID ${admin.id}: ${config.emailAddress}`);
          const transporter = nodemailer.createTransport({
            host: config.smtpServer || 'smtp.gmail.com',
            port: config.smtpPort || 587,
            secure: false,
            auth: {
              user: config.emailAddress,
              pass: config.emailPassword,
            },
          });
          return { transporter, senderEmail: config.emailAddress };
        }
      } else {
        console.log(`📧 [SYSTEM EMAIL] Admin ID ${admin.id} NON ha SMTP nel DB, salto`);
      }
    }

    console.log(`📧 [SYSTEM EMAIL] Nessun admin con SMTP nel DB, provo fallback...`);
    const config = await getEmailConfig(admins[0].id);
    if (config && config.emailEnabled && config.emailAddress && config.emailPassword) {
      console.log(`📧 [SYSTEM EMAIL] Fallback config primo admin: ${config.emailAddress}`);
      const transporter = nodemailer.createTransport({
        host: config.smtpServer || 'smtp.gmail.com',
        port: config.smtpPort || 587,
        secure: false,
        auth: {
          user: config.emailAddress,
          pass: config.emailPassword,
        },
      });
      return { transporter, senderEmail: config.emailAddress };
    }

    const systemPassword = process.env.SYSTEM_EMAIL_PASSWORD;
    if (systemPassword) {
      const systemEmail = 'zambelli.andrea.1973@gmail.com';
      console.log(`📧 [SYSTEM EMAIL] Ultimo fallback: SYSTEM_EMAIL_PASSWORD con ${systemEmail}`);
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: systemEmail,
          pass: systemPassword.replace(/\s/g, ''),
        },
      });
      return { transporter, senderEmail: systemEmail };
    }

    console.log('📧 [SYSTEM EMAIL] Nessuna configurazione email disponibile');
    return null;
  } catch (error) {
    console.error('📧 [SYSTEM EMAIL] Errore caricamento config:', error);
    return null;
  }
}

export async function sendSystemEmail(to: string, subject: string, html: string, text?: string): Promise<SystemEmailResult> {
  const system = await getSystemTransporter();
  if (!system) {
    return { success: false, senderEmail: '', error: 'Configurazione email non disponibile' };
  }

  try {
    await system.transporter.sendMail({
      from: `"Gestionale Appuntamenti" <${system.senderEmail}>`,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    console.log(`📧 [SYSTEM EMAIL] Email inviata a ${to} da ${system.senderEmail}`);
    return { success: true, senderEmail: system.senderEmail };
  } catch (error: any) {
    console.error(`📧 [SYSTEM EMAIL] Errore invio a ${to}:`, error.message);
    return { success: false, senderEmail: system.senderEmail, error: error.message };
  }
}
