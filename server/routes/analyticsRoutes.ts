// @ts-nocheck
import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, count, isNotNull, gte, lte, and, sql } from 'drizzle-orm';
import { getMilestones, recordMilestone, checkAndRecordProfessionalActivated, type MilestoneName } from '../utils/funnelMilestones';

const router = Router();

const VALID_MILESTONES: MilestoneName[] = [
  'first_service_created',
  'first_customer_created',
  'first_appointment_created',
  'subscription_purchased',
  'professional_activated',
];

/**
 * GET /api/analytics/milestones
 * Returns current user's funnel milestone timestamps.
 */
router.get('/api/analytics/milestones', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const user = req.user as any;
  try {
    const row = await getMilestones(user.id);
    res.json(row ?? {});
  } catch (err) {
    console.error('[FUNNEL ROUTE] getMilestones error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/analytics/milestone
 * Body: { milestone: MilestoneName }
 * Records a milestone idempotently. Returns { isNew: boolean }.
 * Used by the client FunnelTracker to fire gtag events exactly once.
 */
router.post('/api/analytics/milestone', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const user = req.user as any;
  const { milestone } = req.body;
  if (!milestone || !VALID_MILESTONES.includes(milestone)) {
    return res.status(400).json({ error: 'Invalid milestone name' });
  }
  try {
    const isNew = await recordMilestone(user.id, milestone as MilestoneName);
    if (isNew) {
      await checkAndRecordProfessionalActivated(user.id);
    }
    res.json({ isNew });
  } catch (err) {
    console.error('[FUNNEL ROUTE] recordMilestone error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/funnel
 * Admin-only: returns funnel report aggregated counts.
 * Query params: from (ISO date), to (ISO date)
 */
router.get('/api/analytics/funnel', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const user = req.user as any;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  try {
    const fromDate = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = req.query.to ? new Date(req.query.to as string) : new Date();

    const whereClause = and(
      sql`${users.type} = 'staff'`,
      gte(users.createdAt, fromDate),
      lte(users.createdAt, toDate)
    );

    const [row] = await db
      .select({
        totalRegistrations: count(),
        withFirstService: sql<number>`COUNT(${users.milestoneFirstServiceAt})`,
        withFirstClient: sql<number>`COUNT(${users.milestoneFirstClientAt})`,
        withFirstAppointment: sql<number>`COUNT(${users.milestoneFirstAppointmentAt})`,
        withSubscription: sql<number>`COUNT(${users.milestoneSubscriptionAt})`,
        professionalActivated: sql<number>`COUNT(${users.milestoneProfessionalActivatedAt})`,
      })
      .from(users)
      .where(whereClause);

    res.json(row ?? {});
  } catch (err) {
    console.error('[FUNNEL ROUTE] funnel report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
