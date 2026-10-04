import { google, type calendar_v3 } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { appointments, googleCalendarEvents, users } from '../../shared/schema';
import { EncryptionService } from './encryption';
import { DEMO_CLIENTS, DEMO_SERVICES } from './onboardingDemoService';
import { getAppointmentDemoState } from './demoAppointmentGuard';

const demoNames = new Set(DEMO_CLIENTS.map(c => `${c.firstName} ${c.lastName}`));
const demoServices = new Set(DEMO_SERVICES.map(s => s.name));
const demoContacts = DEMO_CLIENTS.flatMap(c => [c.email, c.phone]).filter(Boolean);

export interface LegacyDemoGoogleEventPreviewItem {
  eventId: string;
  title: string;
  start: string;
  end: string | null;
}

export interface LegacyDemoGoogleEventPreview {
  count: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  events: LegacyDemoGoogleEventPreviewItem[];
}

export interface LegacyDemoGoogleEventReader {
  listEvents: (
    params: calendar_v3.Params$Resource$Events$List,
  ) => Promise<{ data: calendar_v3.Schema$Events }>;
  calendarId: string;
  importedGoogleEventIds: ReadonlySet<string>;
  getAppointmentState: (appointmentId: number) => Promise<string>;
  now?: Date;
}

export function isLegacyDemoGoogleEvent(event: calendar_v3.Schema$Event): boolean {
  const summary = (event.summary || '').trim();
  const description = event.description || '';
  const separator = summary.indexOf(' - ');
  const name = separator >= 0 ? summary.slice(0, separator).trim() : '';
  const service = separator >= 0 ? summary.slice(separator + 3).trim() : '';
  const exactDemoTitle = demoNames.has(name) && demoServices.has(service);
  if (!exactDemoTitle) return false;

  const fromGestionale =
    event.extendedProperties?.private?.source === 'gestionale' ||
    /#gestionale\s*\{[^}]*\}/.test(description) ||
    demoContacts.some(value => description.includes(value));

  return fromGestionale;
}

function appointmentIdFromEvent(event: calendar_v3.Schema$Event): number | null {
  const direct = event.extendedProperties?.private?.appointmentId;
  const signature = (event.description || '').match(/#gestionale\s*(\{[^}]*\})/);
  const value = direct || (() => {
    try { return signature ? JSON.parse(signature[1]).id : null; } catch { return null; }
  })();
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function collectLegacyDemoGoogleEvents({
  listEvents,
  calendarId,
  importedGoogleEventIds,
  getAppointmentState,
  now = new Date(),
}: LegacyDemoGoogleEventReader): Promise<LegacyDemoGoogleEventPreview> {
  const timeMin = new Date(now);
  timeMin.setFullYear(timeMin.getFullYear() - 2);
  const timeMax = new Date(now);
  timeMax.setFullYear(timeMax.getFullYear() + 3);

  const matches: LegacyDemoGoogleEventPreviewItem[] = [];
  let pageToken: string | undefined;
  do {
    const response = await listEvents({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });

    for (const event of response.data.items || []) {
      if (!event.id || importedGoogleEventIds.has(event.id) || !isLegacyDemoGoogleEvent(event)) continue;
      const appointmentId = appointmentIdFromEvent(event);
      if (appointmentId && await getAppointmentState(appointmentId) === 'real') continue;
      const start = event.start?.dateTime || event.start?.date;
      if (!start) continue;
      matches.push({
        eventId: event.id,
        title: (event.summary || '').trim(),
        start,
        end: event.end?.dateTime || event.end?.date || null,
      });
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  matches.sort((a, b) => a.start.localeCompare(b.start));
  return {
    count: matches.length,
    dateRange: {
      from: matches[0]?.start || null,
      to: matches[matches.length - 1]?.start || null,
    },
    events: matches,
  };
}

export async function previewLegacyDemoGoogleEvents(userId: number): Promise<LegacyDemoGoogleEventPreview> {
  const [user] = await db.select({
    googleAuthToken: users.googleAuthToken,
    googleCalendarId: users.googleCalendarId,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user?.googleAuthToken) {
    return { count: 0, dateRange: { from: null, to: null }, events: [] };
  }

  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth.setCredentials(JSON.parse(EncryptionService.decryptToken(user.googleAuthToken)));
  const calendar = google.calendar({ version: 'v3', auth: oauth });
  const calendarId = user.googleCalendarId || 'primary';
  const importedMappings = await db.select({
    googleEventId: googleCalendarEvents.googleEventId,
  })
    .from(googleCalendarEvents)
    .innerJoin(appointments, eq(appointments.id, googleCalendarEvents.appointmentId))
    .where(and(
      eq(appointments.userId, userId),
      eq(googleCalendarEvents.syncDirection, 'import'),
    ));
  const importedGoogleEventIds = new Set(importedMappings.map(row => row.googleEventId));
  return collectLegacyDemoGoogleEvents({
    listEvents: params => calendar.events.list(params),
    calendarId,
    importedGoogleEventIds,
    getAppointmentState: appointmentId => getAppointmentDemoState(appointmentId, userId),
  });
}