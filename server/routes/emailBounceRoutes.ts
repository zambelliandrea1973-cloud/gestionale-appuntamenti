import { Router } from 'express';
import { db } from '../db';
import { emailBounces, clients } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/email-bounces
 * Retrieve the list of blocked emails for the current user
 * Include associated client data if available
 */
router.get('/email-bounces', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Resolve ownerId for multi-tenant (staff uses ownerId, admin uses their own userId)
    const ownerId = req.user.ownerId ?? req.user.tenantId ?? req.user.id;

    // Query with join to also get client data
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
        // Client data (if present)
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
    console.error('❌ Error retrieving email bounces:', error);
    res.status(500).json({ error: 'Error retrieving bounce data', details: error.message });
  }
});

/**
 * POST /api/email-bounces/unblock
 * Unlock a specific email and reset the bounce counter
 * Body: { email: string }
 */
router.post('/email-bounces/unblock', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email required' });
    }

    // Resolve ownerId for multi-tenant
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

    // Also unlock on the client if present
    await db.update(clients)
      .set({
        emailBlocked: false,
        emailBlockedReason: null,
      })
      .where(and(
        eq(clients.email, email),
        eq(clients.ownerId, ownerId)
      ));

    console.log(`✅ Email ${email} unblocked for owner ${ownerId}`);
    
    res.json({ 
      success: true, 
      message: `Email ${email} unblocked successfully. Future sends will resume normally.` 
    });
  } catch (error: any) {
    console.error('❌ Error unblocking email:', error);
    res.status(500).json({ error: 'Error unblocking email', details: error.message });
  }
});

/**
 * DELETE /api/email-bounces/:id
 * Delete a specific bounce record
 */
router.delete('/email-bounces/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const bounceId = parseInt(req.params.id);
    
    if (isNaN(bounceId)) {
      return res.status(400).json({ error: 'ID bounce invalid' });
    }

    // Resolve ownerId for multi-tenant
    const ownerId = req.user.ownerId ?? req.user.tenantId ?? req.user.id;

    // Verify ownership and delete
    const deleted = await db.delete(emailBounces)
      .where(and(
        eq(emailBounces.id, bounceId),
        eq(emailBounces.ownerId, ownerId)
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Record bounce not found' });
    }

    console.log(`🗑️ Bounce ID ${bounceId} deleted for owner ${ownerId}`);
    
    res.json({ success: true, message: 'Record bounce eliminato' });
  } catch (error: any) {
    console.error('❌ Error deleting bounce:', error);
    res.status(500).json({ error: 'Error deleting bounce', details: error.message });
  }
});

export default router;
