import { Router } from 'express';
import { db } from '../db';
import { emailBounces, clients } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/email-bounces
 * Recupera la lista delle email bloccate per l'utente corrente
 * Include dati del cliente associato se disponibile
 */
router.get('/email-bounces', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    // Risolvi ownerId per multi-tenant (staff usa ownerId, admin usa proprio userId)
    const ownerId = req.user.ownerId ?? req.user.tenantId ?? req.user.id;

    // Query con join per ottenere anche i dati del cliente
    const bounces = await db
      .select({
        id: emailBounces.id,
        email: emailBounces.email,
        errorCode: emailBounces.errorCode,
        errorMessage: emailBounces.errorMessage,
        errorType: emailBounces.errorType,
        bounceCount: emailBounces.bounceCount,
        lastBounceAt: emailBounces.lastBounceAt,
        isBlocked: emailBounces.isBlocked,
        createdAt: emailBounces.createdAt,
        // Dati cliente (se presente)
        clientId: clients.id,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientEmailBlocked: clients.emailBlocked,
        clientEmailBlockedReason: clients.emailBlockedReason,
      })
      .from(emailBounces)
      .leftJoin(clients, eq(emailBounces.clientId, clients.id))
      .where(eq(emailBounces.ownerId, ownerId))
      .orderBy(desc(emailBounces.lastBounceAt));

    console.log(`📧 Recuperate ${bounces.length} email bounce per owner ${ownerId}`);
    
    res.json(bounces);
  } catch (error: any) {
    console.error('❌ Errore recupero email bounces:', error);
    res.status(500).json({ error: 'Errore recupero dati bounce', details: error.message });
  }
});

/**
 * POST /api/email-bounces/unblock
 * Sblocca una email specifica e resetta il contatore bounce
 * Body: { email: string }
 */
router.post('/email-bounces/unblock', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email richiesta' });
    }

    // Risolvi ownerId per multi-tenant
    const ownerId = req.user.ownerId ?? req.user.tenantId ?? req.user.id;

    // Reset bounce record
    await db.update(emailBounces)
      .set({
        isBlocked: false,
        bounceCount: 0,
      })
      .where(and(
        eq(emailBounces.email, email),
        eq(emailBounces.ownerId, ownerId)
      ));

    // Sblocca anche sul cliente se presente
    await db.update(clients)
      .set({
        emailBlocked: false,
        emailBlockedReason: null,
      })
      .where(and(
        eq(clients.email, email),
        eq(clients.ownerId, ownerId)
      ));

    console.log(`✅ Email ${email} sbloccata per owner ${ownerId}`);
    
    res.json({ 
      success: true, 
      message: `Email ${email} sbloccata con successo. I futuri invii riprenderanno normalmente.` 
    });
  } catch (error: any) {
    console.error('❌ Errore sblocco email:', error);
    res.status(500).json({ error: 'Errore sblocco email', details: error.message });
  }
});

/**
 * DELETE /api/email-bounces/:id
 * Elimina un record bounce specifico
 */
router.delete('/email-bounces/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const bounceId = parseInt(req.params.id);
    
    if (isNaN(bounceId)) {
      return res.status(400).json({ error: 'ID bounce non valido' });
    }

    // Risolvi ownerId per multi-tenant
    const ownerId = req.user.ownerId ?? req.user.tenantId ?? req.user.id;

    // Verifica ownership e elimina
    const deleted = await db.delete(emailBounces)
      .where(and(
        eq(emailBounces.id, bounceId),
        eq(emailBounces.ownerId, ownerId)
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Record bounce non trovato' });
    }

    console.log(`🗑️ Bounce ID ${bounceId} eliminato per owner ${ownerId}`);
    
    res.json({ success: true, message: 'Record bounce eliminato' });
  } catch (error: any) {
    console.error('❌ Errore eliminazione bounce:', error);
    res.status(500).json({ error: 'Errore eliminazione bounce', details: error.message });
  }
});

export default router;
