import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PgDialect } from 'drizzle-orm/pg-core';
import { randomBytes } from 'node:crypto';
import { recoveryService } from '../server/services/personalPasswordRecovery';
import { hashPrivatePassword, verifyPrivatePassword } from '../server/services/privateAppointmentAccess';
import { personalRecoverySchemaSql } from '../shared/personalRecovery';
import { closeDatabase } from '../server/db';

test('verified personal recovery is single-use, isolated, rate-limited and preserves data', async () => {
  // Dedicated schema, synthetic records only. Never touches existing application tables.
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const schema = `recovery_test_${randomBytes(8).toString('hex')}`;
  const dialect = new PgDialect();
  const scope = async (fn: (client: pg.PoolClient) => Promise<any>) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  };
  const adapter = (client: pg.PoolClient) => ({ execute: async (query: any) => {
    const { sql, params } = dialect.sqlToQuery(query);
    return (await client.query(sql, params)).rows;
  } });
  const database = {
    execute: (query: any) => scope(client => adapter(client).execute(query)),
    transaction: (fn: any) => scope(client => fn(adapter(client))),
  };
  let deliveryFails = false;
  const mail: { email: string; code: string }[] = [];
  const service = recoveryService(database, async (email, _subject, _html, text) => {
    if (deliveryFails) return { success: false, senderEmail: '' };
    mail.push({ email, code: text!.match(/\b\d{8}\b/)![0] });
    return { success: true, senderEmail: 'fixture@example.invalid' };
  });
  const query = (text: string, params: any[] = []) => scope(c => c.query(text, params));
  const cooldown = () => query("UPDATE personal_password_recovery SET next_send_at=now()-interval '1 minute'");
  const confirm = (purpose: 'verify' | 'reset', code = mail.at(-1)!.code, session = 'session', actor = 1, profile = 10) =>
    service.confirm(actor, profile, session, purpose, code, purpose === 'reset' ? '1234' : undefined);
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    await query(`CREATE TABLE private_appointment_profiles(id integer PRIMARY KEY, user_id integer, password_hash text);
      CREATE TABLE private_appointment_access(profile_id integer, user_id integer, token text);
      CREATE TABLE personal_appointments(profile_id integer, title text);`);
    await query(personalRecoverySchemaSql);
    const originalHash = await hashPrivatePassword('abcd');
    await query('INSERT INTO private_appointment_profiles VALUES (10,1,$1),(20,2,$1)', [originalHash]);
    await query("INSERT INTO private_appointment_access VALUES (10,1,'old'),(20,2,'other'); INSERT INTO personal_appointments VALUES(10,'Fixture unchanged')");
    await service.issue(1, 10, 'session', 'verify', 'owner@example.invalid');
    assert.equal((await service.status(1, 10)).email, null);
    assert.equal((await service.status(2, 10)).email, null);
    assert.ok(!(await query('SELECT code_hash FROM personal_password_recovery')).rows[0].code_hash.includes(mail[0].code));
    await assert.rejects(service.issue(1, 10, 'session', 'verify', 'owner@example.invalid'), /Attendi/);
    await assert.rejects(confirm('reset'), /Codice/);
    await assert.rejects(confirm('verify', undefined, 'other-session'), /Codice/);
    await assert.rejects(confirm('verify', undefined, 'session', 2), /Codice/);
    await confirm('verify');
    assert.equal((await service.status(1, 10)).email, 'owner@example.invalid');
    await assert.rejects(confirm('verify'), /Codice/);

    await cooldown();
    const beforeWrong = mail.length;
    await service.issue(1, 10, 'session', 'reset', 'wrong@example.invalid');
    assert.equal(mail.length, beforeWrong);
    await service.issue(1, 10, 'session', 'reset', 'owner@example.invalid');
    const code = mail.at(-1)!.code;
    const wrong = code === '00000000' ? '11111111' : '00000000';
    for (let i = 0; i < 5; i++) await assert.rejects(confirm('reset', wrong), /Codice/);
    assert.equal((await query('SELECT attempts FROM personal_password_recovery')).rows[0].attempts, 5);
    await assert.rejects(confirm('reset', code), /Codice/);
    assert.equal((await query('SELECT password_hash FROM private_appointment_profiles WHERE id=10')).rows[0].password_hash, originalHash);

    await cooldown();
    await service.issue(1, 10, 'session', 'reset', 'owner@example.invalid');
    await query("UPDATE personal_password_recovery SET expires_at=now()-interval '1 second'");
    await assert.rejects(confirm('reset'), /Codice/);
    await cooldown();
    await service.issue(1, 10, 'session', 'reset', 'owner@example.invalid');
    const outcomes = await Promise.allSettled([confirm('reset'), confirm('reset')]);
    assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
    const stored = (await query('SELECT password_hash FROM private_appointment_profiles WHERE id=10')).rows[0].password_hash;
    assert.ok(await verifyPrivatePassword('1234', stored));
    assert.ok(!await verifyPrivatePassword('abcd', stored));
    assert.deepEqual((await query('SELECT profile_id FROM private_appointment_access')).rows, [{ profile_id: 20 }]);
    assert.equal((await query('SELECT title FROM personal_appointments')).rows[0].title, 'Fixture unchanged');

    // Changing recovery email does not replace the old address before verification.
    await cooldown();
    await service.issue(1, 10, 'session', 'verify', 'new@example.invalid');
    assert.equal((await service.status(1, 10)).email, 'owner@example.invalid');
    await confirm('verify');
    assert.equal((await service.status(1, 10)).email, 'new@example.invalid');
    await cooldown();
    deliveryFails = true;
    await assert.rejects(service.issue(1, 10, 'session', 'reset', 'new@example.invalid'), /Invio email/);
    assert.equal((await query('SELECT code_hash FROM personal_password_recovery')).rows[0].code_hash, null);
    assert.equal((await query('SELECT password_hash FROM private_appointment_profiles WHERE id=10')).rows[0].password_hash, stored);
  } finally {
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
    await closeDatabase();
  }
});
