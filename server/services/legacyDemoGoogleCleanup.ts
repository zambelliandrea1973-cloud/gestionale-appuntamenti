import { google, type calendar_v3 } from 'googleapis';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../../shared/schema';
import { EncryptionService } from './encryption';
import { DEMO_CLIENTS, DEMO_SERVICES } from './onboardingDemoService';
import { getAppointmentDemoState } from './demoAppointmentGuard';

const demoNames = new Set(DEMO_CLIENTS.map(c => `${c.firstName} ${c.lastName}`));
const demoServices = new Set(DEMO_SERVICES.map(s => s.name));
const demoContacts = DEMO_CLIENTS.flatMap(c => [c.email, c.phone]).filter(Boolean);

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

export async function cleanupLegacyDemoGoogleEvents(userId: number): Promise<number> {
  const [user] = await db.select({
    googleAuthToken: users.googleAuthToken,
    googleCalendarEnabled: users.googleCalendarEnabled,
    googleCalendarId: users.googleCalendarId,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user?.googleCalendarEnabled || !user.googleAuthToken) return 0;

  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth.setCredentials(JSON.parse(EncryptionService.decryptToken(user.googleAuthToken)));
  const calendar = google.calendar({ version: 'v3', auth: oauth });
  const calendarId = user.googleCalendarId || 'primary';
  const timeMin = new Date();
  timeMin.setFullYear(timeMin.getFullYear() - 2);
  const timeMax = new Date();
  timeMax.setFullYear(timeMax.getFullYear() + 3);

  let deleted = 0;
  let pageToken: string | undefined;
  do {
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });

    for (const event of response.data.items || []) {
      if (!event.id || !isLegacyDemoGoogleEvent(event)) continue;
      const appointmentId = appointmentIdFromEvent(event);
      if (appointmentId && await getAppointmentDemoState(appointmentId, userId) === 'real') {
        continue;
      }
      await calendar.events.delete({ calendarId, eventId: event.id });
      deleted++;
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return deleted;
}