import { logger } from '../utils/logger';
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
      console.log('📧 [SYSTEM EMAIL] No admin user found in database');
      return null;
    }

    logger.debug(`📧 [SYSTEM EMAIL] Found ${admins.length} admin, looking for one with SMTP configured...`);

    const { userSettings } = await import('../../shared/schema');

    for (const admin of admins) {
      logger.debug(`📧 [SYSTEM EMAIL] Verifico admin ID ${admin.id} (${admin.username})...`);

      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, admin.id)).limit(1);

      if (settings?.smtpEnabled && settings?.smtpEmail && settings?.smtpPasswordEncrypted) {
        logger.debug(`📧 [SYSTEM EMAIL] Admin ID ${admin.id} has SMTP configured in DB`);
        const config = await getEmailConfig(admin.id);
        if (config && config.emailEnabled && config.emailAddress && config.emailPassword) {
          logger.debug(`📧 [SYSTEM EMAIL] Usando config admin ID ${admin.id}: ${config.emailAddress}`);
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
        logger.debug(`📧 [SYSTEM EMAIL] Admin ID ${admin.id} does NOT have SMTP in DB, skipping`);
      }
    }

    logger.debug(`📧 [SYSTEM EMAIL] No admin with SMTP in DB, trying fallback...`);
    const config = await getEmailConfig(admins[0].id);
    if (config && config.emailEnabled && config.emailAddress && config.emailPassword) {
      logger.debug(`📧 [SYSTEM EMAIL] Fallback config first admin: ${config.emailAddress}`);
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
      logger.debug(`📧 [SYSTEM EMAIL] Last fallback: SYSTEM_EMAIL_PASSWORD with ${systemEmail}`);
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

    console.log('📧 [SYSTEM EMAIL] No email configuration available');
    return null;
  } catch (error) {
    console.error('📧 [SYSTEM EMAIL] Error loading config:', error);
    return null;
  }
}

export async function sendSystemEmail(to: string, subject: string, html: string, text?: string): Promise<SystemEmailResult> {
  const system = await getSystemTransporter();
  if (!system) {
    return { success: false, senderEmail: '', error: 'Email configuration not available' };
  }

  try {
    await system.transporter.sendMail({
      from: `"Gestionale Appuntamenti" <${system.senderEmail}>`,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    logger.debug(`📧 [SYSTEM EMAIL] Email sent to ${to} from ${system.senderEmail}`);
    return { success: true, senderEmail: system.senderEmail };
  } catch (error: any) {
    console.error(`📧 [SYSTEM EMAIL] Error sending to ${to}:`, error.message);
    return { success: false, senderEmail: system.senderEmail, error: error.message };
  }
}
