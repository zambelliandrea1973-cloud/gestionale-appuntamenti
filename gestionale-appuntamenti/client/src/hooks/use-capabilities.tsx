import { useUserWithLicense } from './use-user-with-license';

// Definizione delle capabilities disponibili nel sistema
export type Capability = 
  | 'calendar'              // Calendario base
  | 'email_notifications'   // Notifiche email
  | 'whatsapp_notifications' // Notifiche WhatsApp
  | 'invoices'              // Fatture (Trial/Base/Pro/Business)
  | 'reports'               // Report (solo Pro/Business)
  | 'google_calendar'       // Integrazione Google Calendar
  | 'client_pwa_qr'         // App clienti con QR code
  | 'appointment_requests'  // Richiesta appuntamenti da parte dei clienti
  | 'promotional_packages'  // Pacchetti promozionali (Pro+)
  | 'staff_rooms'           // Staff e Stanze (gestione dipendenti)
  | 'warehouse'             // Magazzino/Inventario
  | 'unlimited_clients'     // Clienti illimitati
  | 'marketing_ai';         // Campagne Marketing AI con media (Business+)

// Mappa delle capabilities per tipo di licenza
const CAPABILITY_MAP: Record<string, Capability[]> = {
  // Trial - ACCESSO COMPLETO A TUTTE LE FUNZIONI BUSINESS (40gg gratis)
  'trial': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
  
  // Base - STESSI accessi di Trial (€5.99/mese o €59/anno)
  'base': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'appointment_requests',
  ],
  
  // Pro - Base + Report + Google Calendar + App clienti + Pacchetti (NO Marketing AI)
  'pro': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
  ],
  
  // Business - Pro + Marketing AI + Staff/Stanze + Magazzino + Illimitati
  'business': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
  
  // Staff - Accesso completo a tutto (gratis per 10 anni)
  'staff_free': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
  
  // Staff 10 anni - Accesso completo a tutto (gratis per 10 anni)
  'staff_free_10years': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
  
  // Passepartout - Accesso completo a tutto
  'passepartout': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
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
    description: 'Le notifiche WhatsApp sono incluse in tutti i piani.',
    requiredPlan: 'Trial',
  },
  invoices: {
    title: 'Fatture non disponibili',
    description: 'Le fatture sono disponibili in tutti i piani.',
    requiredPlan: 'Trial',
  },
  reports: {
    title: 'Report non disponibili',
    description: 'I report sono disponibili dal piano Pro in su.',
    requiredPlan: 'Pro',
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
  warehouse: {
    title: 'Magazzino non disponibile',
    description: 'La gestione del magazzino e inventario è disponibile solo nel piano Business.',
    requiredPlan: 'Business',
  },
  unlimited_clients: {
    title: 'Limite clienti raggiunto',
    description: 'Passa al piano Business per avere clienti illimitati.',
    requiredPlan: 'Business',
  },
  appointment_requests: {
    title: 'Richiesta appuntamenti non disponibile',
    description: 'La funzione di richiesta appuntamenti da parte dei clienti è disponibile in tutti i piani.',
    requiredPlan: 'Base',
  },
  promotional_packages: {
    title: 'Pacchetti promozionali non disponibili',
    description: 'I pacchetti promozionali sono disponibili dal piano Pro in su.',
    requiredPlan: 'Pro',
  },
  marketing_ai: {
    title: 'Campagne Marketing AI non disponibili',
    description: 'Le campagne marketing con AI e upload media sono disponibili dal piano Business in su.',
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
