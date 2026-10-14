import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { canContinuePersonalHandoff } from './appointmentCalendarScope';
import { personalAppointmentForCalendar, personalBusyConflictsWithStaff, publicPersonalBusyRecord } from '../../../shared/personalAppointments';

test('multi-operator handoff requires explicit identity and fresh password even for an unlocked profile', () => {
  const proof = { multi: true, unlockedIdentityId: 9, passwordAuthorized: false };
  assert.equal(canContinuePersonalHandoff(true, 3, 3, proof), false);
  assert.equal(canContinuePersonalHandoff(true, 3, 3, { ...proof, selectedIdentityId: 9 }), false);
  assert.equal(canContinuePersonalHandoff(true, 3, 3, { ...proof, selectedIdentityId: 7, passwordAuthorized: true }), false);
  assert.equal(canContinuePersonalHandoff(false, 3, 3, { ...proof, selectedIdentityId: 9, passwordAuthorized: true }), false);
  assert.equal(canContinuePersonalHandoff(true, 3, 3, { ...proof, selectedIdentityId: 9, passwordAuthorized: true }), true);
  assert.equal(canContinuePersonalHandoff(true, 1, 1, { multi: true, selectedIdentityId: 0, unlockedIdentityId: 0, passwordAuthorized: true }), true);
  assert.equal(canContinuePersonalHandoff(true, 1, 1, { multi: false, passwordAuthorized: false }), true);
  const source = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(source, /handoffOperator/);
  assert.match(source, /profileId: !space.profiles\?\.multi && space.unlocked/);
  assert.match(source, /space.requestAccess\(space.profiles\?\.multi \? handoff\?\.identityId/);
  assert.match(source, /force: space.profiles\?\.multi === true/);
  assert.match(source, /fixedIdentity: space.profiles\?\.multi === true/);
  assert.match(source, /previous.identityId === space.access\?\.profile.identityId/);
  assert.match(source, /onCancel: \(\) => \{ if \(token === accessGeneration.current\) cancel\(\); \}/);
  assert.match(source, /onInteractOutside=\{event => \{ if \(unlockPending\) event.preventDefault\(\); \}\}/);
  assert.match(source, /<Dialog modal=\{false\} open=\{Boolean\(handoff/);
  const provider = readFileSync('client/src/components/personal-space/PersonalSpaceProvider.tsx', 'utf8');
  assert.match(provider, /disabled=\{configureOnly \|\| forGoogle \|\| fixedIdentity\}/);
});

test('public busy metadata keeps registered operator assignment without private data', () => {
  const privateRow = {
    id: 71, userId: 42, profileId: 3, date: '2026-10-19', startTime: '10:00', endTime: '10:15',
    staffId: 9, staffName: 'Elena Riva', title: 'Sensitive title', notes: 'Sensitive note',
    location: 'Sensitive location', googleEmail: 'secret@example.invalid', profile: { password_hash: 'secret' },
  };
  const publicRow = publicPersonalBusyRecord(privateRow);
  assert.deepEqual(Object.keys(publicRow).sort(), ['id', 'date', 'startTime', 'endTime', 'staffId', 'staffName', 'userId', 'title', 'location', 'notes', 'isPersonalBusy'].sort());
  const calendar = personalAppointmentForCalendar({ ...privateRow, isPersonalBusy: true });
  assert.equal(calendar.staffId, 9);
  assert.equal(calendar.staff?.firstName, 'Elena Riva');
  assert.equal(calendar.client.firstName, 'Occupato');
  assert.equal(calendar.id, -71);
  assert.doesNotMatch(JSON.stringify(calendar), /Sensitive|secret|profileId|password_hash/);
  const owner = personalAppointmentForCalendar({ ...privateRow, staffId: 0, staffName: 'Titolare', isPersonalBusy: true });
  assert.equal(owner.staffId, 0);
  assert.equal(owner.staff?.firstName, 'Titolare');
  const route = readFileSync('server/routes/personalAppointmentRoutes.ts', 'utf8');
  const busy = route.slice(route.indexOf("router.get('/api/personal-appointments/busy'"), route.indexOf("router.get('/api/personal-appointments',"));
  assert.match(busy, /s.first_name,s.last_name/);
  assert.match(busy, /s.user_id=p.user_id/);
  assert.match(busy, /publicPersonalBusyRecord/);
  assert.doesNotMatch(busy, /p.title|p.notes|p.location|pr.name|google_email/);
});

test('all calendar presentations show busy plus operator and never the private activity', () => {
  for (const file of ['MonthView.tsx', 'DayViewWithTimeSlots.tsx', 'AppointmentCard.tsx', 'AppointmentCardSmall.tsx']) {
    const source = readFileSync(`client/src/components/${file}`, 'utf8');
    assert.match(source, /Occupato ·/);
    assert.match(source, /staffName/);
  }
  assert.match(readFileSync('client/src/components/WeekView.tsx', 'utf8'), /AppointmentCardSmall/);
  assert.match(readFileSync('client/src/components/DayView.tsx', 'utf8'), /usePersonalCalendarAppointments/);
});

test('actual form conflict check blocks only the matching private operator; owner zero is not global', async () => {
  const source = readFileSync('client/src/components/AppointmentForm.tsx', 'utf8');
  const start = source.indexOf('  const checkConflicts =');
  const end = source.indexOf('\n  const onSubmit', start);
  assert.ok(start > 0 && end > start);
  const code = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [busyStaffId, requestedStaffId, expected] of [[9, 9, 1], [9, 7, 0], [0, 9, 0], [0, null, 1], [0, 0, 1]]) {
    const env = {
      personalBusyConflictsWithStaff, publicPersonalBusyRecord,
      formatDateForApi: () => '2026-10-19',
      fetch: async (url: string) => ({ ok: true, json: async () => url.includes('personal-appointments') ? [{
        id: 71, date: '2026-10-19', startTime: '10:00', endTime: '10:30', staffId: busyStaffId, staffName: 'Elena Riva',
      }] : [] }),
      services: [{ id: 2, duration: 15 }], customDuration: null, appointmentId: undefined,
      collaborators: [{ id: 9, firstName: 'Elena', lastName: 'Riva' }], treatmentRooms: [], t: (key: string) => key,
    };
    const check = new Function('env', `const {${Object.keys(env).join(',')}}=env;${code};return checkConflicts;`)(env);
    const result = await check({ date: new Date(), startTime: '10:00', serviceId: 2, staffId: requestedStaffId, roomId: 4 });
    assert.equal(result.staffConflicts.length, expected);
    assert.equal(result.roomConflicts.length, 0, 'Private time reserves no studio room');
  }
});

test('actual backend work availability SQL scopes zero to owner and permits different operators', async () => {
  const source = readFileSync('server/services/personalAppointmentConflicts.ts', 'utf8');
  const start = source.indexOf('export async function assertWorkOutsidePersonal');
  const end = source.indexOf('export async function assertPersonalOutsideWork', start);
  const code = ts.transpileModule(source.slice(start, end).replace('export async', 'async'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  class PrivateError extends Error { constructor(public status: number, message: string) { super(message); } }
  const env = { db: {}, PrivateError, sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join('?'), values }) };
  const check = new Function('env', `const {${Object.keys(env).join(',')}}=env;${code};return assertWorkOutsidePersonal;`)(env);
  for (const [busyStaffId, requestedStaffId, conflict] of [[9, 9, true], [9, 7, false], [0, 9, false], [0, null, true]]) {
    const executor = { execute: async (statement: any) => {
      assert.match(statement.text, /COALESCE\(pr.identity_id,0\)=\?/);
      return statement.values.at(-1) === busyStaffId ? [{ id: 71 }] : [];
    } };
    const request = check(42, { date: '2026-10-19', startTime: '10:00', endTime: '10:15', staffId: requestedStaffId }, executor);
    if (conflict) await assert.rejects(request, { status: 409 });
    else await request;
  }
});
