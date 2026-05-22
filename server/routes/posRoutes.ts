// @ts-nocheck
import express from 'express';
import { storage } from '../storage';
import { createPosProvider } from '../services/pos/posFactory';
import { EncryptionService } from '../services/encryption';
import { db } from '../db';
import { posSettings, posPayments } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Not authenticated' });
  next();
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPosSettings(userId: number) {
  const rows = await db.select().from(posSettings).where(eq(posSettings.userId, userId));
  return rows[0] || null;
}

function generateReference(): string {
  return `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ─── GET /api/pos/settings ────────────────────────────────────────────────────
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const settings = await getPosSettings(user.id);
    if (!settings) return res.json({ isEnabled: false, provider: 'sumup', currency: 'EUR', sumupApiKey: '', sumupMerchantCode: '' });

    res.json({
      isEnabled: settings.isEnabled,
      provider: settings.provider,
      currency: settings.currency,
      sumupMerchantCode: settings.sumupMerchantCode,
      sumupApiKey: settings.sumupApiKey ? '••••••••' : '',  // never expose key
    });
  } catch (err) {
    console.error('[POS] GET settings error:', err);
    res.status(500).json({ message: 'Errore nel recupero impostazioni POS' });
  }
});

// ─── POST /api/pos/settings ───────────────────────────────────────────────────
router.post('/settings', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { isEnabled, provider, currency, sumupApiKey, sumupMerchantCode } = req.body;

    const existing = await getPosSettings(user.id);

    const encryptedKey = sumupApiKey && sumupApiKey !== '••••••••'
      ? EncryptionService.encrypt(sumupApiKey)
      : existing?.sumupApiKey || null;

    const data = {
      userId: user.id,
      isEnabled: !!isEnabled,
      provider: provider || 'sumup',
      currency: currency || 'EUR',
      sumupApiKey: encryptedKey,
      sumupMerchantCode: sumupMerchantCode || existing?.sumupMerchantCode || null,
    };

    if (existing) {
      await db.update(posSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(posSettings.userId, user.id));
    } else {
      await db.insert(posSettings).values(data);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[POS] POST settings error:', err);
    res.status(500).json({ message: 'Errore nel salvataggio impostazioni POS' });
  }
});

// ─── POST /api/pos/test ───────────────────────────────────────────────────────
router.post('/test', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const settings = await getPosSettings(user.id);
    if (!settings?.sumupApiKey) return res.status(400).json({ message: 'API key non configurata' });

    const apiKey = EncryptionService.decrypt(settings.sumupApiKey);
    const provider = createPosProvider('sumup', apiKey);
    const { SumUpProvider } = await import('../services/pos/sumupProvider');
    const sp = provider as InstanceType<typeof SumUpProvider>;
    const merchantCode = await sp.getMerchantCode();

    // Save merchant code
    await db.update(posSettings)
      .set({ sumupMerchantCode: merchantCode, updatedAt: new Date() })
      .where(eq(posSettings.userId, user.id));

    res.json({ success: true, merchantCode });
  } catch (err: any) {
    console.error('[POS] test error:', err?.response?.data || err.message);
    res.status(400).json({ message: 'Connessione SumUp fallita. Verificare la API key.' });
  }
});

// ─── POST /api/pos/checkout ───────────────────────────────────────────────────
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { amount, invoiceId, appointmentId, clientId, description, isAnonymous } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ message: 'Importo non valido' });

    const settings = await getPosSettings(user.id);
    if (!settings?.isEnabled || !settings.sumupApiKey) {
      return res.status(400).json({ message: 'POS non configurato o disabilitato' });
    }

    const apiKey = EncryptionService.decrypt(settings.sumupApiKey);
    const provider = createPosProvider((settings.provider || 'sumup') as any, apiKey);
    const reference = generateReference();

    const checkout = await provider.createCheckout({
      amount: parseFloat(amount),
      currency: settings.currency || 'EUR',
      reference,
      description: description || `Pagamento ${reference}`,
    });

    // Save to DB
    const [posPayment] = await db.insert(posPayments).values({
      userId: user.id,
      invoiceId: invoiceId || null,
      appointmentId: appointmentId || null,
      clientId: clientId || null,
      provider: settings.provider || 'sumup',
      checkoutId: checkout.checkoutId,
      checkoutReference: reference,
      checkoutUrl: checkout.checkoutUrl,
      amount: Math.round(parseFloat(amount) * 100), // cents
      currency: settings.currency || 'EUR',
      status: 'pending',
      isAnonymous: !!isAnonymous,
    }).returning();

    console.log(`✅ [POS] Checkout created: ${reference} — €${amount} — ${checkout.checkoutUrl}`);

    res.json({
      posPaymentId: posPayment.id,
      checkoutId: checkout.checkoutId,
      checkoutUrl: checkout.checkoutUrl,
      reference,
      amount: parseFloat(amount),
      currency: settings.currency || 'EUR',
    });
  } catch (err: any) {
    console.error('[POS] checkout error:', err?.response?.data || err.message);
    res.status(500).json({ message: err?.response?.data?.message || 'Errore nella creazione del pagamento' });
  }
});

// ─── GET /api/pos/checkout/:id/status ────────────────────────────────────────
router.get('/checkout/:id/status', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const posPaymentId = parseInt(req.params.id);

    const rows = await db.select().from(posPayments)
      .where(eq(posPayments.id, posPaymentId));
    const posPayment = rows[0];

    if (!posPayment || posPayment.userId !== user.id) {
      return res.status(404).json({ message: 'Pagamento non trovato' });
    }

    if (posPayment.status === 'paid') return res.json({ status: 'paid' });

    const settings = await getPosSettings(user.id);
    if (!settings?.sumupApiKey) return res.json({ status: posPayment.status });

    const apiKey = EncryptionService.decrypt(settings.sumupApiKey);
    const provider = createPosProvider((settings.provider || 'sumup') as any, apiKey);
    const status = await provider.getCheckoutStatus(posPayment.checkoutId!);
    const normalized = status.toLowerCase();

    if (normalized !== posPayment.status) {
      await db.update(posPayments)
        .set({
          status: normalized,
          paidAt: normalized === 'paid' ? new Date() : null,
        })
        .where(eq(posPayments.id, posPaymentId));
    }

    res.json({ status: normalized });
  } catch (err: any) {
    console.error('[POS] status poll error:', err.message);
    res.status(500).json({ message: 'Errore nel controllo stato pagamento' });
  }
});

// ─── GET /api/pos/payments ────────────────────────────────────────────────────
router.get('/payments', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const payments = await db.select().from(posPayments)
      .where(eq(posPayments.userId, user.id))
      .orderBy(posPayments.createdAt);
    res.json(payments.reverse());
  } catch (err) {
    console.error('[POS] GET payments error:', err);
    res.status(500).json({ message: 'Errore nel recupero pagamenti POS' });
  }
});

// ─── POST /api/pos/webhook/sumup (public — no auth) ──────────────────────────
router.post('/webhook/sumup', async (req, res) => {
  try {
    const body = req.body;
    console.log('[POS] SumUp webhook:', JSON.stringify(body));

    const checkoutId = body.id;
    const status = body.status === 'PAID' ? 'paid' : 'failed';
    const transactionId = body.transaction_id || body.transaction_code || null;

    if (!checkoutId) return res.sendStatus(400);

    const rows = await db.select().from(posPayments)
      .where(eq(posPayments.checkoutId, checkoutId));
    const payment = rows[0];

    if (payment) {
      await db.update(posPayments)
        .set({
          status,
          transactionId,
          paidAt: status === 'paid' ? new Date() : null,
        })
        .where(eq(posPayments.checkoutId, checkoutId));
      console.log(`✅ [POS] Webhook: ${checkoutId} → ${status}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[POS] webhook error:', err);
    res.sendStatus(500);
  }
});

export default router;
