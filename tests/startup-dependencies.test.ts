import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import ts from 'typescript';

function startupFixture(failedAttempts = 0, idleError = false) {
  const filename = path.resolve('server/storage.ts');
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const names = ['databaseFailureCode', 'watchDatabasePool', 'checkDatabaseAvailability', 'ensureSessionTable'];
  const declarations = names.map(name => {
    const node = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(node, name);
    return node.getText(source);
  }).join('\n');
  const code = ts.transpileModule(`let isDatabaseAvailable = true;\n${declarations}\nexports.check = checkDatabaseAvailability; exports.watch = watchDatabasePool;`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const actualRequire = createRequire(filename);
  const statements: string[] = [];
  const errors: unknown[][] = [];
  const pools: EventEmitter[] = [];
  let ended = 0;
  const exports: any = {};
  new Function('exports', 'require', 'pg', 'process', 'aiTrialSchemaSql', 'console', 'setTimeout', code)(
    exports,
    (name: string) => name === './services/privateAppointmentAccess'
      ? { ensurePrivateAppointmentTables: async () => {} }
      : actualRequire(name),
    { Pool: class extends EventEmitter {
      number: number;
      closed = false;
      constructor() { super(); this.number = pools.push(this); }
      async query(sql: string) {
        statements.push(sql);
        if (this.number <= failedAttempts) throw Object.assign(new Error('connection reset'), { code: 'ECONNRESET' });
        if (idleError) this.emit('error', Object.assign(new Error('terminated'), { code: '57P01', client: { password: 'NEVER_LOG_THIS' } }));
      }
      async end() {
        assert.equal(this.closed, false, 'pool must close once');
        this.closed = true;
        ended++;
      }
    } },
    { env: { NODE_ENV: 'production', DATABASE_URL: 'postgresql://mock:mock@127.0.0.1:9/mock' } },
    'SELECT 1',
    { log() {}, error(...args: unknown[]) { errors.push(args); } },
    (callback: () => void) => {
      assert.equal(ended, pools.length, 'failed pools must close before retry backoff');
      queueMicrotask(callback);
    },
  );
  return { exports, statements, errors, pools, get ended() { return ended; } };
}

test('production startup resolves actual dynamic schema imports without a database', async () => {
  const fixture = startupFixture();
  await fixture.exports.ensureSessionTable();
  assert.deepEqual(fixture.errors, []);
  assert.equal(fixture.ended, 1);
  assert.ok(fixture.statements.some(sql => sql.includes('private_appointment_transfer_receipts')));
});

test('startup releases failed pools before retrying and succeeds after recovery', async () => {
  const fixture = startupFixture(2);
  await fixture.exports.ensureSessionTable();
  assert.equal(fixture.ended, 3);
  assert.equal(fixture.pools.length, 3);
  assert.equal(fixture.errors.length, 2);
});

test('idle PostgreSQL shutdown errors do not crash startup or disclose client details', async () => {
  const fixture = startupFixture(0, true);
  await fixture.exports.ensureSessionTable();
  assert.equal(fixture.ended, 1);
  const logs = JSON.stringify(fixture.errors);
  assert.match(logs, /57P01/);
  assert.doesNotMatch(logs, /NEVER_LOG_THIS|password/);
});

test('permanent database failure closes all pools and still refuses production startup', async () => {
  const fixture = startupFixture(5);
  await assert.rejects(fixture.exports.ensureSessionTable(), /FATAL.*session schema.*ECONNRESET/);
  assert.equal(fixture.ended, 5);
  assert.equal(fixture.pools.length, 5);
});

test('availability check also releases its failed connection without claiming JSON fallback', async () => {
  const fixture = startupFixture(1);
  assert.equal(await fixture.exports.check(), false);
  assert.equal(fixture.ended, 1);
  assert.doesNotMatch(JSON.stringify(fixture.errors), /JSON storage only/);
});

test('persistent session pool shares the idle-error guard', () => {
  const source = readFileSync('server/storage.ts', 'utf8');
  assert.match(source, /watchDatabasePool\(pgPool, 'persistent sessions'\)/);
  const fixture = startupFixture();
  const pool = new EventEmitter();
  fixture.exports.watch(pool, 'persistent sessions');
  assert.doesNotThrow(() => pool.emit('error', { code: '57P01' }));
  assert.match(JSON.stringify(fixture.errors), /persistent sessions.*57P01/);
});
