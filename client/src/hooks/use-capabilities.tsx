import { useUserWithLicense } from './use-user-with-license';

// Definizione delle capabilities disponibili nel sistema
export type Capability = 
  | 'calendar'              // Calendario base
  | 'email_notifications'   // Notifiche email
  | 'whatsapp_notifications' // Notifiche WhatsApp
  | 'invoices_reports'      // Fatture e Report
  | 'google_calendar'       // Integrazione Google Calendar
  | 'client_pwa_qr'         // App clienti con QR code
  | 'staff_rooms'           // Staff e Stanze (gestione dipendenti)
  | 'unlimited_clients';    // Clienti illimitati

// Mappa delle capabilities per tipo di licenza
const CAPABILITY_MAP: Record<string, Capability[]> = {
  // Trial/Gratuito - funzionalità base limitate
  'trial': [
    'calendar',
    'email_notifications',
  ],
  
  // Base - include WhatsApp + Fatture/Report
  'base': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices_reports',
  ],
  
  // Pro - Base + Google Calendar + App clienti
  'pro': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices_reports',
    'google_calendar',
    'client_pwa_qr',
  ],
  
  // Business - Pro + Staff/Stanze + Illimitati
  'business': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices_reports',
    'google_calendar',
    'client_pwa_qr',
    'staff_rooms',
    'unlimited_clients',
  ],
  
  // Staff - Accesso completo a tutto (gratis per 10 anni)
  'staff_free': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices_reports',
    'google_calendar',
    'client_pwa_qr',
    'staff_rooms',
    'unlimited_clients',
  ],
  
  // Passepartout - Accesso completo a tutto
  'passepartout': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices_reports',
    'google_calendar',
    'client_pwa_qr',
    'staff_rooms',
    'unlimited_clients',
  ],
};

// Messaggi di upgrade per ogni capability
export const UPGRADE_MESSAGES: Record<Capability, {
  title: string;
  description: string;
  requiredPlan: string;
}> = {
  calendar: {
    title: 'Calendario non disponibile',
    description: 'Il calendario è disponibile dal piano Base in su.',
    requiredPlan: 'Base',
  },
  email_notifications: {
    title: 'Notifiche email non disponibili',
    description: 'Le notifiche email sono disponibili dal piano Base in su.',
    requiredPlan: 'Base',
  },
  whatsapp_notifications: {
    title: 'WhatsApp non disponibile',
    description: 'Le notifiche WhatsApp sono disponibili dal piano Base in su.',
    requiredPlan: 'Base',
  },
  invoices_reports: {
    title: 'Fatture e Report non disponibili',
    description: 'Fatture e Report sono disponibili dal piano Base in su.',
    requiredPlan: 'Base',
  },
  google_calendar: {
    title: 'Google Calendar non disponibile',
    description: 'L\'integrazione con Google Calendar è disponibile solo nei piani Pro e Business.',
    requiredPlan: 'Pro',
  },
  client_pwa_qr: {
    title: 'App Clienti non disponibile',
    description: 'L\'app clienti scaricabile con QR code è disponibile solo nei piani Pro e Business.',
    requiredPlan: 'Pro',
  },
  staff_rooms: {
    title: 'Gestione Staff non disponibile',
    description: 'La gestione di staff e stanze è disponibile solo nel piano Business.',
    requiredPlan: 'Business',
  },
  unlimited_clients: {
    title: 'Limite clienti raggiunto',
    description: 'Passa al piano Business per avere clienti illimitati.',
    requiredPlan: 'Business',
  },
};

export function useCapabilities() {
  const { user } = useUserWithLicense();
  
  // Ottieni le capabilities dell'utente corrente
  const userCapabilities = user?.licenseInfo?.type 
    ? CAPABILITY_MAP[user.licenseInfo.type] || []
    : [];
  
  // Verifica se l'utente ha una specifica capability
  const hasCapability = (capability: Capability): boolean => {
    return userCapabilities.includes(capability);
  };
  
  // Ottieni il messaggio di upgrade per una capability
  const getUpgradeMessage = (capability: Capability) => {
    return UPGRADE_MESSAGES[capability];
  };
  
  // Ottieni il piano corrente
  const currentPlan = user?.licenseInfo?.type || 'trial';
  
  // Verifica se il piano è scaduto
  const isPlanExpired = user?.licenseInfo?.isActive === false;
  
  return {
    hasCapability,
    getUpgradeMessage,
    currentPlan,
    isPlanExpired,
    userCapabilities,
  };
}
