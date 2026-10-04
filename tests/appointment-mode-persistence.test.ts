import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function loadModule(file: string, dependencies: Record<string, unknown>, storage: Storage) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: any = {};
  new Function('exports', 'require', 'localStorage', 'window', code)(
    exports, (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency ${name}`);
      return dependencies[name];
    }, storage, { addEventListener() {}, removeEventListener() {} },
  );
  return exports;
}

function harness() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } as Storage;
  const preferences = loadModule('client/src/lib/persistentUiPreferences.ts', {}, storage);
  let userId: number | undefined = 101;
  const reload = () => loadModule('client/src/hooks/use-appointment-mode.ts', {
    react: { useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot() },
    './use-auth': { useAuth: () => ({ user: userId ? { id: userId } : null }) },
    '../lib/persistentUiPreferences': preferences,
  }, storage).useAppointmentMode;
  return { values, preferences, reload, user: (id: number | undefined) => { userId = id; } };
}

test('both appointment modes survive logout cleanup, login and a complete reload', () => {
  const h = harness();
  for (const mode of ['personal', 'work'] as const) {
    let useMode = h.reload();
    useMode()[1](mode);
    h.values.set('temporary-session-data', 'discard');
    // The real logout and both login screens preserve this same key predicate.
    for (const key of h.values.keys()) {
      if (!h.preferences.isPersistentUiPreferenceKey(key)) h.values.delete(key);
    }
    h.user(undefined);
    assert.equal(useMode()[0], 'work');
    h.user(101);
    useMode = h.reload();
    assert.equal(useMode()[0], mode);
    assert.equal(h.values.has('temporary-session-data'), false);
  }
  for (const file of ['client/src/components/LogoutButton.tsx', 'client/src/pages/StaffLogin.tsx', 'client/src/pages/UnifiedLogin.tsx']) {
    assert.match(readFileSync(file, 'utf8'), /!isPersistentUiPreferenceKey\(key\)/);
  }
});

test('different professionals keep independent choices on the same browser', () => {
  const h = harness();
  const useMode = h.reload();
  useMode()[1]('personal');
  h.user(202);
  assert.equal(useMode()[0], 'work');
  useMode()[1]('personal');
  h.user(101);
  useMode()[1]('work');
  h.user(202);
  assert.equal(h.reload()()[0], 'personal');
  h.user(101);
  assert.equal(h.reload()()[0], 'work');
});

test('missing and invalid preferences default to work; signed-out controls cannot save', () => {
  const h = harness();
  const useMode = h.reload();
  assert.equal(useMode()[0], 'work');
  h.preferences.setPersistentUiPreferenceValue(101, 'appointment-creation-mode', 'invalid');
  assert.equal(useMode()[0], 'work');
  h.user(undefined);
  const before = [...h.values];
  useMode()[1]('personal');
  assert.deepEqual([...h.values], before);
});