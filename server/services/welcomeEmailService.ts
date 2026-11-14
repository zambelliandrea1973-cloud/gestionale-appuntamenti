import { sendSystemEmail } from './systemEmailService';
import { normalizeLang, SupportedLang, getWelcomeStrings } from '../utils/emailTranslations';
import {
  buildItalianHelpCallOfferHtml,
  buildItalianHelpCallOfferText,
  escapeEmailHtml,
} from './italianHelpCallOffer';
import { sendEmailWithRetry } from './emailDeliveryRetry';

export interface WelcomeEmailDeliveryResult {
  sent: boolean;
  attempts: number;
  error?: string;
}

export const welcomeEmailService = {
  async sendWelcomeEmail(
    recipientEmail: string,
    username: string,
    password: string,
    name?: string,
    language?: string,
    beforeAttempt?: (attempt: number) => Promise<void>,
  ): Promise<WelcomeEmailDeliveryResult> {
    try {
      const lang: SupportedLang = normalizeLang(language);
      const t = getWelcomeStrings(lang);
      const displayName = name || username;
      const appUrl = process.env.PRODUCTION_DOMAIN || process.env.APP_BASE_URL || 'https://gestionale-appuntamenti.sliplane.app';
      const helpOfferHtml = buildItalianHelpCallOfferHtml(lang);
      const helpOfferText = buildItalianHelpCallOfferText(lang);

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
      <h1>${t.title}</h1>
    </div>
    <div class="content">
      <p>${t.greeting} <strong>${escapeEmailHtml(displayName)}</strong>,</p>
      <p>${t.registrationSuccess}</p>

      <div class="credentials">
        <h3>${t.credentialsTitle}</h3>
        <div class="credential-item">
          <span class="label">${t.emailLabel}:</span> <span class="value">${escapeEmailHtml(recipientEmail)}</span>
        </div>
        ${username.toLowerCase() !== recipientEmail.toLowerCase() ? `
        <div class="credential-item">
          <span class="label">${t.usernameLabel}:</span> <span class="value">${escapeEmailHtml(username)}</span>
        </div>` : ''}
        <div class="credential-item">
          <span class="label">${t.passwordLabel}:</span> <span class="value">${escapeEmailHtml(password)}</span>
        </div>
      </div>

      <p><strong>${t.importantNote}</strong></p>

      <p>${t.trialNote}</p>
      ${helpOfferHtml}

      <center>
        <a href="${escapeEmailHtml(appUrl)}" class="button">${t.accessButton}</a>
      </center>

      <div class="footer">
        <p>${t.helpText}</p>
        <p>${t.thankYou}</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const textContent = `
${t.title}

${t.greeting} ${displayName},

${t.registrationSuccess}

${t.credentialsTitle}:
- ${t.emailLabel}: ${recipientEmail}
${username.toLowerCase() !== recipientEmail.toLowerCase() ? `- ${t.usernameLabel}: ${username}\n` : ''}- ${t.passwordLabel}: ${password}

${t.importantNote}

${t.trialNote.replace(/<[^>]+>/g, '')}

${helpOfferText}

${t.accessButton}: ${appUrl}

${t.thankYou}
      `;

      const delivery = await sendEmailWithRetry(
        () => sendSystemEmail(recipientEmail, t.subject, htmlContent, textContent),
        {
          maxAttempts: 3,
          retryDelayMs: [1000, 3000],
          beforeAttempt,
          onRetry: (attempt, error) => {
            console.warn(`[WELCOME EMAIL] Temporary delivery failure; retrying attempt ${attempt + 1}/3: ${error}`);
          },
        },
      );

      if (delivery.result.success) {
        console.log(`📧 [WELCOME EMAIL] Welcome email sent to ${recipientEmail} (lang: ${lang}, attempts: ${delivery.attempts})`);
      } else {
        console.error(`📧 [WELCOME EMAIL] Welcome email not sent to ${recipientEmail} after ${delivery.attempts} attempt(s): ${delivery.result.error || 'unknown email delivery error'}`);
      }
      return {
        sent: delivery.result.success,
        attempts: delivery.attempts,
        ...(delivery.result.error ? { error: delivery.result.error } : {}),
      };
    } catch (error: any) {
      console.error('📧 [WELCOME EMAIL] Error sending welcome email:', error.message);
      return {
        sent: false,
        attempts: 0,
        error: error?.message || 'Unknown welcome email error',
      };
    }
  }
};
