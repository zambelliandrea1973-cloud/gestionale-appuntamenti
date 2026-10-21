import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PgDialect } from 'drizzle-orm/pg-core';
import { randomBytes } from 'node:crypto';
import { recordUserAccess } from '../server/services/userAccessTracking';
import { closeDatabase } from '../server/db';

test('login and account loading count once across concurrent requests and restarts', async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const schema = `access_test_${randomBytes(8).toString('hex')}`;
  const dialect = new PgDialect();
  const database = { transaction: async (fn: any) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      const value = await fn({ execute: async (query: any) => {
        const { sql, params } = dialect.sqlToQuery(query);
        return (await client.query(sql, params)).rows;
      } });
      await client.query('COMMIT');
      return value;
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } };
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(`CREATE TABLE "${schema}".user_logins (
      id serial, user_id integer, login_at timestamp DEFAULT now(), ip_address text, user_agent text)`);
    const results = await Promise.all(Array.from({ length: 8 }, () => recordUserAccess(987654, 'test', 'test', database)));
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await recordUserAccess(987654, '', '', { ...database }), false);
    assert.equal(await recordUserAccess(987655, '', '', database), true);
    await pool.query(`UPDATE "${schema}".user_logins SET login_at=now()-interval '31 minutes' WHERE user_id=987654`);
    assert.equal(await recordUserAccess(987654, '', '', database), true);
    const result = await pool.query(`SELECT count(*)::integer AS count FROM "${schema}".user_logins`);
    assert.equal(result.rows[0].count, 3);
  } finally {
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
    await closeDatabase();
  }
});
