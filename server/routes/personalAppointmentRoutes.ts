import { Router } from 'express';
import type {} from 'passport';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { personalAppointments } from '../../shared/schema';
import { personalAppointmentSchema } from '../../shared/personalAppointments';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.use('/api/personal-appointments', requireAuth, (req, res, next) => {
  const user = req.user as any;
  if (!['admin', 'staff'].includes(user.type)) return res.status(403).json({ message: 'Professional account required' });
  next();
});
const owner = (req: any) => Number(req.user.id);
const validId = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const serialize = (record: any) => ({ ...record, startTime: record.startTime.slice(0, 5), endTime: record.endTime.slice(0, 5) });

router.get('/api/personal-appointments', async (req, res) => {
  try {
    const records = await db.select().from(personalAppointments).where(eq(personalAppointments.userId, owner(req)));
    res.json(records.map(serialize));
  } catch (error) {
    console.error('[PERSONAL APPOINTMENTS] Read failed', error);
    res.status(500).json({ message: 'Unable to load personal appointments' });
  }
});
router.get('/api/personal-appointments/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid appointment ID' });
  try {
    const [record] = await db.select().from(personalAppointments).where(and(eq(personalAppointments.id, Number(req.params.id)), eq(personalAppointments.userId, owner(req))));
    if (!record) return res.status(404).json({ message: 'Appointment not found' });
    res.json(serialize(record));
  } catch (error) {
    console.error('[PERSONAL APPOINTMENTS] Read failed', error);
    res.status(500).json({ message: 'Unable to load appointment' });
  }
});
router.post('/api/personal-appointments', async (req, res) => {
  const parsed = personalAppointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid personal appointment', errors: parsed.error.flatten() });
  try {
    const [record] = await db.insert(personalAppointments).values({ ...parsed.data, userId: owner(req) }).returning();
    res.status(201).json(serialize(record));
  } catch (error) {
    console.error('[PERSONAL APPOINTMENTS] Create failed', error);
    res.status(500).json({ message: 'Unable to save appointment' });
  }
});
router.put('/api/personal-appointments/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid appointment ID' });
  const parsed = personalAppointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid personal appointment', errors: parsed.error.flatten() });
  try {
    const [record] = await db.update(personalAppointments).set(parsed.data).where(and(eq(personalAppointments.id, Number(req.params.id)), eq(personalAppointments.userId, owner(req)))).returning();
    if (!record) return res.status(404).json({ message: 'Appointment not found' });
    res.json(serialize(record));
  } catch (error) {
    console.error('[PERSONAL APPOINTMENTS] Update failed', error);
    res.status(500).json({ message: 'Unable to save appointment' });
  }
});
async function remove(req: any, res: any, id: number) {
  try {
    const records = await db.delete(personalAppointments).where(and(eq(personalAppointments.id, id), eq(personalAppointments.userId, owner(req)))).returning({ id: personalAppointments.id });
    if (!records.length) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('[PERSONAL APPOINTMENTS] Delete failed', error);
    res.status(500).json({ message: 'Unable to delete appointment' });
  }
}
router.delete('/api/personal-appointments/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid appointment ID' });
  await remove(req, res, Number(req.params.id));
});
// Existing calendar delete controls use this URL. Never enter Google/work logic
// for a personal record; keep strict owner isolation on the independent table.
router.delete('/api/appointments/:id', (req, res, next) => {
  if (!/^-[1-9]\d*$/.test(req.params.id)) return next();
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Not authenticated' });
  const id = -Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ message: 'Invalid appointment ID' });
  return remove(req, res, id);
});
export default router;