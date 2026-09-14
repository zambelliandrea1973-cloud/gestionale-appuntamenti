import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { and, eq } from 'drizzle-orm';
import { closeDatabase, db } from '../server/db';
import { appointments, clients, services } from '../shared/schema';
import { cleanupDemoDataIfNeeded } from '../server/services/onboardingDemoService';
import {
  hasDemoAppointmentResource,
  isDemoAppointment,
} from '../server/services/demoAppointmentGuard';
import { isLegacyDemoGoogleEvent } from '../server/services/legacyDemoGoogleCleanup';

const TEST_USERS = [2_000_000_101, 2_000_000_102];

async function clearTestUser(userId: number) {
  await db.delete(appointments).where(eq(appointments.userId, userId));
  await db.delete(clients).where(eq(clients.ownerId, userId));
  await db.delete(services).where(eq(services.userId, userId));
}

async function seedDemoRows(userId: number) {
  await clearTestUser(userId);
  const demoClients = await db.insert(clients).values([
    { userId, ownerId: userId, firstName: 'Demo', lastName: 'One', phone: '1', isDemo: true },
    { userId, ownerId: userId, firstName: 'Demo', lastName: 'Two', phone: '2', isDemo: true },
  ]).returning({ id: clients.id });
  const demoServices = await db.insert(services).values([
    { userId, name: 'Demo one', duration: 30, isDemo: true },
    { userId, name: 'Demo two', duration: 30, isDemo: true },
  ]).returning({ id: services.id });
  const [demoAppointment] = await db.insert(appointments).values({
    userId,
    clientId: demoClients[0].id,
    serviceId: demoServices[0].id,
    date: '2026-09-13',
    startTime: '09:00',
    endTime: '09:30',
  }).returning();
  return { demoClients, demoServices, demoAppointment };
}

after(async () => {
  for (const userId of TEST_USERS) await clearTestUser(userId);
  await closeDatabase();
});

test('manual appointment survives while unused demo data is removed', async () => {
  const userId = TEST_USERS[0];
  const seeded = await seedDemoRows(userId);
  const [manualAppointment] = await db.insert(appointments).values({
    userId,
    clientId: seeded.demoClients[1].id,
    serviceId: seeded.demoServices[1].id,
    date: '2026-09-14',
    startTime: '10:00',
    endTime: '10:30',
  }).returning();

  await cleanupDemoDataIfNeeded(userId, 'appointments', {
    preserveAppointmentIds: [manualAppointment.id],
  });

  const remainingAppointments = await db.select().from(appointments)
    .where(eq(appointments.userId, userId));
  const remainingClients = await db.select().from(clients)
    .where(eq(clients.ownerId, userId));
  const remainingServices = await db.select().from(services)
    .where(eq(services.userId, userId));

  assert.deepEqual(remainingAppointments.map((row) => row.id), [manualAppointment.id]);
  assert.deepEqual(remainingClients.map((row) => [row.id, row.isDemo]), [
    [seeded.demoClients[1].id, false],
  ]);
  assert.deepEqual(remainingServices.map((row) => [row.id, row.isDemo]), [
    [seeded.demoServices[1].id, false],
  ]);
});

test('Google appointment survives while all demo data is removed', async () => {
  const userId = TEST_USERS[1];
  await seedDemoRows(userId);
  const [googleClient] = await db.insert(clients).values({
    userId,
    ownerId: userId,
    firstName: 'Google',
    lastName: 'Calendar',
    phone: '',
    isDemo: false,
  }).returning();
  const [googleService] = await db.insert(services).values({
    userId,
    name: 'Google Calendar Reminder',
    duration: 30,
    isDemo: false,
  }).returning();
  const [googleAppointment] = await db.insert(appointments).values({
    userId,
    clientId: googleClient.id,
    serviceId: googleService.id,
    date: '2026-09-15',
    startTime: '11:00',
    endTime: '11:30',
    importedFromGoogle: true,
    googleEventId: 'cleanup-test-event',
  }).returning();

  await cleanupDemoDataIfNeeded(userId, 'appointments');

  const demoClients = await db.select().from(clients)
    .where(and(eq(clients.ownerId, userId), eq(clients.isDemo, true)));
  const demoServices = await db.select().from(services)
    .where(and(eq(services.userId, userId), eq(services.isDemo, true)));
  const remainingAppointments = await db.select().from(appointments)
    .where(eq(appointments.userId, userId));

  assert.equal(demoClients.length, 0);
  assert.equal(demoServices.length, 0);
  assert.deepEqual(remainingAppointments.map((row) => row.id), [googleAppointment.id]);
});

test('Google export guard detects demo clients and services', async () => {
  assert.equal(hasDemoAppointmentResource({ isDemo: true }, { isDemo: false }), true);
  assert.equal(hasDemoAppointmentResource({ isDemo: false }, { isDemo: true }), true);
  assert.equal(hasDemoAppointmentResource({ isDemo: false }, { isDemo: false }), false);

  const userId = TEST_USERS[0];
  const demo = await seedDemoRows(userId);

  assert.equal(await isDemoAppointment(demo.demoAppointment.id, userId), true);

  await db.update(clients).set({ isDemo: false }).where(eq(clients.id, demo.demoClients[0].id));
  await db.update(services).set({ isDemo: false }).where(eq(services.id, demo.demoServices[0].id));

  assert.equal(await isDemoAppointment(demo.demoAppointment.id, userId), false);
});

test('legacy Google cleanup only recognizes signed demo events', () => {
  const demo = {
    summary: 'Paola Romano - Manicure',
    description: 'Client: Paola Romano\nEmail: paola.romano@gmail.com\n\n#gestionale {"id":123}',
    extendedProperties: { private: { source: 'gestionale', appointmentId: '123' } },
  };
  assert.equal(isLegacyDemoGoogleEvent(demo), true);
  assert.equal(isLegacyDemoGoogleEvent({ ...demo, summary: 'Cliente Reale - Manicure' }), false);
  assert.equal(isLegacyDemoGoogleEvent({ ...demo, description: '', extendedProperties: undefined }), false);
});
