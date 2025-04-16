/**
 * Servizio per il rilevamento automatico delle configurazioni SMTP
 * in base all'indirizzo email dell'utente
 */

// Configurazioni SMTP per i provider di posta elettronica più comuni
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
    instructions: 'Per Gmail potrebbe essere necessario creare una "password per le app" nelle impostazioni di sicurezza Google.'
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
 * Estrae il dominio da un indirizzo email
 * @param email Indirizzo email
 * @returns Dominio dell'email
 */
const getEmailDomain = (email: string): string => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1].toLowerCase();
};

/**
 * Rileva le configurazioni SMTP in base all'indirizzo email
 * @param email Indirizzo email da analizzare
 * @returns Configurazione SMTP se trovata, altrimenti null
 */
export const detectSmtpConfig = (email: string) => {
  if (!email) return null;
  
  const domain = getEmailDomain(email);
  if (!domain) return null;
  
  // Cerca una corrispondenza esatta nel nostro database di provider
  if (smtpConfigurations[domain]) {
    return {
      ...smtpConfigurations[domain],
      smtpUsername: email, // L'username è solitamente l'indirizzo email completo
      senderEmail: email
    };
  }
  
  // Gestione di domini personalizzati o hosting email (configurazione generica)
  return {
    smtpServer: `mail.${domain}`,
    smtpPort: 587,
    secureConnection: false,
    smtpUsername: email,
    senderEmail: email,
    instructions: 'Queste sono impostazioni generiche. Contatta il tuo provider email se non funzionano.'
  };
};

export const smtpDetectionService = {
  detectSmtpConfig
};