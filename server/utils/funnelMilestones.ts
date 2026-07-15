// @ts-nocheck
import { db } from '../db';
import { users, services, clients, appointments } from '../../shared/schema';
import { eq, isNull, and, count } from 'drizzle-orm';

export type MilestoneName =
  | 'first_service_created'
  | 'first_customer_created'
  | 'first_appointment_created'
  | 'subscription_purchased'
  | 'professional_activated';

const COLUMN_MAP: Record<MilestoneName, keyof typeof users.$inferSelect> = {
  first_service_created: 'milestoneFirstServiceAt',
  first_customer_created: 'milestoneFirstClientAt',
  first_appointment_created: 'milestoneFirstAppointmentAt',
  subscription_purchased: 'milestoneSubscriptionAt',
  professional_activated: 'milestoneProfessionalActivatedAt',
};

/**
 * Records a funnel milestone for the user, idempotent — only sets it once.
 * Returns true if this is the FIRST time the milestone is reached.
 */
export async function recordMilestone(userId: number, milestone: MilestoneName): Promise<boolean> {
  try {
    const col = COLUMN_MAP[milestone];
    const result = await (db as any)
      .update(users)
      .set({ [col]: new Date() })
      .where(and(eq(users.id, userId), isNull(users[col as keyof typeof users] as any)))
      .returning({ id: users.id });
    const isNew = Array.isArray(result) ? result.length > 0 : false;
    if (isNew) {
      console.log(`[FUNNEL] ✅ Milestone "${milestone}" reached for user ${userId}`);
    }
    return isNew;
  } catch (err) {
    console.error(`[FUNNEL] Failed to record milestone "${milestone}" for user ${userId}:`, err);
    return false;
  }
}

/**
 * Checks if a user satisfies all professional_activated conditions,
 * and records the milestone if so. Returns true if milestone is newly set.
 */
export async function checkAndRecordProfessionalActivated(userId: number): Promise<boolean> {
  try {
    const [user] = await db
      .select({ milestoneProfessionalActivatedAt: users.milestoneProfessionalActivatedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || user.milestoneProfessionalActivatedAt) return false;

    const [{ svc }] = await db
      .select({ svc: count() })
      .from(services)
      .where(eq(services.userId, userId));
    const [{ cli }] = await db
      .select({ cli: count() })
      .from(clients)
      .where(eq(clients.ownerId, userId));
    const [{ appt }] = await db
      .select({ appt: count() })
      .from(appointments)
      .where(eq(appointments.userId, userId));

    if (Number(svc) > 0 && Number(cli) > 0 && Number(appt) > 0) {
      return recordMilestone(userId, 'professional_activated');
    }
    return false;
  } catch (err) {
    console.error(`[FUNNEL] Failed to check professional_activated for user ${userId}:`, err);
    return false;
  }
}

/**
 * Returns the milestone status for a user (timestamps or null).
 */
export async function getMilestones(userId: number) {
  const [row] = await db
    .select({
      firstService: users.milestoneFirstServiceAt,
      firstClient: users.milestoneFirstClientAt,
      firstAppointment: users.milestoneFirstAppointmentAt,
      subscription: users.milestoneSubscriptionAt,
      professionalActivated: users.milestoneProfessionalActivatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}
