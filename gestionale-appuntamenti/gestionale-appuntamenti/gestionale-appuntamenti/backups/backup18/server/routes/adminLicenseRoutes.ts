/**
 * Routes per la gestione delle licenze da parte dell'amministratore
 * Queste route sono accessibili solo dall'utente con ruolo admin
 */

import express from 'express';
import { isAdmin } from '../auth';
import { licenseService, LicenseType } from '../services/licenseService';
import { db } from '../db';
import { users, licenses, subscriptions, subscriptionPlans } from '../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = express.Router();

// Middleware di protezione: solo admin può accedere
router.use(isAdmin);

/**
 * Ottieni tutti gli utenti con i loro stati di licenza e abbonamento
 * Ritorna dati completi per la pagina admin users management
 */
router.get('/all-users', async (req, res) => {
  try {
    // Ottieni tutti gli utenti dal database
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      type: users.type,
      role: users.role,
      referredBy: users.referredBy,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(desc(users.createdAt));

    // Per ogni utente, ottieni le info di licenza e abbonamento
    const usersWithStatus = await Promise.all(
      allUsers.map(async (user) => {
        try {
          // Ottieni licenza
          const [license] = await db.select()
            .from(licenses)
            .where(eq(licenses.userId, user.id))
            .orderBy(desc(licenses.createdAt))
            .limit(1);

          // Ottieni abbonamento attivo
          const [subscription] = await db.select({
            subscription: subscriptions,
            plan: subscriptionPlans
          })
          .from(subscriptions)
          .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
          .where(eq(subscriptions.userId, user.id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

          // Calcola giorni rimanenti
          let daysLeft = null;
          let licenseStatus = 'unknown';
          let expiresAt = null;

          if (license && license.expiresAt) {
            expiresAt = license.expiresAt;
            const now = new Date();
            const expiration = new Date(license.expiresAt);
            const diffTime = expiration.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysLeft = Math.max(0, diffDays);

            // Determina status
            if (diffDays > 0) {
              licenseStatus = 'active';
            } else {
              licenseStatus = 'expired';
            }
          } else if (license && !license.expiresAt) {
            // Licenza permanente (passepartout o staff)
            licenseStatus = 'permanent';
            daysLeft = null;
          }

          // Se ha abbonamento attivo, override status
          if (subscription && subscription.subscription.status === 'active') {
            licenseStatus = 'subscribed';
            if (subscription.subscription.currentPeriodEnd) {
              expiresAt = subscription.subscription.currentPeriodEnd;
              const now = new Date();
              const expiration = new Date(subscription.subscription.currentPeriodEnd);
              const diffTime = expiration.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              daysLeft = Math.max(0, diffDays);
            }
          }

          return {
            ...user,
            license: license ? {
              id: license.id,
              type: license.type,
              isActive: license.isActive,
              expiresAt: license.expiresAt,
              createdAt: license.createdAt
            } : null,
            subscription: subscription ? {
              id: subscription.subscription.id,
              status: subscription.subscription.status,
              planName: subscription.plan?.name || 'Unknown',
              planInterval: subscription.plan?.interval || null,
              currentPeriodEnd: subscription.subscription.currentPeriodEnd
            } : null,
            status: {
              licenseStatus,
              daysLeft,
              expiresAt
            }
          };
        } catch (error) {
          console.error(`Errore nel recupero dati per utente ${user.id}:`, error);
          return {
            ...user,
            license: null,
            subscription: null,
            status: {
              licenseStatus: 'error',
              daysLeft: null,
              expiresAt: null
            }
          };
        }
      })
    );

    res.json({
      success: true,
      users: usersWithStatus,
      total: usersWithStatus.length
    });
  } catch (error: any) {
    console.error('Errore nel recupero di tutti gli utenti:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Errore durante il recupero degli utenti' 
    });
  }
});

// Genera una nuova licenza gratuita di lunga durata (10 anni) per un membro dello staff
router.post('/generate-staff-license', async (req, res) => {
  try {
    const { userId, licenseType = LicenseType.PRO } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'ID utente richiesto' });
    }
    
    // Verifica che l'utente esista e sia di tipo staff
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    if (user.type !== 'staff') {
      return res.status(400).json({ message: 'La licenza gratuita può essere assegnata solo a membri dello staff' });
    }
    
    // Calcola la data di scadenza (10 anni da oggi)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);
    
    // Genera un codice di licenza speciale
    const licenseCode = await licenseService.generateStaffLicense(userId, licenseType, expiresAt);
    
    res.status(201).json({ 
      success: true, 
      message: `Licenza gratuita di 10 anni di tipo ${licenseType} generata con successo per l'utente ${user.username}`,
      licenseCode
    });
  } catch (error: any) {
    console.error('Errore nella generazione della licenza staff:', error);
    res.status(500).json({ message: error.message || 'Errore durante la generazione della licenza' });
  }
});

// Ottieni tutte le licenze attualmente generate
router.get('/licenses', async (req, res) => {
  try {
    // Ottiene tutte le licenze e le associazioni con gli utenti
    const licensesList = await db.select({
      license: licenses,
      username: users.username,
      userType: users.type,
      userRole: users.role
    })
    .from(licenses)
    .leftJoin(users, eq(licenses.userId, users.id));
    
    res.json(licensesList);
  } catch (error: any) {
    console.error('Errore nel recupero delle licenze:', error);
    res.status(500).json({ message: error.message || 'Errore durante il recupero delle licenze' });
  }
});

// Revoca una licenza esistente
router.post('/revoke-license', async (req, res) => {
  try {
    const { licenseId } = req.body;
    
    if (!licenseId) {
      return res.status(400).json({ message: 'ID licenza richiesto' });
    }
    
    await licenseService.revokeLicense(licenseId);
    
    res.json({ 
      success: true, 
      message: 'Licenza revocata con successo'
    });
  } catch (error: any) {
    console.error('Errore nella revoca della licenza:', error);
    res.status(500).json({ message: error.message || 'Errore durante la revoca della licenza' });
  }
});

// Ottieni la lista degli utenti staff che possono ricevere una licenza
router.get('/staff-users', async (req, res) => {
  try {
    const staffUsers = await db.select({
      id: users.id,
      username: users.username,
      type: users.type,
      role: users.role,
      // Altri campi utili
    })
    .from(users)
    .where(eq(users.type, 'staff'));
    
    res.json(staffUsers);
  } catch (error: any) {
    console.error('Errore nel recupero degli utenti staff:', error);
    res.status(500).json({ message: error.message || 'Errore durante il recupero degli utenti staff' });
  }
});

/**
 * Modifica manualmente la data di creazione o scadenza di una licenza
 * Solo admin può eseguire questa operazione
 */
router.post('/update-expiry-date', async (req, res) => {
  try {
    const { userId, newExpiryDate, field = 'expiry' } = req.body;

    if (!userId || !newExpiryDate) {
      return res.status(400).json({
        success: false,
        message: 'userId e newExpiryDate sono obbligatori'
      });
    }

    // Trova la licenza dell'utente
    const [userLicense] = await db.select()
      .from(licenses)
      .where(eq(licenses.userId, userId))
      .orderBy(desc(licenses.createdAt))
      .limit(1);

    if (!userLicense) {
      return res.status(404).json({
        success: false,
        message: 'Nessuna licenza trovata per questo utente'
      });
    }

    // Valida la data
    const newDate = new Date(newExpiryDate);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Data non valida'
      });
    }

    // Prepara l'oggetto di aggiornamento basato sul campo da modificare
    const updateData: any = {};
    let fieldLabel = '';
    
    if (field === 'created') {
      updateData.createdAt = newDate;
      fieldLabel = 'Data di creazione';
    } else {
      updateData.expiresAt = newDate;
      updateData.isActive = true; // Riattiva se modifico scadenza
      fieldLabel = 'Data di scadenza';
    }

    // Aggiorna la licenza
    await db.update(licenses)
      .set(updateData)
      .where(eq(licenses.id, userLicense.id));

    console.log(`✅ ${fieldLabel} modificata per utente ${userId}: ${newDate.toISOString()}`);

    res.json({
      success: true,
      message: `${fieldLabel} aggiornata al ${newDate.toLocaleDateString()}`,
      newDate: newDate
    });
  } catch (error: any) {
    console.error('Errore durante la modifica della data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Errore durante la modifica della data'
    });
  }
});

/**
 * Estende il trial di 40 giorni per un utente specifico
 * Solo admin può eseguire questa operazione
 */
router.post('/extend-trial', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'ID utente richiesto' 
      });
    }
    
    // Verifica che l'utente esista
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utente non trovato' 
      });
    }
    
    // Estendi il trial
    const result = await licenseService.extendTrial(userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        newExpiresAt: result.newExpiresAt,
        username: user.username
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Errore nell\'estensione del trial:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Errore durante l\'estensione del trial' 
    });
  }
});

export default router;