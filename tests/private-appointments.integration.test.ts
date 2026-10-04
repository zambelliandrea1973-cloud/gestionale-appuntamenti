import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import router from '../server/routes/privateAppointmentRoutes';

test('the retired protected archive cannot expose or modify data through its former endpoints', async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).isAuthenticated = () => req.get('X-Test-Authenticated') === 'yes';
    (req as any).user = { id: 1, type: 'staff', role: 'staff' };
    next();
  });
  app.use(router);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}/api/private-appointments`;
  try {
    assert.equal((await fetch(`${origin}/profiles`)).status, 401);
    for (const path of ['/profiles', '/unlock', '/access', '/events', '/events/anything', '/google', '/voice/interpret']) {
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        const response = await fetch(origin + path, { method, headers: { 'X-Test-Authenticated': 'yes' } });
        assert.equal(response.status, 410);
        assert.deepEqual(Object.keys(await response.json()), ['message']);
      }
    }
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});