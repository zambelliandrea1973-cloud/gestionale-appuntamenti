import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
import { createPersonalSpaceIdle, PERSONAL_SPACE_IDLE_MS, PERSONAL_SPACE_WARNING_MS, showPersonalCalendarDetails } from '../../../shared/personalSpaceIdle';

test('idle checks warn at 14, expire at 15, never renew on checks, and cannot resurrect on resume', () => {
  let now = 0, renewals = 0, expirations = 0;
  const warnings: boolean[] = [];
  const idle = createPersonalSpaceIdle({ now: () => now, renew: () => renewals++, expire: () => expirations++, warning: value => warnings.push(value) });
  now = PERSONAL_SPACE_WARNING_MS - 1; idle.check(); assert.deepEqual(warnings, []);
  now++; idle.check(); assert.deepEqual(warnings, [true]);
  now = PERSONAL_SPACE_IDLE_MS - 1; assert.equal(idle.check(), true);
  now++; assert.equal(idle.activity(), false);
  assert.equal(renewals, 0); assert.equal(expirations, 1);
  now += 90_000; assert.equal(idle.activity(true), false); idle.check();
  assert.equal(renewals, 0); assert.equal(expirations, 1);
});

test('actual activity is throttled, explicit continue renews, and background polling does not extend idle', () => {
  let now = 0, renewals = 0, expired = false;
  const idle = createPersonalSpaceIdle({ now: () => now, renew: () => renewals++, expire: () => { expired = true; }, warning() {} });
  now = 10_000; idle.activity(); assert.equal(renewals, 0);
  now = 30_000; idle.activity(); assert.equal(renewals, 1);
  now = 31_000; idle.activity(); assert.equal(renewals, 1);
  now += PERSONAL_SPACE_WARNING_MS; idle.check(); assert.equal(renewals, 1);
  idle.activity(true); assert.equal(renewals, 2);
  now += PERSONAL_SPACE_IDLE_MS; idle.check(); assert.equal(expired, true);
  assert.equal(renewals, 2);
  assert.equal(showPersonalCalendarDetails('work', true, false), true);
  assert.equal(showPersonalCalendarDetails('personal', true, false), true);
  assert.equal(showPersonalCalendarDetails('work', true, true), false);
  assert.equal(showPersonalCalendarDetails('personal', false, true), false);
});

function providerFixture(multi = true) {
  const source = readFileSync('client/src/components/personal-space/PersonalSpaceProvider.tsx', 'utf8');
  const ast = ts.createSourceFile('provider.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect = '', purge = '', lock = '';
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' &&
      node.arguments[0]?.getText(ast).includes('const idle = createPersonalSpaceIdle')) effect = node.arguments[0].getText(ast);
    if (ts.isVariableDeclaration(node) && ['purge', 'lock'].includes(node.name.getText(ast)) && node.initializer && ts.isCallExpression(node.initializer)) {
      if (node.name.getText(ast) === 'purge') purge = node.initializer.arguments[0].getText(ast);
      else lock = node.initializer.arguments[0].getText(ast);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  const client = new QueryClient();
  for (const key of [['/api/appointments', 'personal', 3], ['/api/personal-appointments/space/access', 42, 3],
    ['/api/personal-appointments/busy'], ['/api/personal-appointments/space/profiles'], ['/api/appointments']]) client.setQueryData(key, ['cached']);
  let now = 0, token: string | null = 'protected-token', renewals = 0, lockRequests = 0, warning = false, profile: number | undefined = 3;
  let interval: (() => void) | undefined;
  const events = new Map<string, (event: any) => void>();
  const trace: string[] = [];
  const env: any = {
    client, ACCESS_KEY: ['/api/personal-appointments/space/access'], multi, tokenReady: true, profileId: 3,
    getSpaceToken: () => token, setSpaceToken: (value: string | null) => { token = value; trace.push('token-cleared'); },
    setTokenReady() {}, setProfileId: (value: number | undefined) => { profile = value; },
    setPrompt: (value: boolean) => { assert.equal(value, false); }, setIdleWarning: (value: boolean) => { warning = value; },
    setModeRef: { current: (mode: string) => trace.push(mode) }, idleRef: { current: null },
    Date: { now: () => now }, createPersonalSpaceIdle,
    spaceApi: { lock: async () => { lockRequests++; }, activity: async (id: number) => { assert.equal(id, 3); renewals++; } },
    window: {
      setInterval: (callback: () => void) => { interval = callback; return 1; }, clearInterval() {},
      addEventListener: (name: string, fn: any) => events.set(name, fn), removeEventListener: (name: string) => events.delete(name),
    },
    document: { visibilityState: 'visible', addEventListener: (name: string, fn: any) => events.set(name, fn), removeEventListener: (name: string) => events.delete(name) },
  };
  const evaluate = (expression: string) => {
    const code = ts.transpileModule(`const value = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return new Function('env', `const {${Object.keys(env).join(',')}}=env;${code};return value;`)(env);
  };
  env.purge = evaluate(purge);
  env.lock = evaluate(lock);
  const cleanup = evaluate(effect)();
  return { client, events, trace, cleanup, tick: (time: number) => { now = time; interval?.(); },
    activity: (time: number) => { now = time; events.get('pointerdown')?.({ isTrusted: true }); },
    continue: () => env.idleRef.current?.activity(true),
    state: () => ({ token, profile, warning, renewals, lockRequests, initialized: !!interval }) };
}

test('actual provider idle effect purges private cache/profile, goes work before locking and cannot renew on background resume', async () => {
  const fixture = providerFixture();
  fixture.tick(PERSONAL_SPACE_WARNING_MS);
  assert.equal(fixture.state().warning, true);
  assert.equal(fixture.state().renewals, 0);
  fixture.activity(PERSONAL_SPACE_IDLE_MS);
  await Promise.resolve();
  assert.deepEqual(fixture.trace.slice(0, 2), ['work', 'token-cleared']);
  assert.equal(fixture.state().token, null);
  assert.equal(fixture.state().profile, undefined);
  assert.equal(fixture.state().lockRequests, 1);
  assert.equal(fixture.client.getQueryData(['/api/appointments', 'personal', 3]), undefined);
  assert.equal(fixture.client.getQueryData(['/api/personal-appointments/space/access', 42, 3]), undefined);
  assert.ok(fixture.client.getQueryData(['/api/appointments']));
  assert.ok(fixture.client.getQueryData(['/api/personal-appointments/busy']));
  fixture.events.get('pageshow')?.({});
  fixture.activity(PERSONAL_SPACE_IDLE_MS + 500);
  assert.equal(fixture.state().renewals, 0);
  fixture.cleanup();
  const assistant = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(assistant, /previousProfile.current !== profileId && previousProfile.current !== undefined/);
  const profileChange = assistant.slice(assistant.indexOf('if (previousProfile.current !== profileId'), assistant.indexOf('previousProfile.current = profileId;'));
  assert.match(profileChange, /stop\(\)/);
  assert.match(profileChange, /setOpen\(false\)/);
  assert.match(profileChange, /setMessages\(\[\]\)/);
  assert.match(profileChange, /setDraft\(\{\}\)/);
});

test('actual provider renews selected profile only on trusted activity or explicit warning continuation', async () => {
  const fixture = providerFixture();
  fixture.tick(30_000);
  assert.equal(fixture.state().renewals, 0);
  fixture.events.get('keydown')?.({ isTrusted: false });
  assert.equal(fixture.state().renewals, 0);
  fixture.activity(30_000);
  await Promise.resolve();
  assert.equal(fixture.state().renewals, 1);
  fixture.activity(31_000);
  assert.equal(fixture.state().renewals, 1);
  fixture.tick(31_000 + PERSONAL_SPACE_WARNING_MS);
  assert.equal(fixture.state().warning, true);
  fixture.continue();
  await Promise.resolve();
  assert.equal(fixture.state().renewals, 2);
  assert.equal(fixture.state().warning, false);
  fixture.tick(31_000 + PERSONAL_SPACE_WARNING_MS + PERSONAL_SPACE_IDLE_MS - 1);
  assert.equal(fixture.state().lockRequests, 0);
  fixture.tick(31_000 + PERSONAL_SPACE_WARNING_MS + PERSONAL_SPACE_IDLE_MS);
  assert.equal(fixture.state().lockRequests, 1);
  fixture.cleanup();
});

test('solo provider bypasses idle listeners, warning and expiry entirely', () => {
  const fixture = providerFixture(false);
  fixture.tick(PERSONAL_SPACE_IDLE_MS * 9);
  assert.equal(fixture.state().initialized, false);
  assert.equal(fixture.events.size, 0);
  assert.equal(fixture.state().token, 'protected-token');
  assert.equal(fixture.state().warning, false);
  assert.equal(fixture.state().lockRequests, 0);
});

test('actual renewal SQL requires unexpired token scoped to account, session and selected profile', async () => {
  const source = readFileSync('server/services/privateAppointmentAccess.ts', 'utf8');
  const start = source.indexOf('export async function renewPrivateAccess');
  const end = source.indexOf('export async function getPrivateProfile', start);
  const code = ts.transpileModule(source.slice(start, end).replace('export async', 'async'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  class PrivateError extends Error { constructor(public status: number, message: string) { super(message); } }
  let accepts = true, statements = 0;
  const env = { PrivateError, privateUser: () => 42, privateHash: (value: string) => `hash:${value}`,
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join('?'), values }),
    db: { execute: async (statement: any) => {
      statements++;
      assert.match(statement.text, /interval '5 minutes'/);
      assert.match(statement.text, /expires_at>now\(\)/);
      assert.match(statement.text, /profile_id=\?/);
      assert.deepEqual(statement.values, [`hash:${'a'.repeat(64)}`, 42, 'hash:session-one', 3]);
      return accepts ? [{ expiresAt: '2026-10-19T10:15:00Z' }] : [];
    } } };
  const renew = new Function('env', `const {${Object.keys(env).join(',')}}=env;${code};return renewPrivateAccess;`)(env);
  const request = { sessionID: 'session-one', get: () => 'a'.repeat(64) };
  assert.equal((await renew(request, 3)).renewed, true);
  accepts = false;
  await assert.rejects(renew(request, 3), { status: 403 });
  await assert.rejects(renew({ ...request, get: () => undefined }, 3), { status: 403 });
  assert.equal(statements, 2);
  const routes = readFileSync('server/routes/personalSpaceRoutes.ts', 'utf8');
  const access = routes.slice(routes.indexOf("router.get('/access'"), routes.indexOf("router.post('/google/connect'"));
  assert.doesNotMatch(access, /renewPrivateAccess|expires_at/);
  assert.match(routes, /profile.id !== profileId/);
  const provider = readFileSync('client/src/components/personal-space/PersonalSpaceProvider.tsx', 'utf8');
  assert.match(provider, /if \(accountAtSubmit !== accountRef.current\) return/);
});
