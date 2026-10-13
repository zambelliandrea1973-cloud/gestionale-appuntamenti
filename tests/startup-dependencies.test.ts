import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

test('production startup resolves its actual dynamic schema imports without a database', async () => {
  const filename = path.resolve('server/storage.ts');
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ensureSessionTable');
  assert.ok(declaration);
  const code = ts.transpileModule(declaration.getText(source), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const actualRequire = createRequire(filename);
  const statements: string[] = [];
  const errors: unknown[] = [];
  let ended = 0;
  const exports: any = {};
  new Function('exports', 'require', 'pg', 'process', 'aiTrialSchemaSql', 'console', 'setTimeout', code)(
    exports,
    (name: string) => name === './services/privateAppointmentAccess'
      ? { ensurePrivateAppointmentTables: async () => {} }
      : actualRequire(name),
    { Pool: class {
      async query(sql: string) { statements.push(sql); }
      async end() { ended++; }
    } },
    { env: { NODE_ENV: 'production', DATABASE_URL: 'postgresql://mock:mock@127.0.0.1:9/mock' } },
    'SELECT 1',
    { log() {}, error(...args: unknown[]) { errors.push(args); } },
    (callback: () => void) => { queueMicrotask(callback); },
  );
  await exports.ensureSessionTable();
  assert.deepEqual(errors, []);
  assert.equal(ended, 1);
  assert.ok(statements.some(sql => sql.includes('private_appointment_transfer_receipts')));
});
