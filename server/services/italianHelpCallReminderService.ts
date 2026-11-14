import { and, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { userSettings, users } from '../../shared/schema';
import { normalizeLang } from '../utils/emailTranslations';
import { sendSystemEmail } from './systemEmailService';
import {
  buildItalianHelpCallOfferHtml,
  buildItalianHelpCallOfferText,
  buildItalianSetupServiceOfferHtml,
  buildItalianSetupServiceOfferText,
  getItalianHelpCallOffer,
} from './italianHelpCallOffer';

export const HELP_CALL_REMINDER_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
const CLAIM_LEASE_MS = 6 * 60 * 60 * 1000;
const MAX_REMINDERS_PER_RUN = 100;

export function isItalianHelpCallReminderDue(
  input: {
    language?: string | null;
    emailNotificationsEnabled?: boolean | null;
    eligibleAt?: Date | null;
    lastActivityAt?: Date | null;
    sentAt?: Date | null;
  },
  now = new Date(),
): boolean {
  const cutoff = now.getTime() - HELP_CALL_REMINDER_DELAY_MS;
  return normalizeLang(input.language) === 'it'
    && input.emailNotificationsEnabled !== false
    && !!input.eligibleAt
    && input.eligibleAt.getTime() <= cutoff
    && (!input.lastActivityAt || input.lastActivityAt.getTime() <= cutoff)
    && !input.sentAt;
}

export function buildReminderEmailHtml(): string {
  const offer = getItalianHelpCallOffer('it')!;
  return `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#27272a">
    <div style="max-width:620px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:28px;border-radius:12px 12px 0 0;color:white;text-align:center">
        <h1 style="margin:0">Vuoi una mano a iniziare?</h1>
      </div>
      <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px">
        <p>Non hai ancora effettuato nuovi accessi da qualche giorno? Se vuoi, puoi scegliere l’aiuto più adatto a te.</p>
        <h2 style="font-size:18px;color:#166534">Consulenza gratuita di 15 minuti</h2>
        ${buildItalianHelpCallOfferHtml('it')}
        <p>Per concordare giorno e orario della videochiamata, scrivici su WhatsApp al ${offer.whatsappNumberLabel}.</p>
        <h2 style="font-size:18px;color:#1d4ed8">Preferisci affidarmi tutta la configurazione?</h2>
        ${buildItalianSetupServiceOfferHtml('it')}
        <p style="font-size:12px;color:#71717a">Questo è un unico promemoria di assistenza; non è necessario rispondere a questa email.</p>
      </div>
    </div>
  </body></html>`;
}

export function buildReminderEmailText(): string {
  const offer = getItalianHelpCallOffer('it')!;
  return `Vuoi una mano a iniziare?\n\nNon hai ancora effettuato nuovi accessi da qualche giorno? Se vuoi, puoi scegliere l’aiuto più adatto a te.\n\nCONSULENZA GRATUITA DI 15 MINUTI\n${buildItalianHelpCallOfferText('it')}\n\nPer concordare giorno e orario della videochiamata, scrivici su WhatsApp al ${offer.whatsappNumberLabel}.\n\nCONFIGURAZIONE COMPLETA DEL GESTIONALE\n${buildItalianSetupServiceOfferText('it')}\n\nQuesto è un unico promemoria di assistenza.`;
}

export const italianHelpCallReminderService = {
  async process(now = new Date()): Promise<{ sent: number; failed: number }> {
    const cutoff = new Date(now.getTime() - HELP_CALL_REMINDER_DELAY_MS);
    const staleClaimBefore = new Date(now.getTime() - CLAIM_LEASE_MS);

    const candidates = await db.select({
      userId: users.id,
      email: users.email,
      language: sql<string | null>`(${userSettings.preferences} ->> 'language')`,
      emailNotificationsEnabled: userSettings.emailNotificationsEnabled,
      eligibleAt: users.helpCallReminderEligibleAt,
      lastActivityAt: users.lastProgramActivityAt,
      sentAt: users.helpCallReminderSentAt,
    }).from(users)
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .where(and(
        eq(users.role, 'user'),
        eq(users.type, 'customer'),
        isNotNull(users.helpCallReminderEligibleAt),
        lt(users.helpCallReminderEligibleAt, cutoff),
        or(isNull(users.lastProgramActivityAt), lt(users.lastProgramActivityAt, cutoff)),
        isNull(users.helpCallReminderSentAt),
        or(
          isNull(users.helpCallReminderClaimedAt),
          lt(users.helpCallReminderClaimedAt, staleClaimBefore),
        ),
        or(
          isNull(userSettings.emailNotificationsEnabled),
          eq(userSettings.emailNotificationsEnabled, true),
        ),
      ))
      .orderBy(users.helpCallReminderEligibleAt)
      .limit(MAX_REMINDERS_PER_RUN);

    let sent = 0;
    let failed = 0;
    for (const candidate of candidates) {
      if (!candidate.email || !isItalianHelpCallReminderDue({
        language: candidate.language,
        emailNotificationsEnabled: candidate.emailNotificationsEnabled,
        eligibleAt: candidate.eligibleAt,
        lastActivityAt: candidate.lastActivityAt,
        sentAt: candidate.sentAt,
      }, now)) {
        continue;
      }

      // Claim each account atomically so multiple app instances do not send
      // the same reminder at the same time.
      const [claim] = await db.update(users)
        .set({ helpCallReminderClaimedAt: now })
        .where(and(
          eq(users.id, candidate.userId),
          isNull(users.helpCallReminderSentAt),
          isNotNull(users.helpCallReminderEligibleAt),
          lt(users.helpCallReminderEligibleAt, cutoff),
          or(isNull(users.lastProgramActivityAt), lt(users.lastProgramActivityAt, cutoff)),
          or(
            isNull(users.helpCallReminderClaimedAt),
            lt(users.helpCallReminderClaimedAt, staleClaimBefore),
          ),
        ))
        .returning({ id: users.id });
      if (!claim) continue;

      try {
        const result = await sendSystemEmail(
          candidate.email,
          'Una mano per iniziare: consulenza gratuita o configurazione completa',
          buildReminderEmailHtml(),
          buildReminderEmailText(),
        );
        if (!result.success) {
          console.error(`[HELP CALL REMINDER] Email delivery failed for user ${candidate.userId}; will retry on a later scheduler run: ${result.error || 'unknown email delivery error'}`);
          await db.update(users)
            .set({ helpCallReminderClaimedAt: null })
            .where(and(
              eq(users.id, candidate.userId),
              eq(users.helpCallReminderClaimedAt, now),
              isNull(users.helpCallReminderSentAt),
            ));
          failed++;
          continue;
        }

        await db.update(users)
          .set({
            helpCallReminderSentAt: new Date(),
            helpCallReminderClaimedAt: null,
          })
          .where(and(
            eq(users.id, candidate.userId),
            eq(users.helpCallReminderClaimedAt, now),
            isNull(users.helpCallReminderSentAt),
          ));
        sent++;
      } catch (error) {
        await db.update(users)
          .set({ helpCallReminderClaimedAt: null })
          .where(and(
            eq(users.id, candidate.userId),
            eq(users.helpCallReminderClaimedAt, now),
            isNull(users.helpCallReminderSentAt),
          ))
          .catch(() => {});
        console.error('[HELP CALL REMINDER] Failed to process one reminder:', error);
        failed++;
      }
    }

    return { sent, failed };
  },
};
