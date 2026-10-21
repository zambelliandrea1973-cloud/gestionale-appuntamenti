import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('only establishing a login counts; account reads and session restoration do not', async () => {
  const source = readFileSync('server/auth.ts', 'utf8');
  const start = source.indexOf('passport.serializeUser(');
  const end = source.indexOf('// Deserialize the user', start);
  const code = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let serialize: any;
  const events: number[] = [];
  new Function('passport', 'recordUserAccess', code)(
    { serializeUser(fn: any) { serialize = fn; } },
    async (id: number) => { events.push(id); },
  );
  const login = () => new Promise(resolve => serialize(
    { ip: 'test', headers: {} }, { id: 123, type: 'staff' },
    (error: any, value: string) => { assert.equal(error, null); resolve(value); }));
  assert.equal(await login(), 'staff:123');
  assert.deepEqual(events, [123]);
  const settings = readFileSync('server/routes/settingsRoutes.ts', 'utf8');
  assert.doesNotMatch(settings, /recordUserAccess|insert\(userLogins\)/);
  const deserialize = source.slice(end, source.indexOf('app.post("/api/staff/login"'));
  assert.doesNotMatch(deserialize, /recordUserAccess|insert\(userLogins\)/);
  // A new login after logout counts even immediately, without a time window.
  assert.equal(await login(), 'staff:123');
  assert.deepEqual(events, [123, 123]);
  assert.equal((source.match(/recordUserAccess\(/g) || []).length, 1);
});
