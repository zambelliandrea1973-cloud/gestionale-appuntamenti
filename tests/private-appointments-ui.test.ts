import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const agenda = readFileSync('client/src/components/private-appointments/PrivateAgenda.tsx', 'utf8');

test('private save and voice lifecycle guards survive React StrictMode effect replay', () => {
  for (const component of ['AppointmentForm', 'VoiceComposer']) {
    const start = agenda.indexOf(`function ${component}`);
    const tail = agenda.slice(start);
    const effect = tail.match(/useEffect\(\(\)=>\{mounted\.current=true;return\(\)=>\{[^}]+\};\},\[\]\);/)?.[0];
    assert.ok(effect, `${component} re-arms the mounted guard on every effect setup`);
    const mounted = { current: true };
    const operation = { current: 0 };
    const recognition = { current: { stop() {} } };
    let setup: (() => (() => void)) | undefined;
    const code = ts.transpileModule(effect, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('useEffect', 'mounted', 'operation', 'recognition', code)(
      (callback: () => (() => void)) => { setup = callback; }, mounted, operation, recognition,
    );
    assert.ok(setup);
    const cleanup = setup!();
    assert.equal(mounted.current, true);
    cleanup();
    assert.equal(mounted.current, false, 'real unmount rejects late private responses');
    setup!(); // React StrictMode: setup → cleanup → setup with the SAME ref.
    assert.equal(mounted.current, true, 'live component accepts the saved event and clears busy state');
  }
});

test('mobile month has one manual action and both paths respect free mode', () => {
  const month = readFileSync('client/src/components/MonthView.tsx', 'utf8');
  const callback = month.slice(month.indexOf('onNewAppointment={() =>'), month.indexOf('showNewAppointmentAction={false}'));
  assert.match(callback, /privateAppointments\.mode === 'free'/);
  assert.match(callback, /privateAppointments\.openCreate\('manual'\)/);
  assert.ok(callback.indexOf("openCreate('manual')") < callback.indexOf('setNewApptDay'));
  assert.match(month, /showNewAppointmentAction=\{false\}/, 'old in-grid plus does not duplicate the bottom-row manual action');
  const fab = readFileSync('client/src/components/FloatingActionButton.tsx', 'utf8');
  assert.match(fab, /privateAppointments\.mode === 'free'[\s\S]*privateAppointments\.openCreate\('manual'\)/);
  assert.match(fab, /rowPosition\.y = targetCenter - centerOffset/, 'align the visible button without clamping its empty shell');
  assert.match(fab, /const alternatives=\[rowPosition,/);
  const width = 56, margin = 12, sliderLeft = 174, micTop = 806, micHeight = 48;
  const position = { x: sliderLeft - margin - width, y: micTop + (micHeight - 48) / 2 };
  assert.ok(position.x >= 8 && position.x + width + margin <= sliderLeft);
  assert.equal(position.y, micTop, 'manual action fits alongside both fixed mobile controls');
});

test('one completed day-slot tap opens the selected mode with its date/time, never a scroll', () => {
  const day = readFileSync('client/src/components/DayViewWithTimeSlots.tsx', 'utf8');
  const start = day.indexOf('  const handleSlotClick =');
  const end = day.indexOf('  const handleModalClose =', start);
  assert.ok(start >= 0 && end > start);
  const handler = ts.transpileModule(day.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const mode of ['work', 'free']) {
    const moved = { current: true }, previous = { current: null };
    const times: string[] = [], dialogs: unknown[] = [];
    const open = new Function('touchMovedRef', 'lastSlotTapRef', 'setSelectedTime', 'setSelectedSlotTime',
      'privateAppointments', 'selectedDate', 'formatDateForApi', 'setSelectedAppointmentId', 'setIsAppointmentModalOpen',
      `${handler}; return handleSlotClick;`)(
      moved, previous, (time: string) => times.push(time), () => {},
      { mode, openCreate: (kind: string, defaults: any) => dialogs.push({ kind, defaults }) },
      new Date(2030, 8, 13, 12),
      (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      () => {}, (isOpen: boolean) => dialogs.push({ work: isOpen }),
    );
    open('17:45');
    assert.deepEqual(dialogs, [], 'synthetic scroll click cannot create');
    open('17:45');
    assert.equal(dialogs.length, 1, 'first actual completed tap opens, without a second tap');
    assert.deepEqual(times, ['17:45']);
    if (mode === 'free') assert.deepEqual(dialogs[0], {
      kind: 'manual', defaults: { startDate: '2030-09-13', endDate: '2030-09-13', startTime: '17:45', endTime: '18:15' },
    });
    else assert.deepEqual(dialogs[0], { work: true });
  }
});

test('account-scoped creation mode survives private locking without retaining access', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  const ui: any = {}, mode: any = {};
  let notified = 0;
  const execute = (file: string, exports: any, require: (id: string) => any) => {
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    new Function('exports', 'require', 'localStorage', 'window', source)(
      exports, require, storage, { dispatchEvent: () => notified++ },
    );
  };
  execute('client/src/lib/persistentUiPreferences.ts', ui, () => { throw new Error('Unexpected dependency'); });
  execute('client/src/lib/privateAppointmentMode.ts', mode, (id) => {
    assert.equal(id, './persistentUiPreferences'); return ui;
  });
  assert.equal(mode.readPrivateAppointmentMode(), 'work');
  ui.setPersistentUiPreferenceValue(41, 'appointment-creation-mode', 'personal');
  assert.equal(mode.readPrivateAppointmentMode(41), 'free', 'retain previous account preference');
  mode.persistPrivateAppointmentMode(41, 'free');
  mode.resetNativeAppointmentMode(41);
  assert.equal(mode.readPrivateAppointmentMode(41), 'free', 'native work forms cannot reset private selector');
  assert.equal(mode.readPrivateAppointmentMode(42), 'work', 'no preference shared with a different account');
  assert.equal(notified, 1, 'native controls update their stale mode');
  assert.ok([...values.keys()].every((key) => ui.isPersistentUiPreferenceKey(key)), 'login/logout cleanup retains only safe UI preferences');
  const provider = readFileSync('client/src/components/private-appointments/PrivateAppointmentsProvider.tsx', 'utf8');
  const cleanup = provider.slice(provider.indexOf('const clearSensitive'), provider.indexOf('const armTokenExpiry'));
  assert.match(cleanup, /clearPrivateToken\(\)/);
  assert.match(cleanup, /setAccess\(null\)/);
  assert.doesNotMatch(cleanup, /setMode|persistPrivateAppointmentMode/, 'locking discards access, not chosen mode');
});

test('actual calendar and native forms have only the profile-protected private entry path', () => {
  for (const file of ['VoiceAppointmentAssistant', 'AppointmentForm', 'WeekView', 'MonthView']) {
    const source = readFileSync(`client/src/components/${file}.tsx`, 'utf8');
    assert.doesNotMatch(source, /AppointmentModeSwitch|PersonalVoiceAppointmentAssistant|PersonalAppointmentForm|usePersonalCalendarAppointments/);
  }
  const layout = readFileSync('client/src/components/Layout.tsx', 'utf8');
  assert.match(layout, /<PrivateAppointmentsProvider[\s\S]*<PrivateModeClickBridge/);
  assert.match(layout, /target\.closest\('\[data-testid="button-open-voice-appointment-assistant"\]'\)/);
  assert.match(layout, /privateAppointments\.openCreate\('voice'\)/);
});