/**
 * Service for automatic SMTP configuration detection
 * based on the user's email address
 */

// SMTP configurations for the most common email providers
const smtpConfigurations: Record<string, {
  smtpServer: string;
  smtpPort: number;
  secureConnection: boolean;
  instructions?: string;
}> = {
  'gmail.com': {
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    secureConnection: false,
    instructions: 'For Gmail you need to create an "app password" in Google security settings. Go to https://myaccount.google.com/apppasswords per crearla.'
  },
  'outlook.com': {
    smtpServer: 'smtp-mail.outlook.com',
    smtpPort: 587,
    secureConnection: false
  },
  'hotmail.com': {
    smtpServer: 'smtp-mail.outlook.com',
    smtpPort: 587,
    secureConnection: false
  },
  'live.com': {
    smtpServer: 'smtp-mail.outlook.com',
    smtpPort: 587,
    secureConnection: false
  },
  'yahoo.com': {
    smtpServer: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    secureConnection: false,
    instructions: 'Per Yahoo Mail potrebbe essere necessario generare una "password per app" nelle impostazioni dell\'account.'
  },
  'icloud.com': {
    smtpServer: 'smtp.mail.me.com',
    smtpPort: 587,
    secureConnection: false
  },
  'me.com': {
    smtpServer: 'smtp.mail.me.com',
    smtpPort: 587,
    secureConnection: false
  },
  'libero.it': {
    smtpServer: 'smtp.libero.it',
    smtpPort: 465,
    secureConnection: true
  },
  'virgilio.it': {
    smtpServer: 'smtp.virgilio.it',
    smtpPort: 465,
    secureConnection: true
  },
  'alice.it': {
    smtpServer: 'out.alice.it',
    smtpPort: 587,
    secureConnection: false
  },
  'tim.it': {
    smtpServer: 'box.posta.tim.it',
    smtpPort: 587,
    secureConnection: false
  },
  'poste.it': {
    smtpServer: 'relay.poste.it',
    smtpPort: 25,
    secureConnection: false
  },
  'vodafone.it': {
    smtpServer: 'smtp.vodafone.it',
    smtpPort: 587,
    secureConnection: false
  },
  'aruba.it': {
    smtpServer: 'smtp.aruba.it',
    smtpPort: 587,
    secureConnection: false
  },
  'email.it': {
    smtpServer: 'out.email.it',
    smtpPort: 587,
    secureConnection: false
  },
  'tiscali.it': {
    smtpServer: 'smtp.tiscali.it',
    smtpPort: 587,
    secureConnection: false
  },
  'fastwebnet.it': {
    smtpServer: 'smtp.fastwebnet.it',
    smtpPort: 587,
    secureConnection: false
  }
};

/**
 * Extract the domain from an email address
 * @param email Address email
 * @returns Email domain
 */
const getEmailDomain = (email: string): string => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1].toLowerCase();
};

/**
 * Detect SMTP configurations based on the email address
 * @param email Address email da analizzare
 * @returns SMTP configuration if found, otherwise null
 */
export const detectSmtpConfig = (email: string) => {
  if (!email) return null;
  
  const domain = getEmailDomain(email);
  if (!domain) return null;
  
  // Find an exact match in our provider database
  if (smtpConfigurations[domain]) {
    return {
      ...smtpConfigurations[domain],
      smtpUsername: email, // The username is usually the full email address
      senderEmail: email
    };
  }
  
  // Handling of custom domains or email hosting (generic configuration)
  return {
    smtpServer: `mail.${domain}`,
    smtpPort: 587,
    secureConnection: false,
    smtpUsername: email,
    senderEmail: email,
    instructions: 'These are generic settings. Contact your email provider if they don't work.'
  };
};

export const smtpDetectionService = {
  detectSmtpConfig
};