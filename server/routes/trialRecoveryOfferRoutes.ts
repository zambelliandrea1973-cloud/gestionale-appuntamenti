import { Router } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { licenses, subscriptionPlans } from '../../shared/schema';
import {
  discountedAnnualPrice,
  RECOVERY_DISCOUNT_PERCENT,
  validateRecoveryOffer,
} from '../services/trialRecoveryOfferService';
import { getPublicBaseUrl } from '../utils/publicBaseUrl';

const router = Router();
const pixel = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');

router.get('/open/:token.gif', async (req, res) => {
  const token = req.params.token;
  const offer = await validateRecoveryOffer(token);
  if (offer) {
    await db.update(licenses).set({ recoveryOfferOpenedAt: new Date() })
      .where(and(eq(licenses.id, offer.licenseId), isNull(licenses.recoveryOfferOpenedAt)));
  }
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' }).send(pixel);
});

router.get('/click/:token', async (req, res) => {
  const token = req.params.token;
  const offer = await validateRecoveryOffer(token);
  if (!offer) return res.redirect(`${getPublicBaseUrl()}/subscribe?offer=expired`);
  await db.update(licenses).set({ recoveryOfferClickedAt: new Date() })
    .where(and(eq(licenses.id, offer.licenseId), isNull(licenses.recoveryOfferClickedAt)));
  return res.redirect(`${getPublicBaseUrl()}/subscribe?offer=${encodeURIComponent(token)}`);
});

router.get('/validate', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) return res.status(401).json({ success: false });
  const token = String(req.query.offer || '');
  const offer = await validateRecoveryOffer(token, (req.user as any).id);
  if (!offer) return res.status(404).json({ success: false, message: 'Offerta non valida o scaduta' });
  const plans = await db.select().from(subscriptionPlans)
    .where(and(eq(subscriptionPlans.interval, 'year'), eq(subscriptionPlans.isActive, true)));
  return res.json({
    success: true,
    discountPercent: RECOVERY_DISCOUNT_PERCENT,
    expiresAt: offer.expiresAt,
    plans: plans.map(plan => ({
      id: plan.id,
      originalPrice: plan.price,
      discountedPrice: discountedAnnualPrice(plan.price),
    })),
  });
});

export default router;