export type SpaceIdentity = { identityId: number; name: string; configured: boolean; profileId?: number; passwordConfigured?: boolean };
export type SpaceProfile = { id: number; name: string; identityId: number };
export type SpaceProfiles = { multi: boolean; identities: SpaceIdentity[]; profiles: SpaceProfile[]; singleProfileId?: number };
export type SpaceAccess = { profile: SpaceProfile; multi: boolean; google: { connected: boolean; calendarId?: string; email?: string }; sync?: { pending: boolean; message?: string } };

let accessToken: string | null = null;
let tokenEpoch = 0;
let expiredHandler: (() => void) | null = null;
export const setSpaceToken = (value: string | null) => { accessToken = value; tokenEpoch++; };
export const getSpaceToken = () => accessToken;
export const setSpaceExpiredHandler = (handler: (() => void) | null) => { expiredHandler = handler; };
export const expireSpaceAccess = () => { setSpaceToken(null); expiredHandler?.(); };

export async function spaceRequest<T>(path: string, init: RequestInit = {}, protectedCall = true): Promise<T> {
  const epoch = tokenEpoch;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (protectedCall && accessToken) headers.set('X-Private-Access', accessToken);
  const response = await fetch(`/api/personal-appointments/space${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (protectedCall && epoch !== tokenEpoch) throw new Error('Accesso allo spazio modificato');
  if (protectedCall && (response.status === 401 || response.status === 403)) {
    setSpaceToken(null);
    expiredHandler?.();
  }
  if (!response.ok) throw Object.assign(new Error(body?.message || 'Richiesta non riuscita'), { status: response.status, code: body?.code });
  return body as T;
}

export const spaceApi = {
  profiles: () => spaceRequest<SpaceProfiles>('/profiles', {}, false),
  access: () => spaceRequest<SpaceAccess>('/access'),
  enroll: (data: { identityId: number; name: string; password: string }) => spaceRequest<{ profile: SpaceProfile; token: string }>('/profiles', { method: 'POST', body: JSON.stringify(data) }, false),
  unlock: (data: { profileId: number; password: string }) => spaceRequest<{ profile: SpaceProfile; token: string }>('/unlock', { method: 'POST', body: JSON.stringify(data) }, false),
  lock: () => spaceRequest('/lock', { method: 'POST' }),
  prepareTeam: (password: string) => spaceRequest('/prepare-team', { method: 'POST', body: JSON.stringify({ password }) }, false),
  connect: () => spaceRequest<{ url: string }>('/google/connect', { method: 'POST' }),
  calendars: () => spaceRequest<Array<{ id: string; summary: string }>>('/google/calendars'),
  createCalendar: (summary: string) => spaceRequest('/google/calendars', { method: 'POST', body: JSON.stringify({ summary }) }),
  selectCalendar: (calendarId: string) => spaceRequest('/google/calendar', { method: 'POST', body: JSON.stringify({ calendarId }) }),
  sync: () => spaceRequest<{ connected: boolean; pending: boolean; message?: string }>('/google/sync', { method: 'POST' }),
  disconnect: () => spaceRequest('/google', { method: 'DELETE' }),
};

export async function personalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const epoch = tokenEpoch;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('X-Private-Access', accessToken);
  const response = await fetch(`/api/personal-appointments${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (epoch !== tokenEpoch) throw new Error('Accesso allo spazio modificato');
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      setSpaceToken(null);
      expiredHandler?.();
    }
    throw Object.assign(new Error(body?.message || 'Operazione non riuscita'), { status: response.status });
  }
  return body as T;
}