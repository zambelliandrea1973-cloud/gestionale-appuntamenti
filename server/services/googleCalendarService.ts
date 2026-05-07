import { logger } from '../utils/logger';
import { calendar_v3, google } from 'googleapis';
import type { Appointment, Client, Service as ServiceType } from '../../shared/schema';
import { storage } from '../storage';
import { db } from '../db';
import { appointments, clients, googleCalendarEvents, services } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { authInfo } from '../routes/googleAuthRoutes';

// Interfaccia per the token OAuth
interface OAuth2Token {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

// Interface for the saved configuration
interface GoogleCalendarConfig {
  enabled: boolean;
  apiKey: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  token?: OAuth2Token;
  calendarId?: string; // ID of the specific calendar to use
}

// Configuration cache
let cachedConfig: GoogleCalendarConfig | null = null;

/**
 * Load configuration from localStorage (in the client) or from file (in the server)
 */
async function loadConfig(): Promise<GoogleCalendarConfig | null> {
  try {
    // In the server, we should load from a file or database
    // For now, we only set a base structure base
    return cachedConfig;
  } catch (error) {
    console.error('Error loading Google Calendar configuration:', error);
    return null;
  }
}

/**
 * Save the Google Calendar configuration
 */
export async function saveConfig(config: GoogleCalendarConfig): Promise<boolean> {
  try {
    // Save in cache
    cachedConfig = config;
    
    // In a complete implementation, we would save to file/database
    return true;
  } catch (error) {
    console.error('Error saving Google Calendar configuration:', error);
    return false;
  }
}

/**
 * Create an authenticated Google Calendar client instance
 */
async function getCalendarClient(): Promise<calendar_v3.Calendar | null> {
  try {
    // Check if we have an active authorization in authInfo
    if (!authInfo.authorized || !authInfo.tokens) {
      console.log('No active Google authorization in authInfo:', authInfo);
      
      // Fallback to the previous method with cachedConfig
      const config = await loadConfig();
      if (!config || !config.enabled) {
        console.log('Google Calendar is not configured or enabled');
        return null;
      }
      
      const redirectUri = process.env.PRODUCTION_DOMAIN 
        ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
        : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`;
      
      const auth = new google.auth.OAuth2({
        clientId: process.env.GOOGLE_CLIENT_ID || config.clientId,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || config.clientSecret,
        redirectUri
      });
      
      // If we have a token saved in config, we set it
      if (config.token) {
        auth.setCredentials(config.token);
      } else {
        // Without token we cannot proceed
        console.log('OAuth token not available for Google Calendar, neither in authInfo nor in cachedConfig');
        return null;
      }
      
      return google.calendar({ version: 'v3', auth });
    }
    
    // Use authInfo tokens
    console.log('Using token from authInfo for Google Calendar');
    const redirectUri = process.env.PRODUCTION_DOMAIN 
      ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
      : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`;
    
    const auth = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri
    });
    
    auth.setCredentials(authInfo.tokens);
    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('Error creating Google Calendar client:', error);
    return null;
  }
}

/**
 * Add an appointment to Google Calendar
 */
export async function addAppointmentToGoogleCalendar(appointmentId: number): Promise<string | null> {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return null;
    }
    
    // Get appointment details
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      console.error(`Appointment with ID ${appointmentId} not found`);
      return null;
    }
    
    // IMPORTANT: Do not export events IMPORTED from Google Calendar!
    // These events have external origin and must not be re-synchronized
    if (appointment.importedFromGoogle) {
      console.log(`⏭️ [GOOGLE CALENDAR] Skip export for appointment ${appointmentId} - imported from Google Calendar`);
      return null;
    }
    
    // Get client and service details
    const client = await storage.getClient(appointment.clientId);
    const service = appointment.serviceId 
      ? await storage.getService(appointment.serviceId) 
      : null;
      
    if (!client) {
      console.error(`Client with ID ${appointment.clientId} not found`);
      return null;
    }
    
    // Create Google Calendar event
    const event = createGoogleCalendarEvent(appointment, client, service || null);
    
    // Load the configuration to get the ID of the selected calendar
    const config = await loadConfig();
    const calendarId = config?.calendarId || 'primary'; // Use the specified ID or 'primary' as fallback
    
    // Insert event into calendar
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event
    });
    
    console.log('Event created successfully in Google Calendar:', response.data.htmlLink);
    return response.data.id || null;
    
  } catch (error) {
    console.error('Error adding appointment to Google Calendar:', error);
    return null;
  }
}

/**
 * Create a Google Calendar event object from appointment data
 */
function createGoogleCalendarEvent(
  appointment: Appointment, 
  client: Client, 
  service: ServiceType | null
): calendar_v3.Schema$Event {
  // Prepare date and time - USE ISO format WITHOUT Z to respect local timezone
  // Handle both HH:MM and HH:MM:SS formats
  const startTime = appointment.startTime.length === 5 ? `${appointment.startTime}:00` : appointment.startTime;
  const endTime = appointment.endTime.length === 5 ? `${appointment.endTime}:00` : appointment.endTime;
  const startDateTimeStr = `${appointment.date}T${startTime}`;
  const endDateTimeStr = `${appointment.date}T${endTime}`;
  
  // Event title
  const summary = service 
    ? `${client.firstName} ${client.lastName} - ${service.name}`
    : `Appointment with ${client.firstName} ${client.lastName}`;
    
  // Event description
  const description = appointment.notes 
    ? `Note: ${appointment.notes}\nClient: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`
    : `Client: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`;
  
  // Create the event
  return {
    summary,
    description,
    start: {
      dateTime: startDateTimeStr,
      timeZone: 'Europe/Rome',
    },
    end: {
      dateTime: endDateTimeStr,
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
 * Update an existing appointment in Google Calendar
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
    
    // Get appointment details
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      console.error(`Appointment with ID ${appointmentId} not found`);
      return false;
    }
    
    // IMPORTANT: Do not update events IMPORTED from Google Calendar!
    // These events have an external origin and must not be modified by the scheduler
    if (appointment.importedFromGoogle) {
      console.log(`⏭️ [GOOGLE CALENDAR] Skipping update for appointment ${appointmentId} - imported from Google Calendar`);
      return false;
    }
    
    // Get client and service details
    const client = await storage.getClient(appointment.clientId);
    const service = appointment.serviceId 
      ? await storage.getService(appointment.serviceId) 
      : null;
      
    if (!client) {
      console.error(`Client with ID ${appointment.clientId} not found`);
      return false;
    }
    
    // Create updated Google Calendar event
    const event = createGoogleCalendarEvent(appointment, client, service || null);
    
    // Load the configuration to get the ID of the selected calendar
    const config = await loadConfig();
    const calendarId = config?.calendarId || 'primary'; // Use the specified ID or 'primary' as fallback
    
    // Update event in calendar
    await calendar.events.update({
      calendarId: calendarId,
      eventId: googleEventId,
      requestBody: event
    });
    
    console.log('Event updated successfully in Google Calendar');
    return true;
    
  } catch (error) {
    console.error('Error updating appointment in Google Calendar:', error);
    return false;
  }
}

/**
 * Delete an appointment from Google Calendar
 */
export async function deleteAppointmentFromGoogleCalendar(googleEventId: string): Promise<boolean> {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return false;
    }
    
    // Load the configuration to get the ID of the selected calendar
    const config = await loadConfig();
    const calendarId = config?.calendarId || 'primary'; // Use the specified ID or 'primary' as fallback
    
    // Delete event from calendar
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: googleEventId
    });
    
    console.log('Event deleted successfully from Google Calendar');
    return true;
    
  } catch (error) {
    console.error('Error deleting appointment from Google Calendar:', error);
    return false;
  }
}

/**
 * Check if Google Calendar is configured and enabled
 */
export async function isGoogleCalendarEnabled(): Promise<boolean> {
  // Check first if we have an active authorization in authInfo
  if (authInfo.authorized && authInfo.tokens) {
    console.log('Google Calendar enabled via authInfo');
    return true;
  }
  
  // Fallback to the old method
  const config = await loadConfig();
  return !!config && config.enabled && !!config.apiKey && !!config.clientId;
}

/**
 * Generate the OAuth authorization URL
 */
export function getAuthUrl(clientId: string, redirectUri: string): string {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    '', // clientSecret not needed to generate the URL
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
 * Exchange the authorization code for an access token
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
      throw new Error('Invalid token');
    }
    
    return tokens as OAuth2Token;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return null;
  }
}

/**
 * Retrieve the list of available calendars for the authenticated account
 */
export async function getAvailableCalendars(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return [];
    }
    
    // Get the list of calendars
    const response = await calendar.calendarList.list();
    return response.data.items || [];
  } catch (error) {
    console.error('Error retrieving available calendars:', error);
    return [];
  }
}

/**
 * Retrieve all events synced from Google Calendar
 */
async function getAllEvents() {
  try {
    // Get all synchronized events via simpler query
    const calendarEvents = await db.select().from(googleCalendarEvents);
    
    // For each event, retrieve the appointment details
    const eventsWithDetails = await Promise.all(
      calendarEvents.map(async (event) => {
        const appointment = await storage.getAppointment(event.appointmentId);
        
        if (!appointment) {
          return {
            ...event,
            appointment: null
          };
        }
        
        // Retrieve also informazioni su client e service
        const client = await storage.getClient(appointment.clientId);
        const service = appointment.serviceId 
          ? await storage.getService(appointment.serviceId) 
          : null;
        
        return {
          ...event,
          appointment: {
            ...appointment,
            client,
            service
          }
        };
      })
    );
    
    return eventsWithDetails;
  } catch (error) {
    console.error('Error retrieving events synced with Google Calendar:', error);
    return [];
  }
}

// Export the service
export const googleCalendarService = {
  saveConfig,
  addAppointmentToGoogleCalendar,
  updateAppointmentInGoogleCalendar,
  deleteAppointmentFromGoogleCalendar,
  isGoogleCalendarEnabled,
  getAuthUrl,
  exchangeCodeForToken,
  getAvailableCalendars,
  getAllEvents
};