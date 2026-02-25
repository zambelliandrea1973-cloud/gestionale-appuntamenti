import nodemailer from 'nodemailer';
import { getEmailConfig } from '../utils/emailConfig';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export const welcomeEmailService = {
  async sendWelcomeEmail(
    recipientEmail: string,
    username: string,
    password: string,
    name?: string
  ): Promise<boolean> {
    try {
      const adminEmailConfig = await getAdminEmailConfig();
      
      if (!adminEmailConfig) {
        console.log('📧 [WELCOME EMAIL] Nessuna configurazione email admin disponibile, skip invio');
        return false;
      }

      console.log(`📧 [WELCOME EMAIL] Usando credenziali admin: ${adminEmailConfig.emailAddress}`);

      const transporter = nodemailer.createTransport({
        host: adminEmailConfig.smtpServer || 'smtp.gmail.com',
        port: adminEmailConfig.smtpPort || 587,
        secure: false,
        auth: {
          user: adminEmailConfig.emailAddress,
          pass: adminEmailConfig.emailPassword,
        },
      });

      const displayName = name || username;
      const appUrl = process.env.PRODUCTION_DOMAIN || process.env.APP_BASE_URL || 'https://gestionale-appuntamenti.sliplane.app';
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .credential-item { margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .value { font-family: monospace; background: #eee; padding: 5px 10px; border-radius: 4px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Benvenuto in Gestionale Appuntamenti!</h1>
    </div>
    <div class="content">
      <p>Ciao <strong>${displayName}</strong>,</p>
      <p>La tua registrazione è stata completata con successo! Ora puoi accedere alla piattaforma per gestire i tuoi appuntamenti in modo semplice e professionale.</p>
      
      <div class="credentials">
        <h3>Le tue credenziali di accesso</h3>
        <div class="credential-item">
          <span class="label">Username:</span> <span class="value">${username}</span>
        </div>
        <div class="credential-item">
          <span class="label">Password:</span> <span class="value">${password}</span>
        </div>
      </div>
      
      <p><strong>Importante:</strong> Ti consigliamo di conservare queste credenziali in un luogo sicuro e di cambiare la password al primo accesso.</p>
      
      <p>Hai a disposizione <strong>40 giorni di prova gratuita</strong> per esplorare tutte le funzionalità della piattaforma!</p>
      
      <center>
        <a href="${appUrl}" class="button">Accedi alla Piattaforma</a>
      </center>
      
      <div class="footer">
        <p>Se hai domande o hai bisogno di assistenza, non esitare a contattarci.</p>
        <p>Grazie per aver scelto Gestionale Appuntamenti!</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const textContent = `
Benvenuto in Gestionale Appuntamenti!

Ciao ${displayName},

La tua registrazione è stata completata con successo!

Le tue credenziali di accesso:
- Username: ${username}
- Password: ${password}

Importante: Ti consigliamo di conservare queste credenziali in un luogo sicuro e di cambiare la password al primo accesso.

Hai a disposizione 40 giorni di prova gratuita per esplorare tutte le funzionalità della piattaforma!

Accedi alla piattaforma: ${appUrl}

Grazie per aver scelto Gestionale Appuntamenti!
      `;

      const mailOptions = {
        from: `"Gestionale Appuntamenti" <${adminEmailConfig.emailAddress}>`,
        to: recipientEmail,
        subject: 'Benvenuto in Gestionale Appuntamenti - Le tue credenziali di accesso',
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 [WELCOME EMAIL] Email di benvenuto inviata a ${recipientEmail}: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('📧 [WELCOME EMAIL] Errore invio email di benvenuto:', error.message);
      console.error('📧 [WELCOME EMAIL] Dettagli errore:', {
        code: error.code,
        responseCode: error.responseCode,
        command: error.command,
        response: error.response,
      });
      return false;
    }
  }
};

async function getAdminEmailConfig() {
  try {
    const [admin] = await db.select().from(users).where(eq(users.type, 'admin')).limit(1);
    if (!admin) {
      console.log('📧 [WELCOME EMAIL] Nessun utente admin trovato nel database');
      return null;
    }
    
    console.log(`📧 [WELCOME EMAIL] Admin trovato: ID ${admin.id}, username: ${admin.username}`);
    
    const config = await getEmailConfig(admin.id);
    
    if (!config) {
      console.log(`📧 [WELCOME EMAIL] getEmailConfig ha restituito null per admin ID ${admin.id}`);
      return null;
    }
    
    console.log(`📧 [WELCOME EMAIL] Config admin: enabled=${config.emailEnabled}, address=${config.emailAddress}, hasPassword=${!!config.emailPassword}, smtp=${config.smtpServer}:${config.smtpPort}`);
    
    if (config.emailEnabled && config.emailAddress && config.emailPassword) {
      return config;
    }
    
    console.log(`📧 [WELCOME EMAIL] Config email admin (ID ${admin.id}) non completa o disabilitata`);
    return null;
  } catch (error) {
    console.error('📧 [WELCOME EMAIL] Errore caricamento config admin:', error);
    return null;
  }
}
