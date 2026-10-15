import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { detectAssistantConfirmation } from '../client/src/lib/appointmentAssistant';

test('Italian add commands are confirmations, negatives still win', () => {
  for (const text of ['Aggiungilo.', 'aggiungi', 'Sì aggiungila', 'Inseriscilo'])
    assert.equal(detectAssistantConfirmation(text, 'it'), 'yes');
  for (const text of ['Non aggiungerlo', 'No, aggiungi un altro cliente', 'non inserire'])
    assert.equal(detectAssistantConfirmation(text, 'it'), 'no');
});

test('direct name answer beats incorrect Live spelling and consent preserves draft', () => {
  const source = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  const start = source.indexOf("} else if (pendingQuestion && detectedConfirmation !== 'unknown')");
  const end = source.indexOf('} else if (liveFieldsRef.current)', start);
  const fragment = 'if (false) {' + source.slice(start, end) + '}';
  const run = new Function('pendingQuestion', 'detectedConfirmation', 'draft', 'userMessage',
    'liveFieldsRef', `let interpretation; ${fragment}; return interpretation;`);
  const fields = { current: { clientName: 'Gianni Parisi' } };
  assert.equal(run(null, 'unknown', {}, 'Gianni Parisse', fields).clientName, 'Gianni Parisse');
  assert.equal(fields.current, null);
  const yes = run('create_client', 'yes', { clientName: 'Gianni Parisse' }, 'Aggiungilo.',
    { current: { clientName: 'Gianni Parisi' } });
  assert.deepEqual(yes, { confirmation: 'yes' });
});

test('real create-client handler returns the created entity and scopes tenant; no CSV variables', async () => {
  const source = readFileSync('server/routes/clientRoutes.ts', 'utf8');
  const start = source.indexOf('router.post("/api/clients",');
  const end = source.indexOf('// Admin-only endpoint', start);
  const code = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let handler: any;
  let saved: any;
  let cleaned: number | undefined;
  const entity = () => ({ ...saved, id: 765 });
  const deps: Record<string, any> = {
    router: { post(_path: string, fn: any) { handler = fn; } },
    logger: { debug() {} },
    db: { select: () => ({ from: () => ({ where: async () => [{ count: 0 }] }) }) },
    count() {}, eq() {}, clients: { ownerId: 'owner' },
    storage: { createClient: async (data: any) => { saved = data; return entity(); },
      getClient: async () => entity(), updateClient: async () => {} },
    generateNewClientCode: async () => 'new', generateClientCode: async () => 'legacy',
    sendPersistenceUnavailable: () => false,
    require: () => ({ cleanupDemoDataIfNeeded: async (id: number) => { cleaned = id; } }),
  };
  new Function(...Object.keys(deps), code)(...Object.values(deps));
  let status = 200, body: any;
  const res = { status(n: number) { status = n; return this; }, json(value: any) { body = value; } };
  await handler({ isAuthenticated: () => true, user: { id: 20, ownerId: 10, type: 'staff' },
    body: { firstName: 'Gianni', lastName: 'Parisse', phone: '', userId: 999, ownerId: 999, id: 999, isDemo: true } }, res);
  assert.equal(status, 201);
  assert.equal(body.id, 765);
  assert.equal(saved.lastName, 'Parisse');
  assert.equal(saved.userId, 10);
  assert.equal(saved.ownerId, 10);
  assert.equal(saved.id, undefined);
  assert.equal(saved.isDemo, false);
  assert.equal(cleaned, 10);
});
