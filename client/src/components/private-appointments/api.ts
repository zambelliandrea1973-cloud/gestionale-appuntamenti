export type PrivateIdentity = { identityId: number; name: string; configured: boolean; profileId?: number };
export type PrivateProfile = { id: number; name: string; identityId: number };
export type PrivateProfiles = { multi: boolean; identities: PrivateIdentity[]; profiles: PrivateProfile[]; singleProfileId?: number };
export type PrivateEvent = {
  id: number | string; title: string; startDate: string; endDate: string; startTime: string | null;
  endTime: string | null; allDay: boolean; location: string; description: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly'; reminderMinutes: null | 0 | 5 | 15 | 60;
  source: 'local' | 'google'; occurrenceDate?: string; googleEventId?: string; syncPending?: boolean;
  seriesStartDate?: string; seriesEndDate?: string;
};
export type EventDraft = Omit<PrivateEvent, 'id' | 'source' | 'occurrenceDate' | 'googleEventId' | 'syncPending'> & { id?: number | string; source?: PrivateEvent['source']; allowConflict?: boolean };
export type PrivateAccess = { profile: { id: number; name: string }; google: { connected: boolean; calendarId?: string; email?: string }; multi: boolean };
export type PrivateReminder = { id: number | string; title: string; occurrenceDate: string; startDate: string; startTime: string | null };
export class PrivateApiError extends Error {
  status: number; body: any;
  constructor(status: number, body: any) { super(body?.message || `Richiesta non riuscita (${status})`); this.status = status; this.body = body; }
}
let token: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let googleStatusHandler: ((status: string | null) => void) | null = null;
let tokenEpoch = 0;
export const setPrivateToken = (value: string | null) => { token = value; tokenEpoch++; };
export const clearPrivateToken = () => { token = null; tokenEpoch++; };
export const setPrivateUnauthorizedHandler = (handler: (() => void) | null) => { unauthorizedHandler = handler; };
export const setPrivateGoogleStatusHandler = (handler: ((status: string | null) => void) | null) => { googleStatusHandler = handler; };
export async function privateRequest<T>(path: string, init: RequestInit = {}, protectedRequest = true): Promise<T> {
  const requestEpoch = tokenEpoch;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (protectedRequest && token) headers.set('X-Private-Access', token);
  const response = await fetch(`/api/private-appointments${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (protectedRequest && requestEpoch !== tokenEpoch) {
    throw new PrivateApiError(409, { code: 'PRIVATE_ACCESS_CHANGED', message: 'L’accesso allo spazio privato è cambiato. Ricarica i dati.' });
  }
  if (protectedRequest && path.startsWith('/events')) googleStatusHandler?.(response.headers.get('X-Private-Google-Status'));
  if (protectedRequest && (response.status === 401 || response.status === 403) && requestEpoch === tokenEpoch) {
    clearPrivateToken();
    unauthorizedHandler?.();
  }
  if (!response.ok) throw new PrivateApiError(response.status, body);
  return body as T;
}
export const privateApi = {
  profiles: () => privateRequest<PrivateProfiles>('/profiles', {}, false),
  createProfile: (data: { identityId: number; name: string; password: string }) => privateRequest<{ profile: PrivateProfile; token: string }>('/profiles', { method: 'POST', body: JSON.stringify(data) }, false),
  unlock: (data: { profileId: number; password: string }) => privateRequest<{ profile: PrivateProfile; token: string }>('/unlock', { method: 'POST', body: JSON.stringify(data) }, false),
  lock: () => privateRequest('/lock', { method: 'POST' }),
  access: () => privateRequest<PrivateAccess>('/access'),
  events: (start: string, end: string) => privateRequest<PrivateEvent[]>(`/events?start=${start}&end=${end}`),
  reminders: () => privateRequest<PrivateReminder[]>('/reminders'),
  save: (event: EventDraft) => {
    const id = event.id;
    const path = id ? (event.source === 'google' ? `/google/events/${id}` : `/events/${id}`) : '/events';
    const data = {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      location: event.location,
      description: event.description,
      recurrence: event.recurrence,
      reminderMinutes: event.reminderMinutes,
      allowConflict: event.allowConflict,
    };
    return privateRequest<PrivateEvent>(path, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
  },
  remove: (event: PrivateEvent) => privateRequest(event.source === 'google' ? `/google/events/${event.id}` : `/events/${event.id}`, { method: 'DELETE' }),
  calendars: () => privateRequest<Array<{ id: string; summary: string }>>('/google/calendars'),
  createCalendar: (summary: string) => privateRequest<{ id: string; summary: string }>('/google/calendars', { method: 'POST', body: JSON.stringify({ summary }) }),
  selectCalendar: (calendarId: string) => privateRequest('/google/calendar', { method: 'POST', body: JSON.stringify({ calendarId }) }),
  connect: () => privateRequest<{ url: string }>('/google/connect', { method: 'POST' }),
  disconnect: () => privateRequest('/google', { method: 'DELETE' }),
  sync: () => privateRequest<any>('/google/sync', { method: 'POST' }),
  interpret: (body: { message: string; draft: Partial<EventDraft>; language: string; conversationId: string }) => privateRequest<Partial<EventDraft>>('/interpret', { method: 'POST', body: JSON.stringify(body) }),
};