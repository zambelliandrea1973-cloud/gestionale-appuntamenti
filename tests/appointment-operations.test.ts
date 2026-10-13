import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAppointmentOperations, detectAppointmentAction, matchExistingAppointments, movedAppointment, type ExistingAppointment, type OperationState } from '../client/src/lib/appointmentOperations';
import { liveAppointmentSetup, liveInterpretationSchema } from '../shared/liveAppointmentProtocol';

const dentist: ExistingAppointment = {
  id: 7, title: 'Dentista', date: '2026-10-28', startTime: '15:00', endTime: '16:00',
  location: 'Studio', notes: 'Conservare la nota',
};
function setup(records: ExistingAppointment[] = [dentist]) {
  let state: OperationState | null = null;
  let scope = 'personal:3';
  let enabled = true;
  let fresh = { ...records[0] };
  let release: ((value: ExistingAppointment[]) => void) | undefined;
  let delay = false;
  let fail = false;
  const messages: string[] = [];
  const writes: any[] = [];
  const changed: string[] = [];
  const engine = createAppointmentOperations({
    scope: () => scope, enabled: () => enabled, language: () => 'it',
    load: async () => delay ? new Promise<ExistingAppointment[]>(resolve => { release = resolve; }) : records,
    read: async () => fresh,
    write: async (action, record, changes) => { if (fail) throw new Error('Mock failure'); writes.push({ action, record, changes }); },
    state: value => { state = value; }, say: async message => { messages.push(message); },
    changed: async (_record, date) => { changed.push(date); },
  });
  return { engine, messages, writes, changed, state: () => state,
    changeScope: () => { scope = 'personal:9'; }, disable: () => { enabled = false; },
    fresh: (value: ExistingAppointment) => { fresh = value; }, fail: () => { fail = true; },
    delay: () => { delay = true; }, release: () => release!(records) };
}
test('delete lookup identifies the dentist rather than starting a creation draft', async () => {
  const f = setup();
  assert.equal(await f.engine.handle('Ciao. Mi elimini l’appuntamento quello del dentista.'), true);
  assert.equal(f.state()?.selected?.id, 7);
  assert.equal(f.state()?.phase, 'confirm');
  assert.equal(f.writes.length, 0);
  assert.doesNotMatch(f.messages.join(' '), /creare/);
  await f.engine.handle('sì, confermo');
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].action, 'delete');
});
test('synonyms and semantic AI intentions trigger existing operations', () => {
  for (const text of ['disdici il dentista', 'annulla il dentista', 'rimuovi il dentista', 'cancellami il dentista'])
    assert.equal(detectAppointmentAction(text), 'delete');
  for (const text of ['rimandalo', 'anticipa il dentista', 'riprogramma il dentista', 'sposta il dentista'])
    assert.equal(detectAppointmentAction(text), 'move');
  assert.equal(detectAppointmentAction('Non ci vado più dal dentista', { action: 'delete' }), 'delete');
  assert.equal(detectAppointmentAction('Facciamolo più tardi', { action: 'move' }), 'move');
});
test('missing subject never selects the sole appointment arbitrarily', async () => {
  const f = setup();
  await f.engine.handle('elimina un appuntamento', { action: 'delete' });
  assert.equal(f.state()?.selected, undefined);
  assert.equal(f.writes.length, 0);
  assert.match(f.messages.at(-1)!, /titolo|nome esatto/);
});
test('duplicate titles require selecting a candidate before confirmation', async () => {
  const f = setup([dentist, { ...dentist, id: 8, date: '2026-11-02' }]);
  await f.engine.handle('elimina il dentista');
  assert.equal(f.state()?.phase, 'choose');
  await f.engine.handle('sì');
  assert.equal(f.writes.length, 0);
  await f.engine.handle('il secondo');
  assert.equal(f.state()?.selected?.id, 8);
  assert.equal(f.writes.length, 0);
});
test('deletion date and original move date distinguish duplicate subjects', () => {
  const records = [dentist, { ...dentist, id: 8, date: '2026-11-02' }];
  assert.deepEqual(matchExistingAppointments(records, '', { searchTitle: 'Dentista', date: '2026-11-02' }, 'delete').map(r => r.id), [8]);
  assert.deepEqual(matchExistingAppointments(records, '', { searchTitle: 'Dentista', originalDate: '2026-10-28', date: '2026-11-02' }, 'move').map(r => r.id), [7]);
});
test('date clarification stays within the previously matched subject, not unrelated same-day appointments', async () => {
  const f = setup([dentist, { ...dentist, id: 8, date: '2026-11-02' }, { ...dentist, id: 9, title: 'Cinema' }]);
  await f.engine.handle('sposta il dentista al 29', { searchTitle: 'Dentista', date: '2026-10-29' });
  await f.engine.handle('quello del 28', { originalDate: '2026-10-28' });
  assert.equal(f.state()?.selected?.id, 7);
  assert.equal(f.state()?.changes.date, '2026-10-29');
  assert.equal(f.writes.length, 0);
});
test('move asks its destination, preserves duration/details and waits for confirmation', async () => {
  const f = setup();
  await f.engine.handle('sposta il dentista');
  assert.equal(f.state()?.phase, 'details');
  assert.equal(f.writes.length, 0);
  await f.engine.handle('il 29 alle 17', { date: '2026-10-29', startTime: '17:00' });
  assert.equal(f.state()?.phase, 'confirm');
  assert.equal(f.writes.length, 0);
  await f.engine.handle('confermo');
  assert.equal(f.writes[0].action, 'move');
  assert.equal(f.writes[0].changes.endTime, '18:00');
  assert.equal(f.writes[0].changes.notes, dentist.notes);
  assert.equal(f.writes[0].changes.location, dentist.location);
});
test('confirmation containing a corrected destination shows a new preview without writing', async () => {
  const f = setup();
  await f.engine.handle('sposta il dentista al 29', { date: '2026-10-29' });
  await f.engine.handle('sì, ma alle 17', { startTime: '17:00' });
  assert.equal(f.writes.length, 0);
  assert.equal(f.state()?.changes.startTime, '17:00');
});
test('cancellation and negative confirmation leave all appointments intact', async () => {
  for (const response of ['no', 'annulla', 'lascia perdere']) {
    const f = setup();
    await f.engine.handle('elimina il dentista');
    await f.engine.handle(response);
    assert.equal(f.state(), null);
    assert.equal(f.writes.length, 0);
  }
});
test('negative confirmation with a new destination is a correction, not abandonment', async () => {
  const f = setup();
  await f.engine.handle('sposta il dentista al 29', { date: '2026-10-29' });
  await f.engine.handle('no, il 30 alle 17', { date: '2026-10-30', startTime: '17:00' });
  assert.equal(f.state()?.changes.date, '2026-10-30');
  assert.equal(f.state()?.phase, 'confirm');
  assert.equal(f.writes.length, 0);
});
test('clarifying a different original date replaces the target, never silently confirms the old one', async () => {
  const f = setup([dentist, { ...dentist, id: 8, date: '2026-11-02' }]);
  await f.engine.handle('elimina il dentista del 28', { searchTitle: 'Dentista', date: '2026-10-28' });
  await f.engine.handle('no, quello del 2 novembre', { searchTitle: 'Dentista', date: '2026-11-02' });
  assert.equal(f.state()?.selected?.id, 8);
  assert.equal(f.writes.length, 0);
});
test('explicit new creation changes conversation intention without applying the old deletion', async () => {
  const f = setup();
  await f.engine.handle('elimina il dentista');
  assert.equal(await f.engine.handle('invece crea un nuovo appuntamento', { action: 'create' }), false);
  assert.equal(f.state(), null);
  assert.equal(f.writes.length, 0);
});
test('profile change during a pending lookup suppresses results and any mutation', async () => {
  const f = setup();
  f.delay();
  const pending = f.engine.handle('elimina il dentista');
  f.changeScope(); f.release();
  await pending;
  assert.equal(f.state()?.selected, undefined);
  await f.engine.confirm();
  assert.equal(f.writes.length, 0);
});
test('locked profile cannot confirm an already selected private appointment', async () => {
  const f = setup();
  await f.engine.handle('elimina il dentista');
  f.disable();
  await f.engine.confirm();
  assert.equal(f.writes.length, 0);
});
test('changed records require renewed confirmation', async () => {
  const f = setup();
  await f.engine.handle('elimina il dentista');
  f.fresh({ ...dentist, date: '2026-10-30' });
  await f.engine.confirm();
  assert.equal(f.writes.length, 0);
  assert.equal(f.state()?.selected?.date, '2026-10-30');
  await f.engine.confirm();
  assert.equal(f.writes.length, 1);
});
test('request failures are not reported as successful mutations', async () => {
  const f = setup();
  await f.engine.handle('elimina il dentista');
  f.fail();
  await assert.rejects(f.engine.confirm(), /Mock failure/);
  assert.equal(f.writes.length, 0);
  assert.doesNotMatch(f.messages.join(' '), /Appuntamento eliminato\./);
});
test('invalid destination is rejected rather than rolling into another date', () => {
  assert.throws(() => movedAppointment(dentist, { startTime: '23:30', durationMinutes: 90 }));
  assert.throws(() => movedAppointment(dentist, { date: '2026-02-30' }));
});
test('busy placeholders and foreign personal calendar representations are never mutation candidates', () => {
  assert.deepEqual(matchExistingAppointments([{ ...dentist, id: -7, isPersonalBusy: true }, { ...dentist, isPersonalAppointment: true }], '', { searchTitle: 'Dentista' }, 'delete'), []);
});
test('Live tool preserves semantic operation and original-versus-destination fields, not model IDs', () => {
  assert.equal(liveInterpretationSchema.safeParse({ action: 'delete', searchTitle: 'Dentista' }).success, true);
  assert.equal(liveInterpretationSchema.safeParse({ action: 'delete', appointmentId: 7 }).success, false);
  const setup = liveAppointmentSetup('personal', 'it').setup;
  assert.ok(setup.tools[0].functionDeclarations[0].parameters.properties.originalDate);
  assert.match(setup.systemInstruction.parts[0].text, /sinonimi e parafrasi/);
});
test('work targets are matched by client/service, while move preserves professional/room and disabled reminders', () => {
  const record: ExistingAppointment = { ...dentist, title: undefined, clientId: 11, serviceId: 12,
    client: { firstName: 'Marco', lastName: 'Conti' }, service: { name: 'Massaggio' },
    staffId: 2, roomId: 4, reminderType: null, status: 'scheduled' };
  assert.equal(matchExistingAppointments([record], '', { searchTitle: 'Marco Conti' }, 'move')[0].id, 7);
  const source = readFileSync('server/routes/appointmentRoutes.ts', 'utf8');
  const put = source.slice(source.indexOf('router.put("/api/appointments/:id"'));
  const payload = put.match(/const appointmentData = \{[\s\S]*?\n      \};/)?.[0];
  assert.ok(payload);
  const value = new Function('req', `${payload}; return appointmentData;`)({ body: { ...record, date: '2026-10-29' } });
  assert.equal(value.staffId, 2);
  assert.equal(value.roomId, 4);
  assert.equal(value.reminderType, null);
  assert.equal(value.notes, dentist.notes);
});
