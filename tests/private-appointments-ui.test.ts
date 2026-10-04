import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('selected local calendar has no second private login or implicit personal Google export', () => {
  const layout = readFileSync('client/src/components/Layout.tsx', 'utf8');
  const calendar = readFileSync('client/src/pages/Calendar.tsx', 'utf8');
  const routes = readFileSync('server/simple-routes.ts', 'utf8');
  assert.doesNotMatch(layout + calendar, /PrivateAppointmentsProvider|PrivateModeClickBridge|<PrivateAgenda/);
  assert.doesNotMatch(routes, /requireOwnerPrivateProtection/);
  const voice = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(voice, /mode === 'personal' \? <PersonalVoiceAppointmentAssistant/);
  const form = readFileSync('client/src/components/AppointmentForm.tsx', 'utf8');
  assert.match(form, /personal \? <PersonalAppointmentForm/);
  const local = readFileSync('server/routes/personalAppointmentRoutes.ts', 'utf8');
  assert.doesNotMatch(local, /googleapis|syncPrivateGoogle|sendMail|createClient|createService/);
});

test('active work/personal preference survives logout and reload and stays scoped to each account', () => {
  const saved = new Map<string, string>();
  let active: number | undefined = 51;
  const load = () => {
    const module = { exports: {} as any };
    const source = ts.transpileModule(readFileSync('client/src/hooks/use-appointment-mode.ts', 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const mockRequire = (name: string) => {
      if (name === 'react') return { useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot() };
      if (name === './use-auth') return { useAuth: () => ({ user: active ? { id: active } : undefined }) };
      return {
        getPersistentUiPreferenceValue: (id: number, preference: string) => saved.get(`${id}:${preference}`),
        setPersistentUiPreferenceValue: (id: number, preference: string, value: string) => saved.set(`${id}:${preference}`, value),
      };
    };
    new Function('require', 'module', 'exports', source)(mockRequire, module, module.exports);
    return module.exports.useAppointmentMode;
  };
  const useMode = load();
  assert.equal(useMode()[0], 'work');
  useMode()[1]('personal');
  active = undefined;
  assert.equal(useMode()[0], 'work', 'logout does not inherit a previous account mode');
  active = 52;
  assert.equal(useMode()[0], 'work');
  active = 51;
  assert.equal(load()()[0], 'personal', 'a fresh module reload reads the saved account preference');
  useMode()[1]('work');
  assert.equal(load()()[0], 'work');
  assert.equal(saved.size, 1);
  assert.doesNotMatch([...saved.keys()].join(), /token|password|access/);
});