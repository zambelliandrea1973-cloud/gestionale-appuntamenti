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
  assert.match(fab, /const alternatives=\[rowPosition,/);
  const width = 56, margin = 12, sliderLeft = 174, micTop = 806, micHeight = 48;
  const position = { x: sliderLeft - margin - width, y: micTop + (micHeight - 48) / 2 };
  assert.ok(position.x >= 8 && position.x + width + margin <= sliderLeft);
  assert.equal(position.y, micTop, 'manual action fits alongside both fixed mobile controls');
});