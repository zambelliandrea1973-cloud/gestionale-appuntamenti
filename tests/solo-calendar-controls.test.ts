import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function render(multi: boolean, mode: string) {
  const jsx = (type: any, props: any) => ({ type, props });
  const deps: Record<string, any> = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect() {}, useState: () => [false, () => {}] },
    'lucide-react': {},
    '@/components/ui/button': { Button: 'button' },
    '@/hooks/use-appointment-mode': { useAppointmentMode: () => [mode, () => {}] },
    './PersonalSpaceProvider': { usePersonalSpace: () => ({
      profiles: { multi }, unlocked: true, access: { profile: { name: 'Test' } },
      requestAccess() {}, lock() {},
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
  assert.equal(render(false, 'work'), null);
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
