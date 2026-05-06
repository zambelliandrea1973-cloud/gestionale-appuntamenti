import { db } from '../db';
import { licenses, users, userSettings } from '../../shared/schema';
import { eq, and, lt, gte } from 'drizzle-orm';
import { getEmailConfig } from '../utils/emailConfig';
import nodemailer from 'nodemailer';
import {
  normalizeLang,
  SupportedLang,
  getTrialExpiryStrings,
  formatDate,
} from '../utils/emailTranslations';
import { getUserLanguage } from '../utils/userLanguage';

/**
 * Determine the base application URL
 */
function getAppBaseUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS}`;
  }

  return 'https://gestionale-appuntamenti.sliplane.app';
}

/**
 * Service for sending expiring trial notifications
 * Send email 10 days before expiry (day 30 of the 40-day trial)
 */
export const trialNotificationService = {
  /**
   * Find all trial users that should receive the notification
   * Criteria: active trial, expires in 9-11 days, notification not yet sent
   */
  async findTrialUsersToNotify() {
    try {
      const now = new Date();
      const nineDaysFromNow = new Date(now);
      nineDaysFromNow.setDate(nineDaysFromNow.getDate() + 9);

      const elevenDaysFromNow = new Date(now);
      elevenDaysFromNow.setDate(elevenDaysFromNow.getDate() + 11);

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

      console.log(`📧 Found ${trialLicenses.length} trial users to notify (expiring in 9-11 days)`);
      return trialLicenses;
    } catch (error) {
      console.error('❌ Error finding trial users to notify:', error);
      return [];
    }
  },

  /**
   * Generate the email HTML template with plan comparison, in the user's language
   */
  generateTrialExpiryEmailHTML(username: string, expiryDate: Date, lang: SupportedLang = 'it'): string {
    const t = getTrialExpiryStrings(lang);
    const formattedDate = formatDate(expiryDate, lang);
    const appBaseUrl = getAppBaseUrl();

    const warningText = t.warningText.replace('{date}', formattedDate);

    const renderFeatureList = (enabled: string[], disabled: string[]): string => {
      const enabledItems = enabled.map(f => `<li>${f}</li>`).join('');
      const disabledItems = disabled.map(f => `<li class="disabled">${f}</li>`).join('');
      return enabledItems + disabledItems;
    };

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
    <h1>${t.headerTitle}</h1>
  </div>

  <div class="content">
    <p>${t.greeting} <strong>${username}</strong>,</p>

    <div class="warning-box">
      <strong>${warningText}</strong><br>
      ${t.afterDateText}
    </div>

    <p>${t.choosePlan}</p>

    <!-- BASE Plan -->
    <div class="plan-card">
      <div class="plan-header">${t.basePlanTitle}</div>
      <div class="plan-price">€5.99 <span style="font-size:16px; color:#666;">${t.perMonth}</span></div>
      <div class="plan-price-annual">
        €59.00${t.perYear} <span class="savings">${t.saveLabel} €11.88</span>
      </div>
      <p style="color:#666; margin:10px 0;"><strong>${t.basePlanLimit}</strong></p>
      <ul class="features">
        ${renderFeatureList(t.baseFeatures, t.baseDisabled)}
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <a href="${appBaseUrl}/subscribe?plan=base" class="cta-button" style="display:inline-block;">
          ${t.basePlanBuy}
        </a>
      </div>
    </div>

    <!-- PRO Plan -->
    <div class="plan-card featured">
      <div class="plan-header">${t.proPlanTitle}</div>
      <div class="plan-price">€9.99 <span style="font-size:16px; color:#666;">${t.perMonth}</span></div>
      <div class="plan-price-annual">
        €99.00${t.perYear} <span class="savings">${t.saveLabel} €19.88</span>
      </div>
      <p style="color:#666; margin:10px 0;"><strong>${t.proPlanLimit}</strong></p>
      <ul class="features">
        ${renderFeatureList(t.proFeatures, t.proDisabled)}
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <a href="${appBaseUrl}/subscribe?plan=pro" class="cta-button" style="display:inline-block;">
          ${t.proPlanBuy}
        </a>
      </div>
    </div>

    <!-- BUSINESS Plan -->
    <div class="plan-card">
      <div class="plan-header">${t.businessPlanTitle}</div>
      <div class="plan-price">€19.99 <span style="font-size:16px; color:#666;">${t.perMonth}</span></div>
      <div class="plan-price-annual">
        €199.00${t.perYear} <span class="savings">${t.saveLabel} €39.88</span>
      </div>
      <p style="color:#666; margin:10px 0;"><strong>${t.businessPlanLimit}</strong></p>
      <ul class="features">
        ${renderFeatureList(t.businessFeatures, [])}
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <a href="${appBaseUrl}/subscribe?plan=business" class="cta-button" style="display:inline-block;">
          ${t.businessPlanBuy}
        </a>
      </div>
    </div>

    <p style="margin-top:30px; color:#666;">
      <strong>Note:</strong> ${t.note}
    </p>
  </div>

  <div class="footer">
    <p>${t.contactUs}</p>
    <p style="color:#999; font-size:12px;">${t.automatedNotice}</p>
  </div>
</body>
</html>
    `;
  },

  /**
   * Send trial expiry notification email
   */
  async sendTrialExpiryEmail(userEmail: string, username: string, expiryDate: Date, userId: number): Promise<boolean> {
    try {
      const emailConfig = await getEmailConfig(userId);

      if (!emailConfig || !emailConfig.emailEnabled) {
        console.warn(`⚠️ Email configuration not available for user ${userId}, using environment fallback`);
        if (!process.env.EMAIL_ADDRESS || !process.env.EMAIL_PASSWORD) {
          console.error('❌ No email configuration available (neither user nor global)');
          return false;
        }
      }

      // Fetch user language preference
      const lang = await getUserLanguage(userId);
      const t = getTrialExpiryStrings(lang);

      const transporter = nodemailer.createTransport({
        host: emailConfig?.smtpServer || process.env.SMTP_SERVER || 'smtp.gmail.com',
        port: emailConfig?.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: emailConfig?.emailAddress || process.env.EMAIL_ADDRESS,
          pass: emailConfig?.emailPassword || process.env.EMAIL_PASSWORD,
        },
      });

      const htmlContent = this.generateTrialExpiryEmailHTML(username, expiryDate, lang);

      const mailOptions = {
        from: emailConfig?.emailAddress || process.env.EMAIL_ADDRESS,
        to: userEmail,
        subject: t.subject,
        html: htmlContent,
      };

      console.log(`📧 Sending trial expiry email to ${userEmail} (lang: ${lang})...`);
      await transporter.sendMail(mailOptions);
      console.log(`✅ Trial expiry email sent successfully to ${userEmail}`);

      return true;
    } catch (error: any) {
      console.error(`❌ Error sending trial expiry email to ${userEmail}:`, error.message);
      return false;
    }
  },

  /**
   * Process all expiring trial notifications
   * Called by the daily scheduler
   */
  async processTrialNotifications(): Promise<{ sent: number; failed: number }> {
    console.log('📧 Starting processing of expiring trial notifications...');

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
          await db
            .update(licenses)
            .set({
              trialNotificationSent: true,
              trialNotificationSentAt: new Date(),
            })
            .where(eq(licenses.id, user.licenseId));

          sentCount++;
          console.log(`✅ Trial notification sent to ${user.username} (${user.userEmail})`);
        } else {
          failedCount++;
          console.error(`❌ Failed to send trial notification to ${user.username}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ Error processing notification for ${user.username}:`, error);
      }
    }

    console.log(`📊 Trial notifications processing completed: ${sentCount} sent, ${failedCount} failed`);
    return { sent: sentCount, failed: failedCount };
  },
};
