import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function render(multi: boolean, mode: string, previous?: { current: boolean }, onLock?: () => void, connection: Record<string, unknown> = {}) {
  const jsx = (type: any, props: any) => ({ type, props });
  const deps: Record<string, any> = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect(fn: () => void) { if (previous) fn(); }, useRef: (value: boolean) => previous || { current: value }, useState: () => [false, () => {}] },
    'lucide-react': {},
    '@/components/ui/button': { Button: 'button' },
    '@/hooks/use-appointment-mode': { useAppointmentMode: () => [mode, () => {}] },
    './PersonalSpaceProvider': { usePersonalSpace: () => ({
      profiles: { multi }, unlocked: true, access: { profile: { name: 'Test' }, ...connection },
      requestAccess() {}, lock() { onLock?.(); },
    }) },
    './PersonalGoogleSettings': { default: 'google-settings' },
  };
  const code = ts.transpileModule(readFileSync('client/src/components/personal-space/PersonalCalendarControls.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: any = {};
  new Function('require', 'exports', code)((name: string) => deps[name], exports);
  return exports.default();
}
test('solo work calendar has no shared-calendar explanation or duplicate selector', () => {
  const tree = JSON.stringify(render(false, 'work'));
  assert.match(tree, /Google personale/);
  assert.doesNotMatch(tree, /Selettore calendario|Modalità calendario|Condiviso|Occupato|Accedi|protetto/);
});
test('solo private view retains Google settings without shared-calendar or password copy', () => {
  const tree = JSON.stringify(render(false, 'personal'));
  assert.match(tree, /Google personale/);
  assert.doesNotMatch(tree, /Condiviso|Occupato|Accedi|protetto/);
});
test('team calendar retains the selector without the permanent sharing explanation', () => {
  const tree = JSON.stringify(render(true, 'work'));
  assert.match(tree, /Condiviso/);
  assert.doesNotMatch(tree, /Il calendario di lavoro resta condiviso|Occupato/);
});
test('work handoff unlock is retained, but returning from personal to work locks access', () => {
  const previous = { current: false };
  let locks = 0;
  const lock = () => { locks++; };
  render(true, 'work', previous, lock);
  render(true, 'work', previous, lock);
  assert.equal(locks, 0, 'Password success inside Work must not revoke the handoff token');
  render(true, 'personal', previous, lock);
  render(true, 'work', previous, lock);
  assert.equal(locks, 1);
});
test('Google shortcut disappears only for a configured, healthy connection', () => {
  for (const multi of [false, true]) {
    const connected = { connected: true, calendarId: 'private-calendar' };
    const view = (connection: Record<string, unknown>) =>
      JSON.stringify(render(multi, 'personal', undefined, undefined, connection));
    assert.doesNotMatch(view({ google: connected, sync: { pending: 0 } }), /Google personale/);
    assert.match(view({ google: connected, sync: { pending: true } }), /Google personale/);
    assert.match(view({ google: connected, sync: { pending: 2 } }), /Google personale/);
    assert.match(view({ google: connected }), /Google personale/);
    assert.match(view({ google: { connected: false }, sync: { pending: 0 } }), /Google personale/);
    assert.match(view({ google: { connected: true }, sync: { pending: 0 } }), /Google personale/);
  }
});
