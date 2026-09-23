import crypto from 'crypto';
import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import { db } from '../db';
import { licenses, subscriptions, users } from '../../shared/schema';
import { sendSystemEmail } from './systemEmailService';
import { getPublicBaseUrl } from '../utils/publicBaseUrl';

export const RECOVERY_DISCOUNT_PERCENT = 50;
const OFFER_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
const OFFER_WINDOW_MS = 24 * 60 * 60 * 1000;
const OFFER_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

export function hashRecoveryOfferToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function discountedAnnualPrice(priceInCents: number): number {
  return Math.round(priceInCents * (100 - RECOVERY_DISCOUNT_PERCENT) / 100);
}

export async function validateRecoveryOffer(token: string, userId?: number) {
  if (!token || token.length < 40) return null;
  const [offer] = await db.select({
    licenseId: licenses.id,
    userId: licenses.userId,
    expiresAt: licenses.recoveryOfferExpiresAt,
    usedAt: licenses.recoveryOfferUsedAt,
    trialExpiresAt: licenses.expiresAt,
  }).from(licenses)
    .where(eq(licenses.recoveryOfferTokenHash, hashRecoveryOfferToken(token)))
    .limit(1);

  if (!offer?.userId || !offer.expiresAt || offer.usedAt) return null;
  if (userId !== undefined && offer.userId !== userId) return null;
  if (offer.expiresAt.getTime() <= Date.now()) return null;

  const [activeSubscription] = await db.select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(
      eq(subscriptions.userId, offer.userId),
      eq(subscriptions.status, 'active'),
    ))
    .limit(1);
  if (activeSubscription) return null;
  return offer;
}

export async function markRecoveryOfferUsed(licenseId: number): Promise<void> {
  await db.update(licenses)
    .set({ recoveryOfferUsedAt: new Date() })
    .where(and(eq(licenses.id, licenseId), isNull(licenses.recoveryOfferUsedAt)));
}

function recoveryEmailHtml(username: string, token: string, expiresAt: Date): string {
  const baseUrl = getPublicBaseUrl();
  const encoded = encodeURIComponent(token);
  const clickUrl = `${baseUrl}/api/trial-recovery/click/${encoded}`;
  const openUrl = `${baseUrl}/api/trial-recovery/open/${encoded}.gif`;
  const expiry = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  }).format(expiresAt);

  return `<!doctype html><html><body style="margin:0;background:#f5f3ff;font-family:Arial,sans-serif;color:#27272a">
  <div style="max-width:620px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#6d28d9,#db2777);padding:32px;border-radius:16px 16px 0 0;color:white;text-align:center">
      <div style="font-size:14px;font-weight:bold;letter-spacing:1px">OFFERTA RISERVATA</div>
      <h1 style="margin:12px 0 0;font-size:34px">-50% per il primo anno</h1>
    </div>
    <div style="background:white;padding:32px;border-radius:0 0 16px 16px">
      <p>Ciao <strong>${username}</strong>,</p>
      <p>La tua prova è terminata. Per continuare a usare Gestionale Appuntamenti puoi attivare qualsiasi piano annuale pagando il 50% per il primo anno.</p>
      <div style="padding:18px;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;text-align:center;margin:24px 0">
        <strong style="font-size:18px">Scade ${expiry}</strong><br>
        <span style="font-size:13px;color:#9a3412">Il conto alla rovescia continua nella pagina dell'offerta.</span>
      </div>
      <div style="text-align:center">
        <a href="${clickUrl}" style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:bold">Scegli il piano annuale al 50%</a>
      </div>
      <p style="font-size:12px;color:#71717a;margin-top:28px">Link personale, valido 7 giorni e utilizzabile una sola volta. Lo sconto si applica al primo periodo annuale; i rinnovi successivi saranno al prezzo ordinario.</p>
    </div>
  </div>
  <img src="${openUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px">
  </body></html>`;
}

export const trialRecoveryOfferService = {
  async process(): Promise<{ sent: number; failed: number }> {
    const now = new Date();
    const latestExpiry = new Date(now.getTime() - OFFER_DELAY_MS);
    const earliestExpiry = new Date(latestExpiry.getTime() - OFFER_WINDOW_MS);
    const candidates = await db.select({
      licenseId: licenses.id,
      userId: licenses.userId,
      email: users.email,
      username: users.username,
    }).from(licenses)
      .innerJoin(users, eq(users.id, licenses.userId))
      .where(and(
        eq(licenses.type, 'trial'),
        gte(licenses.expiresAt, earliestExpiry),
        lt(licenses.expiresAt, latestExpiry),
        isNull(licenses.recoveryOfferSentAt),
        isNull(licenses.recoveryOfferTokenHash),
      ));

    let sent = 0;
    let failed = 0;
    for (const candidate of candidates) {
      if (!candidate.userId || !candidate.email) continue;
      const [active] = await db.select({ id: subscriptions.id }).from(subscriptions)
        .where(and(eq(subscriptions.userId, candidate.userId), eq(subscriptions.status, 'active')))
        .limit(1);
      if (active) continue;

      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + OFFER_VALIDITY_MS);
      // Atomically claim this license before sending so two app instances
      // cannot email two different valid offers to the same user.
      const [claimed] = await db.update(licenses).set({
        recoveryOfferTokenHash: hashRecoveryOfferToken(token),
        recoveryOfferExpiresAt: expiresAt,
      }).where(and(
        eq(licenses.id, candidate.licenseId),
        isNull(licenses.recoveryOfferTokenHash),
      )).returning({ id: licenses.id });
      if (!claimed) continue;

      const result = await sendSystemEmail(
        candidate.email,
        'Solo per 7 giorni: 50% sul tuo primo anno',
        recoveryEmailHtml(candidate.username, token, expiresAt),
        `Ciao ${candidate.username}, hai diritto al 50% sul primo anno. Offerta valida fino al ${expiresAt.toISOString()}.`,
      );
      if (!result.success) {
        await db.update(licenses).set({
          recoveryOfferTokenHash: null,
          recoveryOfferExpiresAt: null,
        }).where(and(
          eq(licenses.id, candidate.licenseId),
          eq(licenses.recoveryOfferTokenHash, hashRecoveryOfferToken(token)),
          isNull(licenses.recoveryOfferSentAt),
        ));
        failed++;
        continue;
      }
      await db.update(licenses).set({
        recoveryOfferSentAt: new Date(),
      }).where(and(
        eq(licenses.id, candidate.licenseId),
        eq(licenses.recoveryOfferTokenHash, hashRecoveryOfferToken(token)),
        isNull(licenses.recoveryOfferSentAt),
      ));
      sent++;
    }
    return { sent, failed };
  },
};