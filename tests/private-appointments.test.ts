import test from 'node:test';
import assert from 'node:assert/strict';
import { expandPrivateEvent, privateEventInput, privateGoogleBody } from '../shared/privateAppointments';
import { hashPrivatePassword, verifyPrivatePassword } from '../server/services/privateAppointmentAccess';

const draft = privateEventInput.parse({
  title: 'Impegno libero', startDate: '2026-10-05', endDate: '2026-10-05',
  startTime: '11:30', endTime: '12:00',
});
test('free appointments require no client or service and reject identity injection', () => {
  assert.equal(draft.title, 'Impegno libero');
  assert.equal(privateEventInput.safeParse({ ...draft, clientId: 1 }).success, false);
  assert.equal(privateEventInput.safeParse({ ...draft, profileId: 1 }).success, false);
});
test('dates and times are validated, including overnight/multi-day/all-day', () => {
  assert.equal(privateEventInput.safeParse({ ...draft, startDate: '2026-02-30' }).success, false);
  assert.equal(privateEventInput.safeParse({ ...draft, endTime: '10:00' }).success, false);
  assert.equal(privateEventInput.safeParse({ ...draft, endDate: '2026-10-06', endTime: '10:00' }).success, true);
  assert.equal(privateEventInput.safeParse({ ...draft, allDay: true, startTime: '00:00', endTime: '00:00' }).success, true);
});
test('recurrence expands for queried calendar dates without drifting monthly anchors', () => {
  const daily = expandPrivateEvent({ ...draft, recurrence: 'daily' }, '2026-10-07', '2026-10-09');
  assert.deepEqual(daily.map(x => x.startDate), ['2026-10-07', '2026-10-08', '2026-10-09']);
  const weekly = expandPrivateEvent({ ...draft, recurrence: 'weekly' }, '2026-10-06', '2026-10-19');
  assert.deepEqual(weekly.map(x => x.startDate), ['2026-10-12', '2026-10-19']);
  const monthly = expandPrivateEvent({ ...draft, startDate: '2026-01-31', endDate: '2026-01-31', recurrence: 'monthly' }, '2026-02-01', '2026-03-31');
  assert.deepEqual(monthly.map(x => x.startDate), ['2026-02-28', '2026-03-31']);
});
test('multi-day occurrences overlap queried days and historical daily recurrence is bounded', () => {
  const overnight = expandPrivateEvent({ ...draft, endDate: '2026-10-07' }, '2026-10-06', '2026-10-06');
  assert.equal(overnight.length, 1);
  const ancient = expandPrivateEvent({ ...draft, startDate: '2000-01-01', endDate: '2000-01-01', recurrence: 'daily' }, '2026-10-05', '2026-10-05');
  assert.equal(ancient.length, 1);
});
test('Google uses inclusive local all-day ends, RRULE and private popup reminders', () => {
  const body = privateGoogleBody({ ...draft, allDay: true, endDate: '2026-10-07', recurrence: 'weekly', reminderMinutes: 15 }, 'Europe/Rome');
  assert.deepEqual(body.end, { date: '2026-10-08' });
  assert.deepEqual(body.recurrence, ['RRULE:FREQ=WEEKLY']);
  assert.deepEqual(body.reminders.overrides, [{ method: 'popup', minutes: 15 }]);
  assert.equal('attendees' in body, false);
});
test('personal passwords are salted and verified without plaintext storage', async () => {
  const a = await hashPrivatePassword('private-test-password');
  const b = await hashPrivatePassword('private-test-password');
  assert.notEqual(a, b);
  assert.equal(a.includes('private-test-password'), false);
  assert.equal(await verifyPrivatePassword('private-test-password', a), true);
  assert.equal(await verifyPrivatePassword('wrong-password', a), false);
});