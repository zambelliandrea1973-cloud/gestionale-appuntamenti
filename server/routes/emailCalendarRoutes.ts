// @ts-nocheck
import { Router } from 'express';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { emailCalendarSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { getUserLanguage } from '../utils/userLanguage';
import { buildDefaultEmailTemplate, buildDefaultEmailSubject } from '../utils/emailConfig';

const router = Router();

// Get email and calendar settings
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await db.query.emailCalendarSettings.findFirst({
      where: eq(emailCalendarSettings.userId, userId),
    });

    const lang = await getUserLanguage(userId);

    if (!settings) {
      settings = await db.insert(emailCalendarSettings).values({
        userId,
        emailEnabled: false,
        emailTemplate: buildDefaultEmailTemplate(lang),
        emailSubject: buildDefaultEmailSubject(lang),
      }).returning().then(rows => rows[0]);
    }

    const settingsToSend = {
      ...settings,
      emailPassword: settings.emailPassword ? '••••••••••' : '',
      hasPasswordSaved: !!settings.emailPassword,
    };
    
    res.json(settingsToSend);
  } catch (error: any) {
    console.error('Error loading email settings:', error);
    res.status(500).json({ error: 'Error loading settings' });
  }
});

// Saved SMTP credentials are write-only and must never be returned to a browser.
router.get('/show-password', isAuthenticated, async (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Saved passwords cannot be displayed. Enter a new password to replace it.'
  });
});

// Update email and calendar settings
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
    
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, error: 'Error saving' });
  }
});

// Send a test email
router.post('/send-test-email', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const settings = await db.query.emailCalendarSettings.findFirst({
      where: eq(emailCalendarSettings.userId, userId),
    });

    const lang = await getUserLanguage(userId);

    if (!settings?.emailEnabled || !settings?.emailAddress || !settings?.emailPassword) {
      return res.status(400).json({ success: false, error: 'Missing email credentials' });
    }
    
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email missing' });
    }
    let testSubject = settings.emailSubject || buildDefaultEmailSubject(lang);
    let testMessage = settings.emailTemplate || buildDefaultEmailTemplate(lang);
    
    testSubject = testSubject.replace(/{{data}}/g, '15/05/2025');
    testMessage = testMessage
      .replace(/{{nome}}/g, 'Mario')
      .replace(/{{cognome}}/g, 'Rossi')
      .replace(/{{servizio}}/g, 'Consultation')
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
    
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, error: 'Error sending test email' });
  }
});

export default router;
