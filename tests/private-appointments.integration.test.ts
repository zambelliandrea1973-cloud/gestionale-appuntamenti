import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { sql } from 'drizzle-orm';
import { db, closeDatabase } from '../server/db';
import router from '../server/routes/privateAppointmentRoutes';
import collaboratorRouter from '../server/routes/collaboratorRoutes';
import { ensurePrivateAppointmentTables, getPrivateCalendarIds } from '../server/services/privateAppointmentAccess';
import { encryptPrivateToken } from '../server/services/privateAppointmentGoogle';
import { google } from 'googleapis';

test('private API isolates identities, studios and sessions; CRUD/outbox/conflicts remain local', async () => {
  await ensurePrivateAppointmentTables();
  // Negative, nonexistent studio IDs avoid touching any real studio's data.
  const studio = -Math.floor(100000000 + Math.random() * 500000000);
  const otherStudio = studio - 1;
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: Number(req.get('X-Test-Studio') || studio), type: req.get('X-Test-Type') || 'staff', role: req.get('X-Test-Role') || 'staff' };
    req.isAuthenticated = () => req.get('X-Test-Anonymous') !== 'true';
    req.sessionID = req.get('X-Test-Session') || 'private-integration-browser';
    next();
  });
  app.use(router);
  app.use(collaboratorRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const api = async (path: string, method = 'GET', body?: unknown, token?: string, headers: Record<string, string> = {}) => {
    const response = await fetch(`http://127.0.0.1:${address.port}${path.startsWith('/api/') ? path : `/api/private-appointments${path}`}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Private-Access': token } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() as any };
  };
  const data = { title: 'Private integration fixture', startDate: '2098-10-05', endDate: '2098-10-05', startTime: '11:30', endTime: '12:00' };
  let profileId: number | undefined;
  try {
    assert.equal((await api('/profiles', 'GET', undefined, undefined, { 'X-Test-Anonymous': 'true' })).status, 401);
    const profiles = await api('/profiles');
    assert.equal(profiles.status, 200);
    profileId = profiles.data.singleProfileId;
    assert.ok(profileId);
    const solo = await db.execute(sql`SELECT password_hash FROM private_appointment_profiles WHERE id=${profileId}`);
    assert.equal(solo[0].password_hash, null, 'no password is configured for a single operator');
    assert.equal((await api('/access')).status, 200, 'single professional sees details without extra unlock');
    assert.equal((await api('/access', 'GET', undefined, undefined, { 'X-Test-Type': 'customer', 'X-Test-Role': 'user' })).status, 200, 'new trial studio owner is not a client-area identity');
    assert.equal((await api('/profiles', 'GET', undefined, undefined, { 'X-Test-Type': 'client', 'X-Test-Role': 'client' })).status, 403, 'client-area identities cannot access studio private data');
    const firstColleague = { firstName: 'Fixture', lastName: 'Colleague', isActive: true };
    assert.equal((await api('/api/collaborators', 'POST', firstColleague)).status, 428, 'first colleague cannot expose a passwordless private area');
    const enrollment = await api('/prepare-team', 'POST', { password: 'Private-fixture-2026' });
    assert.equal(enrollment.status, 200, 'password only configured before adding additional operators');
    const token = enrollment.data.token;
    assert.equal((await api('/events', 'POST', { ...data, profileId }, token)).status, 400, 'no profile ID injection');
    const created = await api('/events', 'POST', data, token);
    assert.equal(created.status, 201);
    assert.equal(created.data.syncPending, true, 'offline Google export retained in outbox');
    const eventId = created.data.id;
    assert.equal((await api('/api/collaborators', 'POST', firstColleague)).status, 201, 'colleague creation succeeds after password preparation');
    assert.equal((await api('/access')).status, 403, 'first colleague immediately closes passwordless access');
    const passwordRows = await db.execute(sql`SELECT password_hash FROM private_appointment_profiles WHERE id=${profileId}`);
    await db.execute(sql`INSERT INTO private_appointment_profiles(user_id,identity_id,name,password_hash)
      VALUES (${studio},999999,'Other Private Test',${passwordRows[0].password_hash})`);
    assert.equal((await api('/access')).status, 403, 'adding another professional closes passwordless access');
    assert.equal((await api('/unlock', 'POST', { profileId, password: 'incorrect-password' })).status, 403);
    assert.equal((await api('/access', 'GET', undefined, token, { 'X-Test-Studio': String(otherStudio) })).status, 403);
    assert.equal((await api('/access', 'GET', undefined, token, { 'X-Test-Session': 'other-browser' })).status, 403);
    const secondProfile = await db.execute(sql`SELECT id FROM private_appointment_profiles WHERE user_id=${studio} AND identity_id=999999`);
    const otherAccess = await api('/unlock', 'POST', { profileId: secondProfile[0].id, password: 'Private-fixture-2026' });
    assert.equal(otherAccess.status, 200);
    assert.deepEqual((await api('/events?start=2098-10-01&end=2098-10-31', 'GET', undefined, otherAccess.data.token)).data, []);
    assert.equal((await api(`/events/${eventId}`, 'PUT', { ...data, title: 'Intrusion' }, otherAccess.data.token)).status, 404);
    assert.equal((await api(`/events/${eventId}`, 'DELETE', undefined, otherAccess.data.token)).status, 404);
    const edited = await api(`/events/${eventId}`, 'PUT', { ...data, title: 'Updated', recurrence: 'weekly' }, token);
    assert.equal(edited.status, 200);
    const listed = await api('/events?start=2098-10-05&end=2098-10-19', 'GET', undefined, token);
    assert.equal(listed.data.length, 3, 'weekly occurrences displayed');
    assert.equal(listed.data[0].title, 'Updated');
    assert.equal((await api('/events?start=2098-01-01&end=2100-01-01', 'GET', undefined, token)).status, 400);
    // Work conflict fixture has no customer details and belongs only to the synthetic studio.
    await db.execute(sql`INSERT INTO appointments(user_id,client_id,service_id,date,start_time,end_time,status)
      VALUES (${studio},0,0,'2098-10-05','11:00','12:30','scheduled')`);
    const conflict = await api('/events', 'POST', data, token);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.data.code, 'WORK_CONFLICT');
    assert.equal((await api('/events', 'POST', { ...data, allowConflict: true }, token)).status, 201);
    assert.equal((await api(`/events/${eventId}`, 'DELETE', undefined, token)).status, 200);
    assert.equal((await api(`/events/${eventId}`, 'GET', undefined, token)).status, 404);
    const reserved = `private-fixture-${Math.abs(studio)}@example.invalid`;
    await db.execute(sql`INSERT INTO private_google_calendars(calendar_id,profile_id) VALUES (${reserved},${profileId})`);
    assert.equal((await getPrivateCalendarIds()).has(reserved), true, 'private calendars reserved against generic sync');
    // A mocked provider exercises the REAL private outbox. No live Google writes.
    const originalCalendar = google.calendar;
    const providerEvents = new Map<string, any>();
    let deletes = 0;
    (google as any).calendar = () => ({
      calendarList: { list: async () => ({ data: { items: [{ id: reserved, summary: 'Fixture', accessRole: 'owner' }] } }) },
      acl: { list: async () => ({ data: { items: [{ role: 'owner' }] } }) },
      events: {
        insert: async ({ requestBody }: any) => { assert.ok(requestBody.id); providerEvents.set(requestBody.id, requestBody); return { data: requestBody }; },
        update: async ({ eventId, requestBody }: any) => { providerEvents.set(eventId, requestBody); return { data: { ...requestBody, id: eventId } }; },
        delete: async ({ eventId }: any) => { deletes++; providerEvents.delete(eventId); return { data: {} }; },
        list: async () => ({ data: { items: [] } }),
      },
    });
    try {
      await db.execute(sql`UPDATE private_appointment_profiles SET google_token=${encryptPrivateToken({ access_token: 'fixture-only' })},
        google_email='fixture@example.invalid',google_calendar_id=${reserved} WHERE id=${profileId}`);
      const googleCreated = await api('/events', 'POST', { ...data, startDate: '2099-01-02', endDate: '2099-01-02' }, token);
      assert.equal(googleCreated.status, 201);
      assert.equal(googleCreated.data.syncPending, false);
      assert.ok(googleCreated.data.googleEventId);
      const savedId = googleCreated.data.googleEventId;
      assert.equal(providerEvents.get(savedId).summary, data.title);
      const googleEdited = await api(`/events/${googleCreated.data.id}`, 'PUT', {
        ...data, startDate: '2099-01-02', endDate: '2099-01-02', title: 'Google edited fixture',
      }, token);
      assert.equal(googleEdited.status, 200);
      assert.equal(googleEdited.data.googleEventId, savedId, 'edit retains copy ID');
      assert.equal(providerEvents.get(savedId).summary, 'Google edited fixture');
      const googleDelete = await api(`/events/${googleCreated.data.id}`, 'DELETE', undefined, token);
      assert.equal(googleDelete.status, 200);
      assert.ok(deletes > 0);
      assert.equal(providerEvents.has(savedId), false, 'delete removes private Google copy');
      await api('/google', 'DELETE', undefined, token);
      assert.equal((await getPrivateCalendarIds()).has(reserved), true, 'disconnect preserves private calendar reservation');
    } finally {
      (google as any).calendar = originalCalendar;
    }
    assert.equal((await api('/lock', 'POST', {}, token)).status, 200);
    assert.equal((await api('/access', 'GET', undefined, token)).status, 403, 'lock revokes token');
    const fresh = await api('/unlock', 'POST', { profileId, password: 'Private-fixture-2026' });
    await db.execute(sql`UPDATE private_appointment_access SET expires_at=now()-interval '1 minute' WHERE profile_id=${profileId}`);
    assert.equal((await api('/access', 'GET', undefined, fresh.data.token)).status, 403, 'expired tokens cannot read private data');
  } finally {
    await db.execute(sql`DELETE FROM appointments WHERE user_id=${studio}`);
    await db.execute(sql`DELETE FROM staff WHERE user_id=${studio}`);
    await db.execute(sql`DELETE FROM private_appointment_profiles WHERE user_id IN (${studio},${otherStudio})`);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase();
  }
});