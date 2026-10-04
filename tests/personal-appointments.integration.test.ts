import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { sql } from 'drizzle-orm';
import { db, closeDatabase } from '../server/db';
import router from '../server/routes/personalAppointmentRoutes';
import { personalAppointmentsSchemaSql } from '../shared/personalAppointments';

test('selected local appointments persist CRUD without client/service, isolate accounts and enforce roles', async () => {
  const studio = -1_000_000_000 - (Date.now() % 100_000_000);
  const other = studio - 1;
  const suffix = randomUUID();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const role = req.get('X-Test-Role') || 'staff';
    (req as any).isAuthenticated = () => role !== 'anonymous';
    (req as any).user = { id: Number(req.get('X-Test-Actor') || studio), role,
      type: ['user', 'client', 'anonymous'].includes(role) ? 'customer' : role };
    next();
  });
  app.use(router);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const api = async (path: string, method = 'GET', body?: unknown, actor = studio, role = 'staff') => {
    const response = await fetch(origin + path, { method,
      headers: { 'Content-Type': 'application/json', 'X-Test-Actor': String(actor), 'X-Test-Role': role },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  const prefix = '/api/personal-appointments';
  const draft = { title: 'Fixture private commitment', date: '2099-10-04',
    startTime: '10:15', endTime: '10:45', location: 'Fixture location', notes: 'Fixture notes' };
  try {
    await db.execute(sql.raw(personalAppointmentsSchemaSql));
    for (const id of [studio, other]) {
      await db.execute(sql`INSERT INTO users(id,username,password,email,role,type)
        VALUES(${id},${`local-fixture-${suffix}-${id}`},'disabled-fixture-login',
        ${`local-fixture-${suffix}-${id}@example.invalid`},'staff','staff')`);
    }
    assert.equal((await api(prefix, 'GET', undefined, studio, 'anonymous')).status, 401);
    assert.equal((await api(prefix, 'POST', draft, studio, 'client')).status, 403);
    assert.equal((await api(prefix, 'GET', undefined, studio, 'user')).status, 403,
      'an ordinary customer/user without their own license is not a professional');
    await db.execute(sql`INSERT INTO licenses(code,type,user_id,is_active,expires_at)
      VALUES(${`LOCAL-FIXTURE-${suffix}`},'trial',${studio},false,'2000-01-01')`);
    const created = await api(prefix, 'POST', { ...draft, userId: other, clientId: 123, serviceId: 456 }, studio, 'user');
    assert.equal(created.status, 201, 'licensed legacy customer/user owners can access their local archive');
    const id = created.data.id;
    assert.ok(id > 0);
    assert.equal(created.data.startTime, '10:15');
    assert.equal(created.data.location, draft.location);
    assert.equal(created.data.clientId, undefined);
    assert.equal(created.data.serviceId, undefined);
    assert.equal(created.data.userId, studio, 'payload cannot override the authenticated account');
    const loaded = await api(`${prefix}/${id}`);
    assert.equal(loaded.status, 200);
    assert.equal(loaded.data.title, draft.title);
    assert.ok((await api(prefix)).data.some((row: any) => row.id === id));
    assert.ok(!(await api(prefix, 'GET', undefined, other)).data.some((row: any) => row.id === id));
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const foreign = await api(`${prefix}/${id}`, method, method === 'PUT' ? draft : undefined, other);
      assert.equal(foreign.status, 404);
      assert.equal(foreign.data.title, undefined);
    }
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
      assert.equal((await api(method === 'POST' ? prefix : `${prefix}/${id}`, method,
        ['POST', 'PUT'].includes(method) ? draft : undefined, studio, 'client')).status, 403);
    }
    assert.equal((await api(`/api/appointments/${-id}`, 'DELETE', undefined, studio, 'client')).status, 403);
    assert.equal((await api(`/api/appointments/${-id}`, 'DELETE', undefined, other)).status, 404);
    const edited = await api(`${prefix}/${id}`, 'PUT', { ...draft, title: 'Edited fixture', startTime: '11:00', endTime: '11:30' });
    assert.equal(edited.status, 200);
    assert.equal((await api(`${prefix}/${id}`)).data.title, 'Edited fixture');
    assert.equal((await api(prefix, 'POST', { ...draft, title: '' })).status, 400);
    assert.equal((await api(prefix, 'POST', { ...draft, endTime: '09:00' })).status, 400);
    assert.equal((await api(`${prefix}/${id}`, 'DELETE')).status, 200);
    assert.equal((await api(`${prefix}/${id}`)).status, 404);
    const another = await api(prefix, 'POST', draft);
    assert.equal((await api(`/api/appointments/${-another.data.id}`, 'DELETE')).status, 200);
    assert.equal((await api(`${prefix}/${another.data.id}`)).status, 404);
  } finally {
    await db.execute(sql`DELETE FROM personal_appointments WHERE user_id IN (${studio},${other})`);
    await db.execute(sql`DELETE FROM licenses WHERE code=${`LOCAL-FIXTURE-${suffix}`}`);
    await db.execute(sql`DELETE FROM users WHERE id IN (${studio},${other})`);
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await closeDatabase();
  }
});