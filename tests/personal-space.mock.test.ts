import test from 'node:test';
import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
import { google } from 'googleapis';
import { db } from '../server/db';
import { EncryptionService } from '../server/services/encryption';
import {
  privateIdentities, getPrivateProfile, privateHash, PrivateError, type PrivateProfile,
} from '../server/services/privateAppointmentAccess';
import { assertWorkOutsidePersonal } from '../server/services/personalAppointmentConflicts';
import {
  syncPersonalGoogle, queuePersonalGoogle, personalGoogleBody, personalGoogleEventId,
  preparePersonalGoogle,
} from '../server/services/personalAppointmentGoogle';
import { personalAppointmentForCalendar } from '../shared/personalAppointments';

// All SQL and provider operations are replaced. Run with a deliberately invalid
// local DATABASE_URL as an additional safeguard against the shared production DB.
const dialect = new PgDialect();
const owner: PrivateProfile = { id: 1, user_id: 42, identity_id: 0, name: 'Titolare',
  password_hash: null, google_token: 'mock-only', google_email: 'owner@example.invalid', google_calendar_id: 'private-calendar' };
const staffProfile: PrivateProfile = { ...owner, id: 2, identity_id: 9, name: 'Collaboratore', password_hash: 'hash' };
const draft = { title: 'Private fixture', date: '2026-10-19', startTime: '10:15', endTime: '10:30', location: 'Hidden', notes: 'Hidden note' };
let people: any[] = [], profiles: PrivateProfile[] = [owner], outbox: any = null;
let accepted = false, writes = 0, deletes = 0, acknowledgmentsLost = false, shared = false;
let validToken = true, lastSql = '', seededSql = '';
const execution = async (statement: any) => {
  const { sql, params } = dialect.sqlToQuery(statement);
  lastSql = sql;
  if (sql.includes('pg_advisory_xact_lock')) return [];
  if (sql.includes('JOIN private_appointment_access')) {
    const expected = privateHash('a'.repeat(64));
    return validToken && params.includes(expected) && params.includes(privateHash('session-fixture')) ? [staffProfile] : [];
  }
  if (sql.includes('SELECT id, first_name')) return people;
  if (sql.includes('INSERT INTO private_appointment_profiles')) return [];
  if (sql.includes('AS "identityId"')) return profiles.map(p => ({
    id: p.id, name: p.name, identityId: p.identity_id, passwordConfigured: !!p.password_hash,
  }));
  if (sql.startsWith('SELECT * FROM private_appointment_profiles')) return profiles.filter(p => p.id === params[0]);
  if (sql.includes('SELECT id FROM staff')) return people.filter(p => params.includes(p.id));
  if (sql.includes('SELECT timezone_settings')) return [{ timezone_settings: 'Europe/Rome' }];
  if (sql.includes('SELECT google_auth_token')) return [];
  if (sql.includes('INSERT INTO personal_google_outbox') && sql.includes('SELECT p.id')) { seededSql = sql; return []; }
  if (sql.includes('SELECT appointment_id FROM personal_google_outbox')) return outbox?.sync_pending ? [{ appointment_id: outbox.appointment_id }] : [];
  if (sql.includes('SET google_calendar_id=') && sql.includes('personal_google_outbox')) {
    if (outbox && !outbox.google_calendar_id) outbox.google_calendar_id = params[0];
    return [];
  }
  if (sql.includes('SELECT * FROM personal_google_outbox')) return outbox?.sync_pending ? [{ ...outbox }] : [];
  if (sql.includes('SET google_event_id=')) { outbox.google_event_id = params[0]; outbox.sync_pending = false; return []; }
  if (sql.includes('DELETE FROM personal_google_outbox')) { outbox = null; return []; }
  throw new Error(`Unexpected mock SQL: ${sql}`);
};
const originalExecute = db.execute, originalTransaction = db.transaction;
const originalCalendar = google.calendar, originalDecrypt = EncryptionService.decryptToken;
(db as any).execute = execution;
(db as any).transaction = async (fn: any) => fn({ execute: execution });
(EncryptionService as any).decryptToken = () => JSON.stringify({ access_token: 'mock-only' });
(google as any).calendar = () => ({
  calendarList: { list: async () => ({ data: { items: [{ id: 'private-calendar', accessRole: 'owner' }] } }) },
  acl: { list: async () => ({ data: { items: shared ? [{ role: 'reader' }] : [{ role: 'owner' }] } }) },
  events: {
    insert: async () => {
      writes++;
      assert.equal(outbox.google_calendar_id, 'private-calendar', 'destination is durable before remote write');
      if (accepted) throw { code: 409 };
      accepted = true;
      if (acknowledgmentsLost) throw new Error('Lost acknowledgement');
      return { data: {} };
    },
    update: async () => { writes++; return { data: {} }; },
    delete: async () => { deletes++; accepted = false; return {}; },
  },
});
test.after(() => {
  (db as any).execute = originalExecute; (db as any).transaction = originalTransaction;
  (google as any).calendar = originalCalendar; (EncryptionService as any).decryptToken = originalDecrypt;
});

test('solo access ignores obsolete profiles and requires no second password', async () => {
  people = []; profiles = [owner, staffProfile];
  const identities = await privateIdentities(42);
  assert.equal(identities.multi, false);
  assert.equal(identities.singleProfileId, owner.id);
  const req = { user: { id: 42, type: 'staff' }, isAuthenticated: () => true, get: () => undefined };
  assert.equal((await getPrivateProfile(req as any)).identity_id, 0);
});
test('one listed additional professional, even fictional, requires personal unlock', async () => {
  people = [{ id: 9, first_name: 'Inventato', last_name: 'Test' }]; profiles = [owner, staffProfile];
  assert.equal((await privateIdentities(42)).multi, true);
  const req = { user: { id: 42, type: 'staff' }, isAuthenticated: () => true, get: () => undefined };
  await assert.rejects(getPrivateProfile(req as any), (e: any) => e instanceof PrivateError && e.status === 403);
});
test('private token is session-bound and a removed professional cannot reuse it', async () => {
  people = [{ id: 9 }];
  const req = { user: { id: 42, type: 'staff' }, sessionID: 'session-fixture',
    isAuthenticated: () => true, get: () => 'a'.repeat(64) };
  assert.equal((await getPrivateProfile(req as any)).id, staffProfile.id);
  await assert.rejects(getPrivateProfile({ ...req, sessionID: 'different-session' } as any));
  people = [];
  await assert.rejects(getPrivateProfile(req as any), (e: any) => e.status === 403);
  people = [{ id: 9 }]; validToken = false;
  await assert.rejects(getPrivateProfile(req as any), (e: any) => e.status === 403);
  validToken = true;
});
test('work conflict check returns anonymous 409, not private content, and Google imports remain exempt', async () => {
  const executor = { execute: async () => [{ id: 123 }] };
  await assert.rejects(assertWorkOutsidePersonal(42, draft, executor), (e: any) =>
    e.status === 409 && e.code === 'PERSONAL_TIME_CONFLICT' && !e.message.includes(draft.title));
  let checked = false;
  await assertWorkOutsidePersonal(42, { ...draft, importedFromGoogle: true }, { execute: () => { checked = true; } });
  assert.equal(checked, false);
  await assert.rejects(assertWorkOutsidePersonal(42, draft, { execute: () => { throw new Error('DB unavailable'); } }),
    (e: any) => e.code === 'AVAILABILITY_UNAVAILABLE');
});
test('personal Google body preserves dates, notes, private visibility and distinct deterministic IDs', () => {
  const body = personalGoogleBody(draft, 'Europe/Rome');
  assert.equal(body.summary, draft.title);
  assert.equal(body.description, draft.notes);
  assert.equal(body.visibility, 'private');
  assert.equal(body.start?.timeZone, 'Europe/Rome');
  assert.match(body.start?.dateTime || '', /^2026-10-19T10:15/);
  assert.equal(personalGoogleEventId(42, 1, 100), personalGoogleEventId(42, 1, 100));
  assert.notEqual(personalGoogleEventId(42, 1, 100), personalGoogleEventId(42, 2, 100));
});
test('lost insert ACK retries the same event instead of creating a duplicate', async () => {
  outbox = { appointment_id: 100, profile_id: 1, event_data: draft, google_calendar_id: null, google_event_id: null, sync_pending: true, deleted: false };
  accepted = false; writes = 0; shared = false; acknowledgmentsLost = true;
  await assert.rejects(syncPersonalGoogle(owner));
  assert.equal(outbox.google_calendar_id, owner.google_calendar_id);
  assert.equal(outbox.sync_pending, true);
  acknowledgmentsLost = false;
  assert.equal((await syncPersonalGoogle(owner)).pending, 0);
  assert.equal(writes, 3, 'one accepted insert, one duplicate retry, one reconciliation update');
  assert.equal(outbox.google_event_id, personalGoogleEventId(42, 1, 100));
});
test('edits update the bound Google copy and deletions retain tombstones until remote absence', async () => {
  outbox.event_data = { ...draft, title: 'Edited' }; outbox.sync_pending = true;
  const before = writes;
  await syncPersonalGoogle(owner);
  assert.equal(writes, before + 1);
  outbox.event_data = null; outbox.deleted = true; outbox.sync_pending = true;
  deletes = 0;
  await syncPersonalGoogle(owner);
  assert.equal(deletes, 1); assert.equal(outbox, null);
});
test('delete reconciles deterministic ID even when the original insert was never acknowledged', async () => {
  outbox = { appointment_id: 101, profile_id: 1, event_data: null, google_calendar_id: 'private-calendar', google_event_id: null, sync_pending: true, deleted: true };
  await syncPersonalGoogle(owner);
  assert.equal(outbox, null);
});
test('disconnected and newly shared calendars never receive fresh private details', async () => {
  outbox = { appointment_id: 102, profile_id: 1, event_data: draft, google_calendar_id: null, sync_pending: true, deleted: false };
  const before = writes;
  assert.equal((await syncPersonalGoogle({ ...owner, google_token: null })).pending, 1);
  shared = true;
  assert.equal((await syncPersonalGoogle(owner)).pending, 1);
  assert.equal(writes, before);
  assert.equal(outbox.sync_pending, true);
  shared = false;
});
test('existing owner records are seeded only to owner profile, never to colleague', async () => {
  outbox = null;
  await syncPersonalGoogle(owner, true);
  assert.match(seededSql, /profile_id IS NULL/);
  assert.match(seededSql, /=0 AND/);
  assert.match(seededSql, /ON CONFLICT \(appointment_id\) DO NOTHING/);
});
test('colleagues never inherit the owner Google credentials', async () => {
  const staff = { ...staffProfile, google_token: null, google_email: null, google_calendar_id: null };
  assert.equal((await preparePersonalGoogle(staff, true)).google_token, null);
  assert.ok(!lastSql.includes('SELECT google_auth_token'));
});
test('CRUD outbox uses null content tombstones and preserves bound destinations on upsert', async () => {
  let captured: any;
  await queuePersonalGoogle({ execute: async (statement: any) => { captured = dialect.sqlToQuery(statement); } }, owner, 123, null);
  assert.ok(captured.params.includes(null));
  assert.match(captured.sql, /event_data=EXCLUDED.event_data/);
  assert.ok(!captured.sql.includes('google_calendar_id=EXCLUDED'));
  assert.match(captured.sql, /personal_google_outbox.profile_id=/);
});
test('anonymous busy cards use negative personal IDs, preserve professional resource and cannot collide with work IDs', () => {
  const record = personalAppointmentForCalendar({ ...draft, title: 'Occupato', notes: '', location: '', id: 123, userId: 42, staffId: 9, isPersonalBusy: true });
  assert.equal(record.id, -123); assert.equal(record.staffId, 9);
  assert.equal(record.isPersonalBusy, true); assert.equal(record.client.firstName, 'Occupato');
  assert.equal(record.notes, '');
});