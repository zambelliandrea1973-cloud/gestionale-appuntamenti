import { Router } from 'express';
import type {} from 'passport';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { licenses, personalAppointments } from '../../shared/schema';
import { personalAppointmentSchema } from '../../shared/personalAppointments';
import { requireAuth } from '../middleware/authMiddleware';
import { getPrivateProfile, PrivateError, type PrivateProfile } from '../services/privateAppointmentAccess';
import { queuePersonalGoogle, tryPersonalGoogleSync } from '../services/personalAppointmentGoogle';
import { assertPersonalOutsideWork } from '../services/personalAppointmentConflicts';
import personalSpaceRoutes, { personalRoute } from './personalSpaceRoutes';

const router = Router();
const professionalAccount = async (req: any, res: any, next: any) => {
  const user = req.user as any;
  try {
    const professional = ['admin', 'staff'].includes(user.type) ||
      (user.role === 'user' && (await db.select({ id: licenses.id }).from(licenses)
        .where(eq(licenses.userId, Number(user.id))).limit(1)).length > 0);
    if (!professional) return res.status(403).json({ message: 'Professional account required' });
    next();
  } catch { res.status(503).json({ message: 'Unable to verify professional account' }); }
};
router.use('/api/personal-appointments', requireAuth, professionalAccount, (_req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  res.set('Vary', 'Cookie, X-Private-Access');
  next();
});
router.use('/api/personal-appointments/space', personalSpaceRoutes);
// Archive transfer is intentionally paused: its old destination was a shared,
// public account-level calendar. Do not silently export historical protected data.
router.use('/api/personal-appointments/archive-transfer', (_req, res) => {
  res.status(409).json({ message: 'Archivio conservato. Il trasferimento va riconfermato verso lo spazio personale protetto.' });
});
const scope = (p: PrivateProfile) => and(eq(personalAppointments.userId, p.user_id),
  p.identity_id === 0 ? or(eq(personalAppointments.profileId, p.id), isNull(personalAppointments.profileId)) : eq(personalAppointments.profileId, p.id));
const validId = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const serialize = (record: any, profile: PrivateProfile) => ({
  ...record, startTime: record.startTime.slice(0, 5), endTime: record.endTime.slice(0, 5),
  staffId: profile.identity_id || null,
});
router.get('/api/personal-appointments/busy', personalRoute(async (req, res) => {
  // No private password is needed to block availability, but no private details
  // or Google identities are included in this shared feed.
  const rows = await db.execute(sql`SELECT p.id,p.date,to_char(p.start_time,'HH24:MI') AS "startTime",
    to_char(p.end_time,'HH24:MI') AS "endTime",NULLIF(COALESCE(pr.identity_id,0),0) AS "staffId"
    FROM personal_appointments p LEFT JOIN private_appointment_profiles pr
    ON pr.id=p.profile_id AND pr.user_id=p.user_id WHERE p.user_id=${Number((req.user as any).id)}`);
  res.json(rows.map(row => ({ ...row, title: 'Occupato', location: '', notes: '', isPersonalBusy: true })));
}));
router.get('/api/personal-appointments', personalRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const records = await db.select().from(personalAppointments).where(scope(profile));
  res.json(records.map(record => serialize(record, profile)));
}));
router.get('/api/personal-appointments/:id', personalRoute(async (req, res) => {
  if (!validId(req.params.id)) throw new PrivateError(400, 'Identificativo non valido.');
  const profile = await getPrivateProfile(req);
  const [record] = await db.select().from(personalAppointments)
    .where(and(eq(personalAppointments.id, Number(req.params.id)), scope(profile)));
  if (!record) throw new PrivateError(404, 'Impegno non trovato.');
  res.json(serialize(record, profile));
}));
router.post('/api/personal-appointments', personalRoute(async (req, res) => {
  const value = personalAppointmentSchema.parse(req.body);
  const profile = await getPrivateProfile(req);
  const record = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(705196,${profile.user_id}::integer)`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(705193,${profile.id}::integer)`);
    await assertPersonalOutsideWork(profile, value, undefined, tx);
    const [saved] = await tx.insert(personalAppointments).values({ ...value, userId: profile.user_id, profileId: profile.id }).returning();
    await queuePersonalGoogle(tx, profile, saved.id, value);
    return saved;
  });
  res.status(201).json({ ...serialize(record, profile), sync: await tryPersonalGoogleSync(profile) });
}));
router.put('/api/personal-appointments/:id', personalRoute(async (req, res) => {
  if (!validId(req.params.id)) throw new PrivateError(400, 'Identificativo non valido.');
  const value = personalAppointmentSchema.parse(req.body);
  const profile = await getPrivateProfile(req);
  const record = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(705196,${profile.user_id}::integer)`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(705193,${profile.id}::integer)`);
    await assertPersonalOutsideWork(profile, value, Number(req.params.id), tx);
    const [saved] = await tx.update(personalAppointments).set({ ...value, profileId: profile.id })
      .where(and(eq(personalAppointments.id, Number(req.params.id)), scope(profile))).returning();
    if (!saved) throw new PrivateError(404, 'Impegno non trovato.');
    await queuePersonalGoogle(tx, profile, saved.id, value);
    return saved;
  });
  res.json({ ...serialize(record, profile), sync: await tryPersonalGoogleSync(profile) });
}));
async function remove(req: any, res: any, id: number) {
  const profile = await getPrivateProfile(req);
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(705193,${profile.id}::integer)`);
    const records = await tx.delete(personalAppointments).where(and(eq(personalAppointments.id, id), scope(profile))).returning({ id: personalAppointments.id });
    if (!records.length) throw new PrivateError(404, 'Impegno non trovato.');
    // Erase local content but preserve the tombstone even after a lost Google ACK.
    await queuePersonalGoogle(tx, profile, id, null);
  });
  res.json({ success: true, sync: await tryPersonalGoogleSync(profile) });
}
router.delete('/api/personal-appointments/:id', personalRoute(async (req, res) => {
  if (!validId(req.params.id)) throw new PrivateError(400, 'Identificativo non valido.');
  await remove(req, res, Number(req.params.id));
}));
router.delete('/api/appointments/:id', (req, res, next) => {
  if (!/^-[1-9]\d*$/.test(req.params.id)) return next();
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Not authenticated' });
  const id = -Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ message: 'Invalid appointment ID' });
  res.set('Cache-Control', 'private, no-store');
  return professionalAccount(req, res, () => personalRoute(async (request, response) => remove(request, response, id))(req, res));
});
export default router;