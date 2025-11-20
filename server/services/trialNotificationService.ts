import { db } from '../db';
import { licenses, users, userSettings } from '../../shared/schema';
import { eq, and, lt, gte, isNull } from 'drizzle-orm';
import { getEmailConfig } from '../utils/emailConfig';
import nodemailer from 'nodemailer';

/**
 * Determina l'URL base dell'applicazione
 * Usa APP_URL se impostato (produzione), altrimenti usa REPLIT_DOMAINS (sviluppo)
 */
function getAppBaseUrl(): string {
  // Priorità 1: Variabile d'ambiente APP_URL (produzione Sliplane)
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, ''); // Rimuovi trailing slash
  }
  
  // Priorità 2: REPLIT_DOMAINS (sviluppo su Replit)
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS}`;
  }
  
  // Fallback: dominio produzione hardcoded
  return 'https://gestionale-appuntamenti.sliplane.app';
}

/**
 * Servizio per l'invio di notifiche trial in scadenza
 * Invia email 10 giorni prima della scadenza (giorno 30 del trial di 40 giorni)
 */
export const trialNotificationService = {
  /**
   * Trova tutti gli utenti trial che devono ricevere la notifica
   * Criteri: trial attivo, scade tra 9-11 giorni, notifica non ancora inviata
   */
  async findTrialUsersToNotify() {
    try {
      const now = new Date();
      const tenDaysFromNow = new Date(now);
      tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
      
      const nineDaysFromNow = new Date(now);
      nineDaysFromNow.setDate(nineDaysFromNow.getDate() + 9);
      
      const elevenDaysFromNow = new Date(now);
      elevenDaysFromNow.setDate(elevenDaysFromNow.getDate() + 11);
      
      // Query licenze trial attive che scadono tra 9-11 giorni e non hanno ricevuto notifica
      const trialLicenses = await db
        .select({
          licenseId: licenses.id,
          userId: licenses.userId,
          expiresAt: licenses.expiresAt,
          userEmail: users.email,
          username: users.username,
        })
        .from(licenses)
        .innerJoin(users, eq(licenses.userId, users.id))
        .where(
          and(
            eq(licenses.type, 'trial'),
            eq(licenses.isActive, true),
            gte(licenses.expiresAt, nineDaysFromNow),
            lt(licenses.expiresAt, elevenDaysFromNow),
            eq(licenses.trialNotificationSent, false)
          )
        );
      
      console.log(`📧 Trovati ${trialLicenses.length} utenti trial da notificare (scadenza tra 9-11 giorni)`);
      return trialLicenses;
    } catch (error) {
      console.error('❌ Errore nel trovare utenti trial da notificare:', error);
      return [];
    }
  },

  /**
   * Genera il template HTML dell'email con comparazione piani
   */
  generateTrialExpiryEmailHTML(username: string, expiryDate: Date): string {
    const formattedDate = expiryDate.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    const appBaseUrl = getAppBaseUrl();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .plan-card { background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .plan-card.featured { border-color: #667eea; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2); }
    .plan-header { font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
    .plan-price { font-size: 32px; font-weight: bold; color: #333; margin: 15px 0; }
    .plan-price-annual { font-size: 18px; color: #666; margin: 10px 0; }
    .savings { background: #4ade80; color: white; display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
    .features { list-style: none; padding: 0; margin: 20px 0; }
    .features li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .features li:before { content: "✓ "; color: #4ade80; font-weight: bold; margin-right: 8px; }
    .features li.disabled { color: #999; }
    .features li.disabled:before { content: "✗ "; color: #ccc; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ Il tuo trial scade tra 10 giorni</h1>
  </div>
  
  <div class="content">
    <p>Ciao <strong>${username}</strong>,</p>
    
    <div class="warning-box">
      <strong>Il tuo periodo di prova terminerà il ${formattedDate}.</strong><br>
      Dopo questa data, l'accesso sarà sospeso fino alla scelta di un piano di abbonamento.
    </div>
    
    <p>Per continuare a utilizzare il nostro sistema di gestione, scegli il piano più adatto alle tue esigenze:</p>

    <!-- Piano BASE -->
    <div class="plan-card">
      <div class="plan-header">📅 Piano BASE</div>
      <div class="plan-price">€5,99 <span style="font-size:16px; color:#666;">/mese</span></div>
      <div class="plan-price-annual">
        €59,00/anno <span class="savings">Risparmi €11,88</span>
      </div>
      <p style="color:#666; margin:10px 0;"><strong>Limite:</strong> 100 clienti</p>
      <ul class="features">
        <li>Calendario appuntamenti</li>
        <li>Gestione clienti</li>
        <li>App QR/PWA per clienti</li>
        <li>Richiesta appuntamenti cliente</li>
        <li>Notifiche clienti</li>
        <li>Emissione fatture</li>
        <li class="disabled">Sincronizzazione Google Calendar</li>
        <li class="disabled">Report e statistiche</li>
        <li class="disabled">Pacchetti promozionali</li>
        <li class="disabled">Gestione più dipendenti</li>
        <li class="disabled">Magazzino prodotti</li>
        <li class="disabled">Campagne Marketing AI</li>
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <a href="${appBaseUrl}/subscribe?plan=base" class="cta-button" style="display:inline-block;">
          Acquista Piano BASE
        </a>
      </div>
    </div>

    <!-- Piano PRO -->
    <div class="plan-card featured">
      <div class="plan-header">⭐ Piano PRO</div>
      <div class="plan-price">€9,99 <span style="font-size:16px; color:#666;">/mese</span></div>
      <div class="plan-price-annual">
        €99,00/anno <span class="savings">Risparmi €19,88</span>
      </div>
      <p style="color:#666; margin:10px 0;"><strong>Limite:</strong> 500 clienti</p>
      <ul class="features">
        <li>Tutte le funzionalità BASE</li>
        <li>Sincronizzazione Google Calendar</li>
        <li>Report e statistiche</li>
        <li>Pacchetti promozionali</li>
        <li class="disabled">Gestione più dipendenti</li>
        <li class="disabled">Magazzino prodotti</li>
        <li class="disabled">Campagne Marketing AI</li>
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <a href="${appBaseUrl}/subscribe?plan=pro" class="cta-button" style="display:inline-block;">
          Acquista Piano PRO
        </a>
      </div>
    </div>

    <!-- Piano BUSINESS -->
    <div class="plan-card">
      <div class="plan-header">🚀 Piano BUSINESS</div>
      <div class="plan-price">€19,99 <span style="font-size:16px; color:#666;">/mese</span></div>
      <div class="plan-price-annual">
        €199,00/anno <span class="savings">Risparmi €39,88</span>
      </div>
      <p style="color:#666; margin:10px 0;"><strong>Clienti illimitati</strong></p>
      <ul class="features">
        <li>Tutte le funzionalità PRO</li>
        <li>Gestione più dipendenti</li>
        <li>Magazzino prodotti</li>
        <li>Campagne Marketing AI</li>
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <a href="${appBaseUrl}/subscribe?plan=business" class="cta-button" style="display:inline-block;">
          Acquista Piano BUSINESS
        </a>
      </div>
    </div>

    <p style="margin-top:30px; color:#666;">
      <strong>Nota:</strong> I tuoi dati rimarranno al sicuro e saranno disponibili non appena attiverai un abbonamento.
    </p>
  </div>

  <div class="footer">
    <p>Hai domande? Contattaci rispondendo a questa email.</p>
    <p style="color:#999; font-size:12px;">Questa è una notifica automatica del sistema.</p>
  </div>
</body>
</html>
    `;
  },

  /**
   * Invia email di notifica trial in scadenza
   */
  async sendTrialExpiryEmail(userEmail: string, username: string, expiryDate: Date, userId: number): Promise<boolean> {
    try {
      // Recupera configurazione email per l'utente
      const emailConfig = await getEmailConfig(userId);
      
      if (!emailConfig || !emailConfig.emailEnabled) {
        console.warn(`⚠️ Configurazione email non disponibile per utente ${userId}, uso fallback ambiente`);
        // Fallback su configurazione globale se disponibile
        if (!process.env.EMAIL_ADDRESS || !process.env.EMAIL_PASSWORD) {
          console.error('❌ Nessuna configurazione email disponibile (né utente né globale)');
          return false;
        }
      }

      // Crea trasportatore SMTP
      const transporter = nodemailer.createTransport({
        host: emailConfig?.smtpServer || process.env.SMTP_SERVER || 'smtp.gmail.com',
        port: emailConfig?.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: emailConfig?.emailAddress || process.env.EMAIL_ADDRESS,
          pass: emailConfig?.emailPassword || process.env.EMAIL_PASSWORD,
        },
      });

      const htmlContent = this.generateTrialExpiryEmailHTML(username, expiryDate);

      const mailOptions = {
        from: emailConfig?.emailAddress || process.env.EMAIL_ADDRESS,
        to: userEmail,
        subject: '⏰ Il tuo periodo di prova scade tra 10 giorni',
        html: htmlContent,
      };

      console.log(`📧 Invio email trial expiry a ${userEmail}...`);
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email trial expiry inviata con successo a ${userEmail}`);
      
      return true;
    } catch (error: any) {
      console.error(`❌ Errore invio email trial expiry a ${userEmail}:`, error.message);
      return false;
    }
  },

  /**
   * Processa tutte le notifiche trial in scadenza
   * Chiamato dallo scheduler giornaliero
   */
  async processTrialNotifications(): Promise<{ sent: number; failed: number }> {
    console.log('📧 Inizio elaborazione notifiche trial in scadenza...');
    
    const usersToNotify = await this.findTrialUsersToNotify();
    let sentCount = 0;
    let failedCount = 0;

    for (const user of usersToNotify) {
      try {
        const success = await this.sendTrialExpiryEmail(
          user.userEmail,
          user.username,
          user.expiresAt!,
          user.userId!
        );

        if (success) {
          // Aggiorna flag notifica inviata
          await db
            .update(licenses)
            .set({
              trialNotificationSent: true,
              trialNotificationSentAt: new Date(),
            })
            .where(eq(licenses.id, user.licenseId));
          
          sentCount++;
          console.log(`✅ Notifica trial inviata a ${user.username} (${user.userEmail})`);
        } else {
          failedCount++;
          console.error(`❌ Fallito invio notifica trial a ${user.username}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ Errore elaborazione notifica per ${user.username}:`, error);
      }
    }

    console.log(`📊 Elaborazione notifiche trial completata: ${sentCount} inviate, ${failedCount} fallite`);
    return { sent: sentCount, failed: failedCount };
  },
};
