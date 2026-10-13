import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';

// Execute the actual enrollment handler with fake SQL; never contact a database.
const source = readFileSync('server/routes/personalSpaceRoutes.ts', 'utf8');
const ast = ts.createSourceFile('routes.ts', source, ts.ScriptTarget.Latest, true);
let handler = '';
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'router.post' &&
      node.arguments[0]?.getText(ast) === "'/profiles'") {
    handler = (node.arguments[2] as ts.CallExpression).arguments[0].getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
class PrivateError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function enroll(identityId: number, multi = true, existing = false) {
  const calls: any[] = [];
  const env = {
    z, PrivateError, privateUser: () => 42,
    privateIdentities: async () => ({ multi, identities: [{ identityId: 9, name: 'Nome Registrato' }] }),
    hashPrivatePassword: async () => 'mock-hash',
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join('?'), values }),
    db: { execute: async (query: any) => {
      calls.push(query);
      return existing ? [] : [{ id: 3, identity_id: 9, name: 'Nome Registrato' }];
    } },
    createPrivateAccess: async () => 'synthetic-capability',
    safe: (profile: any) => profile,
  };
  assert.ok(handler);
  const code = ts.transpileModule(`const handler = ${handler};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = new Function('env', `const {${Object.keys(env).join(',')}} = env; ${code}; return handler;`)(env);
  let result: any;
  const response = { status: () => response, json: (value: any) => { result = value; } };
  const run = () => fn({ body: { identityId, name: 'Nome alternativo', password: 'synthetic-password' } }, response);
  return { run, calls, result: () => result };
}
test('enrollment uses registered identity name, never an arbitrary alternate identity', async () => {
  const fixture = await enroll(9);
  await fixture.run();
  assert.deepEqual(fixture.calls[0].values, [42, 9, 'Nome Registrato', 'mock-hash']);
  assert.equal(fixture.result().token, 'synthetic-capability');
  assert.match(fixture.calls[0].text, /WHERE private_appointment_profiles.password_hash IS NULL/);
});
test('unlisted identities cannot enroll', async () => {
  const fixture = await enroll(88);
  await assert.rejects(fixture.run, { status: 404 });
  assert.equal(fixture.calls.length, 0);
});
test('solo operator cannot be forced into password enrollment', async () => {
  const fixture = await enroll(9, false);
  await assert.rejects(fixture.run, { status: 409 });
  assert.equal(fixture.calls.length, 0);
});
test('enrollment cannot replace an existing private password', async () => {
  const fixture = await enroll(9, true, true);
  await assert.rejects(fixture.run, { status: 409 });
  assert.equal(fixture.result(), undefined);
});
