// @ts-nocheck
import { Router } from 'express';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { emailCalendarSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Template predefinito per l'email
const DEFAULT_EMAIL_TEMPLATE = `Gentile {{nome}} {{cognome}},

Questo è un promemoria per il Suo appuntamento di {{servizio}} previsto per il giorno {{data}} alle ore {{ora}}.

Per qualsiasi modifica o cancellazione, La preghiamo di contattarci.

Cordiali saluti,
Studio Professionale`;

// Oggetto predefinito per l'email
const DEFAULT_EMAIL_SUBJECT = "Promemoria appuntamento del {{data}}";

// Ottieni le impostazioni email e calendario
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non autorizzato' });

    let settings = await db.query.emailCalendarSettings.findFirst({
      where: eq(emailCalendarSettings.userId, userId),
    });

    if (!settings) {
      settings = await db.insert(emailCalendarSettings).values({
        userId,
        emailEnabled: false,
        emailTemplate: DEFAULT_EMAIL_TEMPLATE,
        emailSubject: DEFAULT_EMAIL_SUBJECT,
      }).returning().then(r => r[0]);
    }

    const settingsToSend = {
      ...settings,
      emailPassword: settings.emailPassword ? '••••••••••' : '',
      hasPasswordSaved: !!settings.emailPassword,
    };
    
    res.json(settingsToSend);
  } catch (error: any) {
    console.error('Errore caricamento impostazioni email:', error);
    res.status(500).json({ error: 'Errore caricamento impostazioni' });
  }
});

// Endpoint per ottenere la password in chiaro
router.get('/show-password', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non autorizzato' });

    const settings = await db.query.emailCalendarSettings.findFirst({
      where: eq(emailCalendarSettings.userId, userId),
    });

    if (!settings?.emailPassword) {
      return res.status(404).json({ success: false, error: 'Nessuna password salvata' });
    }

    res.json({ success: true, emailPassword: settings.emailPassword });
  } catch (error: any) {
    console.error('Errore lettura password:', error);
    res.status(500).json({ error: 'Errore lettura password' });
  }
});

// Aggiorna le impostazioni email e calendario
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non autorizzato' });

    const updateData = { ...req.body, updatedAt: new Date() };
    
    const existing = await db.query.emailCalendarSettings.findFirst({
      where: eq(emailCalendarSettings.userId, userId),
    });

    if (existing) {
      await db.update(emailCalendarSettings)
        .set(updateData)
        .where(eq(emailCalendarSettings.userId, userId));
    } else {
      await db.insert(emailCalendarSettings)
        .values({ userId, ...updateData });
    }
    
    res.json({ success: true, message: 'Impostazioni aggiornate con successo' });
  } catch (error: any) {
    console.error('Errore salvataggio impostazioni:', error);
    res.status(500).json({ success: false, error: 'Errore salvataggio' });
  }
});

// Invia un'email di test
router.post('/send-test-email', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non autorizzato' });

    const settings = await db.query.emailCalendarSettings.findFirst({
      where: eq(emailCalendarSettings.userId, userId),
    });

    if (!settings?.emailEnabled || !settings?.emailAddress || !settings?.emailPassword) {
      return res.status(400).json({ success: false, error: 'Credenziali email mancanti' });
    }
    
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email mancante' });
    
    let testSubject = settings.emailSubject || DEFAULT_EMAIL_SUBJECT;
    let testMessage = settings.emailTemplate || DEFAULT_EMAIL_TEMPLATE;
    
    testSubject = testSubject.replace(/{{data}}/g, '15/05/2025');
    testMessage = testMessage
      .replace(/{{nome}}/g, 'Mario')
      .replace(/{{cognome}}/g, 'Rossi')
      .replace(/{{servizio}}/g, 'Consulenza')
      .replace(/{{data}}/g, '15/05/2025')
      .replace(/{{ora}}/g, '10:00');
    
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: settings.emailAddress, pass: settings.emailPassword },
      debug: true,
    });
    
    await transporter.verify();
    const info = await transporter.sendMail({
      from: settings.emailAddress,
      to: email,
      subject: testSubject,
      text: testMessage,
      html: testMessage.replace(/\n/g, '<br>'),
    });
    
    res.json({ success: true, message: 'Email di test inviata con successo' });
  } catch (error: any) {
    console.error('Errore invio email test:', error);
    res.status(500).json({ success: false, error: 'Errore invio email test' });
  }
});

export default router;