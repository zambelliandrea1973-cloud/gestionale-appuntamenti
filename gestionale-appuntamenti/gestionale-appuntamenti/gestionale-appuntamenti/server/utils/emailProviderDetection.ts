/**
 * 📧 AUTO-DETECTION PROVIDER EMAIL
 * Rileva automaticamente le configurazioni SMTP da un indirizzo email
 */

export interface EmailProviderConfig {
  smtp_server: string;
  smtp_port: number;
  requiresAppPassword?: boolean;
  providerName?: string;
}

/**
 * Rileva il provider email e restituisce le configurazioni SMTP corrette
 */
export function detectEmailProvider(email: string): EmailProviderConfig | null {
  if (!email || !email.includes('@')) return null;

  const domain = email.toLowerCase().split('@')[1];

  // 📋 DATABASE PROVIDER EMAIL ITALIANI E INTERNAZIONALI
  const providers: Record<string, EmailProviderConfig> = {
    // GMAIL (richiede App Password se 2FA attiva)
    'gmail.com': {
      smtp_server: 'smtp.gmail.com',
      smtp_port: 587,
      requiresAppPassword: true,
      providerName: 'Gmail'
    },
    'googlemail.com': {
      smtp_server: 'smtp.gmail.com',
      smtp_port: 587,
      requiresAppPassword: true,
      providerName: 'Gmail'
    },

    // LIBERO
    'libero.it': {
      smtp_server: 'smtp.libero.it',
      smtp_port: 587,
      providerName: 'Libero'
    },

    // OUTLOOK / HOTMAIL
    'outlook.com': {
      smtp_server: 'smtp-mail.outlook.com',
      smtp_port: 587,
      providerName: 'Outlook'
    },
    'outlook.it': {
      smtp_server: 'smtp-mail.outlook.com',
      smtp_port: 587,
      providerName: 'Outlook'
    },
    'hotmail.com': {
      smtp_server: 'smtp-mail.outlook.com',
      smtp_port: 587,
      providerName: 'Hotmail'
    },
    'hotmail.it': {
      smtp_server: 'smtp-mail.outlook.com',
      smtp_port: 587,
      providerName: 'Hotmail'
    },
    'live.com': {
      smtp_server: 'smtp-mail.outlook.com',
      smtp_port: 587,
      providerName: 'Live'
    },
    'live.it': {
      smtp_server: 'smtp-mail.outlook.com',
      smtp_port: 587,
      providerName: 'Live'
    },

    // YAHOO
    'yahoo.com': {
      smtp_server: 'smtp.mail.yahoo.com',
      smtp_port: 587,
      providerName: 'Yahoo'
    },
    'yahoo.it': {
      smtp_server: 'smtp.mail.yahoo.com',
      smtp_port: 587,
      providerName: 'Yahoo'
    },

    // ARUBA
    'aruba.it': {
      smtp_server: 'smtp.aruba.it',
      smtp_port: 587,
      providerName: 'Aruba'
    },
    'arubapec.it': {
      smtp_server: 'smtp.arubapec.it',
      smtp_port: 587,
      providerName: 'Aruba PEC'
    },

    // VIRGILIO
    'virgilio.it': {
      smtp_server: 'out.virgilio.it',
      smtp_port: 587,
      providerName: 'Virgilio'
    },

    // FASTWEB
    'fastwebnet.it': {
      smtp_server: 'smtp.fastwebnet.it',
      smtp_port: 587,
      providerName: 'Fastweb'
    },

    // TISCALI
    'tiscali.it': {
      smtp_server: 'smtp.tiscali.it',
      smtp_port: 587,
      providerName: 'Tiscali'
    },

    // ALICE / TIM
    'alice.it': {
      smtp_server: 'out.alice.it',
      smtp_port: 587,
      providerName: 'Alice/TIM'
    },
    'tim.it': {
      smtp_server: 'smtp.tim.it',
      smtp_port: 587,
      providerName: 'TIM'
    },

    // IOL
    'iol.it': {
      smtp_server: 'smtp.iol.it',
      smtp_port: 587,
      providerName: 'IOL'
    },

    // REGISTER.IT
    'register.it': {
      smtp_server: 'smtps.register.it',
      smtp_port: 587,
      providerName: 'Register.it'
    },

    // ICLOUD
    'icloud.com': {
      smtp_server: 'smtp.mail.me.com',
      smtp_port: 587,
      requiresAppPassword: true,
      providerName: 'iCloud'
    },
    'me.com': {
      smtp_server: 'smtp.mail.me.com',
      smtp_port: 587,
      requiresAppPassword: true,
      providerName: 'iCloud'
    },

    // AOL
    'aol.com': {
      smtp_server: 'smtp.aol.com',
      smtp_port: 587,
      providerName: 'AOL'
    },

    // ZOHO
    'zoho.com': {
      smtp_server: 'smtp.zoho.com',
      smtp_port: 587,
      providerName: 'Zoho'
    },
    'zoho.eu': {
      smtp_server: 'smtp.zoho.eu',
      smtp_port: 587,
      providerName: 'Zoho'
    },

    // TIN.IT
    'tin.it': {
      smtp_server: 'smtp.tin.it',
      smtp_port: 587,
      providerName: 'TIN.it'
    },

    // INWIND
    'inwind.it': {
      smtp_server: 'smtp.inwind.it',
      smtp_port: 587,
      providerName: 'Inwind'
    },

    // TELE2
    'tele2.it': {
      smtp_server: 'smtp.tele2.it',
      smtp_port: 587,
      providerName: 'Tele2'
    },

    // POSTE ITALIANE
    'poste.it': {
      smtp_server: 'smtp.poste.it',
      smtp_port: 587,
      providerName: 'Poste Italiane'
    },
    'postemail.it': {
      smtp_server: 'smtp.postemail.it',
      smtp_port: 587,
      providerName: 'Poste Italiane'
    },

    // MSN
    'msn.com': {
      smtp_server: 'smtp-mail.outlook.com',
      smtp_port: 587,
      providerName: 'MSN'
    },

    // YAHOO FRANCE (per utenti cross-border)
    'yahoo.fr': {
      smtp_server: 'smtp.mail.yahoo.com',
      smtp_port: 587,
      providerName: 'Yahoo France'
    },

    // INFOSTRADA
    'infinito.it': {
      smtp_server: 'smtp.infinito.it',
      smtp_port: 587,
      providerName: 'Infostrada'
    },

    // WIND (ora WindTre)
    'windtre.it': {
      smtp_server: 'smtp.windtre.it',
      smtp_port: 587,
      providerName: 'WindTre'
    },

    // PEC PROVIDERS (Posta Elettronica Certificata)
    'pec.it': {
      smtp_server: 'smtp.pec.it',
      smtp_port: 587,
      providerName: 'PEC Italia'
    },
    'legalmail.it': {
      smtp_server: 'smtps.legalmail.it',
      smtp_port: 587,
      providerName: 'Legalmail PEC'
    },
    'pecimpresa.it': {
      smtp_server: 'smtp.pecimpresa.it',
      smtp_port: 587,
      providerName: 'PEC Impresa'
    }
  };

  return providers[domain] || null;
}

/**
 * Ottiene le configurazioni SMTP finali con fallback automatico
 */
export function getSmtpConfig(
  email: string,
  providedServer?: string,
  providedPort?: number
): EmailProviderConfig {
  // Se sono già forniti server e porta, usali
  if (providedServer && providedPort) {
    return {
      smtp_server: providedServer,
      smtp_port: providedPort
    };
  }

  // Altrimenti, prova auto-detection
  const detected = detectEmailProvider(email);
  if (detected) {
    return detected;
  }

  // Fallback generico (porta 587 standard)
  return {
    smtp_server: providedServer || `smtp.${email.split('@')[1]}`,
    smtp_port: providedPort || 587,
    providerName: 'Custom'
  };
}
