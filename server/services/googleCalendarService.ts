import { calendar_v3, google } from 'googleapis';
import type { Appointment, Client, Service as ServiceType } from '@shared/schema';
import { storage } from '../storage';

// Interfaccia per il token OAuth
interface OAuth2Token {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

// Interfaccia per la configurazione salvata
interface GoogleCalendarConfig {
  enabled: boolean;
  apiKey: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  token?: OAuth2Token;
}

// Cache della configurazione
let cachedConfig: GoogleCalendarConfig | null = null;

/**
 * Carica la configurazione da localStorage (nel client) o da file (nel server)
 */
async function loadConfig(): Promise<GoogleCalendarConfig | null> {
  try {
    // Nel server, dovremmo caricare da un file o database
    // Per ora, impostiamo solo una struttura base
    return cachedConfig;
  } catch (error) {
    console.error('Errore nel caricamento della configurazione Google Calendar:', error);
    return null;
  }
}

/**
 * Salva la configurazione di Google Calendar
 */
export async function saveConfig(config: GoogleCalendarConfig): Promise<boolean> {
  try {
    // Salva in cache
    cachedConfig = config;
    
    // In una implementazione completa, salveremmo su file/database
    return true;
  } catch (error) {
    console.error('Errore nel salvataggio della configurazione Google Calendar:', error);
    return false;
  }
}

/**
 * Crea un'istanza autenticata del client Google Calendar
 */
async function getCalendarClient(): Promise<calendar_v3.Calendar | null> {
  try {
    const config = await loadConfig();
    if (!config || !config.enabled || !config.apiKey || !config.clientId) {
      console.log('Google Calendar non è configurato o abilitato');
      return null;
    }
    
    const auth = new google.auth.OAuth2({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri
    });
    
    // Se abbiamo un token salvato, lo impostiamo
    if (config.token) {
      auth.setCredentials(config.token);
    } else {
      // Senza token non possiamo procedere
      console.log('Token OAuth non disponibile per Google Calendar');
      return null;
    }
    
    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('Errore nella creazione del client Google Calendar:', error);
    return null;
  }
}

/**
 * Aggiunge un appuntamento a Google Calendar
 */
export async function addAppointmentToGoogleCalendar(appointmentId: number): Promise<string | null> {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return null;
    }
    
    // Ottieni i dettagli dell'appuntamento
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      console.error(`Appuntamento con ID ${appointmentId} non trovato`);
      return null;
    }
    
    // Ottieni dettagli cliente e servizio
    const client = await storage.getClient(appointment.clientId);
    const service = appointment.serviceId 
      ? await storage.getService(appointment.serviceId) 
      : null;
      
    if (!client) {
      console.error(`Cliente con ID ${appointment.clientId} non trovato`);
      return null;
    }
    
    // Crea evento Google Calendar
    const event = createGoogleCalendarEvent(appointment, client, service || null);
    
    // Inserisci evento nel calendario
    const response = await calendar.events.insert({
      calendarId: 'primary', // Calendario principale dell'utente
      requestBody: event
    });
    
    console.log('Evento creato con successo in Google Calendar:', response.data.htmlLink);
    return response.data.id || null;
    
  } catch (error) {
    console.error('Errore nell\'aggiunta dell\'appuntamento a Google Calendar:', error);
    return null;
  }
}

/**
 * Crea un oggetto evento di Google Calendar dai dati dell'appuntamento
 */
function createGoogleCalendarEvent(
  appointment: Appointment, 
  client: Client, 
  service: ServiceType | null
): calendar_v3.Schema$Event {
  // Prepara data e ora di inizio
  const startDateTime = new Date(`${appointment.date}T${appointment.startTime}`);
  
  // Prepara data e ora di fine
  const endDateTime = new Date(`${appointment.date}T${appointment.endTime}`);
  
  // Titolo dell'evento
  const summary = service 
    ? `${client.firstName} ${client.lastName} - ${service.name}`
    : `Appuntamento con ${client.firstName} ${client.lastName}`;
    
  // Descrizione dell'evento
  const description = appointment.notes 
    ? `Note: ${appointment.notes}\nCliente: ${client.firstName} ${client.lastName}\nTelefono: ${client.phone || 'Non disponibile'}\nEmail: ${client.email || 'Non disponibile'}`
    : `Cliente: ${client.firstName} ${client.lastName}\nTelefono: ${client.phone || 'Non disponibile'}\nEmail: ${client.email || 'Non disponibile'}`;
  
  // Crea l'evento
  return {
    summary,
    description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Europe/Rome',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Europe/Rome',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };
}

/**
 * Aggiorna un appuntamento esistente in Google Calendar
 */
export async function updateAppointmentInGoogleCalendar(
  appointmentId: number, 
  googleEventId: string
): Promise<boolean> {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return false;
    }
    
    // Ottieni i dettagli dell'appuntamento
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      console.error(`Appuntamento con ID ${appointmentId} non trovato`);
      return false;
    }
    
    // Ottieni dettagli cliente e servizio
    const client = await storage.getClient(appointment.clientId);
    const service = appointment.serviceId 
      ? await storage.getService(appointment.serviceId) 
      : null;
      
    if (!client) {
      console.error(`Cliente con ID ${appointment.clientId} non trovato`);
      return false;
    }
    
    // Crea evento Google Calendar aggiornato
    const event = createGoogleCalendarEvent(appointment, client, service || null);
    
    // Aggiorna evento nel calendario
    await calendar.events.update({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: event
    });
    
    console.log('Evento aggiornato con successo in Google Calendar');
    return true;
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'appuntamento in Google Calendar:', error);
    return false;
  }
}

/**
 * Elimina un appuntamento da Google Calendar
 */
export async function deleteAppointmentFromGoogleCalendar(googleEventId: string): Promise<boolean> {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return false;
    }
    
    // Elimina evento dal calendario
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId
    });
    
    console.log('Evento eliminato con successo da Google Calendar');
    return true;
    
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'appuntamento da Google Calendar:', error);
    return false;
  }
}

/**
 * Verifica se Google Calendar è configurato e abilitato
 */
export async function isGoogleCalendarEnabled(): Promise<boolean> {
  const config = await loadConfig();
  return !!config && config.enabled && !!config.apiKey && !!config.clientId;
}

/**
 * Genera l'URL di autorizzazione OAuth
 */
export function getAuthUrl(clientId: string, redirectUri: string): string {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    '', // clientSecret non necessario per generare l'URL
    redirectUri
  );
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
}

/**
 * Scambia il codice di autorizzazione con un token di accesso
 */
export async function exchangeCodeForToken(
  code: string, 
  clientId: string, 
  clientSecret: string, 
  redirectUri: string
): Promise<OAuth2Token | null> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens || !tokens.access_token) {
      throw new Error('Token non valido');
    }
    
    return tokens as OAuth2Token;
  } catch (error) {
    console.error('Errore nello scambio del codice per il token:', error);
    return null;
  }
}

// Esporta il servizio
export const googleCalendarService = {
  saveConfig,
  addAppointmentToGoogleCalendar,
  updateAppointmentInGoogleCalendar,
  deleteAppointmentFromGoogleCalendar,
  isGoogleCalendarEnabled,
  getAuthUrl,
  exchangeCodeForToken
};