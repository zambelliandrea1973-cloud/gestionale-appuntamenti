import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { appointments, clients, services } from '../../shared/schema';

type DemoFlagRecord = { isDemo?: boolean | null } | null | undefined;

export function hasDemoAppointmentResource(
  client: DemoFlagRecord,
  service: DemoFlagRecord,
): boolean {
  return client?.isDemo === true || service?.isDemo === true;
}

export async function isDemoAppointment(
  appointmentId: number,
  userId?: number,
): Promise<boolean> {
  const conditions = [eq(appointments.id, appointmentId)];
  if (userId !== undefined) conditions.push(eq(appointments.userId, userId));

  const [row] = await db.select({
    clientIsDemo: clients.isDemo,
    serviceIsDemo: services.isDemo,
  })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .leftJoin(services, eq(services.id, appointments.serviceId))
    .where(and(...conditions))
    .limit(1);

  return row?.clientIsDemo === true || row?.serviceIsDemo === true;
}