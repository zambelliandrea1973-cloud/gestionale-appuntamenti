// Interfaccia per le configurazioni di Google Calendar
export interface GoogleCalendarConfig {
  enabled: boolean;
  apiKey: string;
  clientId: string;
}

const LOCAL_STORAGE_KEY = 'googleCalendarConfig';

/**
 * Salva la configurazione di Google Calendar nel localStorage
 */
export function saveGoogleCalendarConfig(config: GoogleCalendarConfig): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Carica la configurazione di Google Calendar dal localStorage
 */
export function loadGoogleCalendarConfig(): GoogleCalendarConfig | null {
  const storedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!storedConfig) return null;
  
  try {
    return JSON.parse(storedConfig) as GoogleCalendarConfig;
  } catch (error) {
    console.error('Error parsing Google Calendar config:', error);
    return null;
  }
}

/**
 * Verifica se Google Calendar è configurato e abilitato
 */
export function isGoogleCalendarEnabled(): boolean {
  const config = loadGoogleCalendarConfig();
  return !!config && config.enabled && !!config.apiKey && !!config.clientId;
}

/**
 * Rimuove la configurazione di Google Calendar dal localStorage
 */
export function clearGoogleCalendarConfig(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}