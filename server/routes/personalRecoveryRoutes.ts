import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getPrivateProfile, privateIdentities, privateUser, PrivateError } from '../services/privateAppointmentAccess';
import { recoveryService } from '../services/personalPasswordRecovery';

const router = Router();
const service = recoveryService();
const limit = rateLimit({ windowMs: 15 * 60_000, limit: 15,
  keyGenerator: req => String((req.user as any)?.id || 'unauthenticated'),
  message: { message: 'Troppi tentativi. Riprova tra 15 minuti.' } });
const emailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const codeSchema = z.string().regex(/^\d{8}$/, 'Inserisci il codice di 8 cifre ricevuto via email.');
const wrap = (fn: any) => async (req: any, res: any) => {
  try { privateUser(req); await fn(req, res); }
  catch (error: any) {
    res.status(error instanceof PrivateError ? error.status : error instanceof z.ZodError ? 400 : 503)
      .json({ message: error instanceof PrivateError ? error.message : error instanceof z.ZodError ? error.issues[0].message : 'Operazione non disponibile. Nessun impegno è stato eliminato.' });
  }
};
router.get('/', wrap(async (req: any, res: any) => {
  const profile = await getPrivateProfile(req);
  res.json(await service.status(profile.user_id, profile.id));
}));
router.post('/email', limit, wrap(async (req: any, res: any) => {
  const body = z.object({ email: emailSchema }).strict().parse(req.body);
  const profile = await getPrivateProfile(req);
  if (!profile.password_hash) throw new PrivateError(409, 'Configura prima la password personale.');
  await service.issue(profile.user_id, profile.id, req.sessionID, 'verify', body.email);
  res.json({ success: true });
}));
router.post('/verify', limit, wrap(async (req: any, res: any) => {
  const { code } = z.object({ code: codeSchema }).strict().parse(req.body);
  const profile = await getPrivateProfile(req);
  res.json(await service.confirm(profile.user_id, profile.id, req.sessionID, 'verify', code));
}));
router.post('/request', limit, wrap(async (req: any, res: any) => {
  const body = z.object({ profileId: z.number().int().positive(), email: emailSchema }).strict().parse(req.body);
  const userId = privateUser(req);
  const choices = await privateIdentities(userId);
  if (choices.identities.some(p => p.profileId === body.profileId))
    await service.issue(userId, body.profileId, req.sessionID, 'reset', body.email);
  res.json({ message: 'Se l’email corrisponde a quella già verificata per questo profilo, riceverai un codice. Controlla anche la posta indesiderata.' });
}));
router.post('/reset', limit, wrap(async (req: any, res: any) => {
  const body = z.object({ profileId: z.number().int().positive(), code: codeSchema,
    password: z.string().min(4, 'Usa almeno 4 caratteri.').max(128) }).strict().parse(req.body);
  const userId = privateUser(req);
  const choices = await privateIdentities(userId);
  if (!choices.identities.some(p => p.profileId === body.profileId)) throw new PrivateError(400, 'Codice non valido o scaduto.');
  res.json(await service.confirm(userId, body.profileId, req.sessionID, 'reset', body.code, body.password));
}));
export default router;
