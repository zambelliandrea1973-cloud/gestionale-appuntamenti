import { sendSystemEmail } from './systemEmailService';

export const welcomeEmailService = {
  async sendWelcomeEmail(
    recipientEmail: string,
    username: string,
    password: string,
    name?: string
  ): Promise<boolean> {
    try {
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
      <h1>Welcome to Appointment Manager!</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${displayName}</strong>,</p>
      <p>Your registration has been completed successfully! You can now access the platform to manage your appointments easily and professionally.</p>
      
      <div class="credentials">
        <h3>Your login credentials</h3>
        <div class="credential-item">
          <span class="label">Username:</span> <span class="value">${username}</span>
        </div>
        <div class="credential-item">
          <span class="label">Password:</span> <span class="value">${password}</span>
        </div>
      </div>
      
      <p><strong>Important:</strong> We recommend keeping these credentials in a safe place and changing your password on first login.</p>
      
      <p>You have <strong>40 days of free trial</strong> to explore all platform features!</p>
      
      <center>
        <a href="${appUrl}" class="button">Access the Platform</a>
      </center>
      
      <div class="footer">
        <p>If you have any questions or need assistance, please do not hesitate to contact us.</p>
        <p>Thank you for choosing Appointment Manager!</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const textContent = `
Welcome to Appointment Manager!

Hello ${displayName},

Your registration has been completed successfully!

Your login credentials:
- Username: ${username}
- Password: ${password}

Important: We recommend keeping these credentials in a safe place and changing your password on first login.

You have 40 days of free trial to explore all platform features!

Access the platform: ${appUrl}

Thank you for choosing Appointment Manager!
      `;

      const result = await sendSystemEmail(
        recipientEmail,
        'Welcome to Appointment Manager - Your login credentials',
        htmlContent,
        textContent
      );

      if (result.success) {
        console.log(`📧 [WELCOME EMAIL] Welcome email sent to ${recipientEmail}`);
      } else {
        console.log(`📧 [WELCOME EMAIL] Welcome email NOT sent to ${recipientEmail}: ${result.error}`);
      }
      return result.success;
    } catch (error: any) {
      console.error('📧 [WELCOME EMAIL] Error sending welcome email:', error.message);
      return false;
    }
  }
};
