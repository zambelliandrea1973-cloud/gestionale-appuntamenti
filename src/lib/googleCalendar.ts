import { apiRequest } from "./queryClient";
import { Appointment } from "@shared/schema";

export interface GoogleCalendarSettings {
  id?: number;
  enabled: boolean;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: Date;
  calendarId?: string;
}

// Carica le impostazioni di Google Calendar dal server
export async function loadGoogleCalendarSettings(): Promise<GoogleCalendarSettings | null> {
  try {
    const response = await apiRequest("GET", "/api/google-calendar/settings");
    const settings = await response.json();
    return settings;
  } catch (error) {
    console.error("Errore durante il caricamento delle impostazioni di Google Calendar:", error);
    return null;
  }
}

// Salva le impostazioni di Google Calendar
export async function saveGoogleCalendarSettings(settings: GoogleCalendarSettings): Promise<GoogleCalendarSettings | null> {
  try {
    const response = await apiRequest("POST", "/api/google-calendar/settings", settings);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Errore durante il salvataggio delle impostazioni di Google Calendar:", error);
    return null;
  }
}

// Genera l'URL di autorizzazione OAuth
export async function getGoogleAuthUrl(clientId: string, redirectUri: string): Promise<string | null> {
  try {
    const response = await apiRequest("GET", `/api/google-calendar/auth-url?clientId=${encodeURIComponent(clientId)}&redirectUri=${encodeURIComponent(redirectUri)}`);
    const data = await response.json();
    return data.authUrl;
  } catch (error) {
    console.error("Errore durante la generazione dell'URL di autorizzazione:", error);
    return null;
  }
}

// Scambia il codice di autorizzazione con un token di accesso
export async function exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<boolean> {
  try {
    const response = await apiRequest("POST", "/api/google-calendar/exchange-code", {
      code,
      clientId,
      clientSecret,
      redirectUri
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Errore durante lo scambio del codice:", error);
    return false;
  }
}

// Sincronizza un appuntamento con Google Calendar
export async function syncAppointmentWithGoogleCalendar(appointmentId: number): Promise<boolean> {
  try {
    const response = await apiRequest("POST", `/api/google-calendar/sync-appointment/${appointmentId}`);
    return response.status === 200;
  } catch (error) {
    console.error("Errore durante la sincronizzazione dell'appuntamento:", error);
    return false;
  }
}

// Aggiorna un appuntamento già sincronizzato con Google Calendar
export async function updateSyncedAppointment(appointmentId: number): Promise<boolean> {
  try {
    const response = await apiRequest("PUT", `/api/google-calendar/sync-appointment/${appointmentId}`);
    return response.status === 200;
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'appuntamento sincronizzato:", error);
    return false;
  }
}

// Elimina un appuntamento da Google Calendar
export async function deleteSyncedAppointment(appointmentId: number): Promise<boolean> {
  try {
    const response = await apiRequest("DELETE", `/api/google-calendar/sync-appointment/${appointmentId}`);
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'appuntamento sincronizzato:", error);
    return false;
  }
}

// Verifica se un appuntamento è sincronizzato con Google Calendar
export async function isAppointmentSynced(appointmentId: number): Promise<boolean> {
  try {
    const appointments = await getGoogleCalendarEvents();
    return appointments.some(appt => appt.appointmentId === appointmentId);
  } catch (error) {
    console.error("Errore durante la verifica dello stato di sincronizzazione:", error);
    return false;
  }
}

// Recupera tutti gli eventi sincronizzati con Google Calendar
export async function getGoogleCalendarEvents(): Promise<{appointmentId: number, googleEventId: string}[]> {
  try {
    const response = await apiRequest("GET", "/api/google-calendar/events");
    return await response.json();
  } catch (error) {
    console.error("Errore durante il recupero degli eventi di Google Calendar:", error);
    return [];
  }
}

// Interfaccia per i calendari disponibili
export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  description?: string; 
  primary?: boolean;
}

// Recupera la lista di tutti i calendari disponibili per l'account autenticato
export async function getAvailableCalendars(): Promise<GoogleCalendarInfo[]> {
  try {
    const response = await apiRequest("GET", "/api/google-calendar/calendars");
    return await response.json();
  } catch (error) {
    console.error("Errore durante il recupero della lista dei calendari:", error);
    return [];
  }
}

// Estrae il codice di autorizzazione dalla URL dopo il reindirizzamento da Google
export function extractAuthCode(url: string): string | null {
  const urlObj = new URL(url);
  return urlObj.searchParams.get('code');
}