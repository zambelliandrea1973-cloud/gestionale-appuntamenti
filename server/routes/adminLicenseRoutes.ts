// @ts-nocheck
/**
 * Routes per la gestione delle licenze da parte dell'amministratore
 * Queste route sono accessibili solo dall'utente con ruolo admin
 */

import express from 'express';
import { isAdmin } from '../auth';
import { licenseService, LicenseType } from '../services/licenseService';
import { db } from '../db';
import { users, licenses, subscriptions, subscriptionPlans, userLogins } from '../../shared/schema';
import { eq, desc, sql, gte, and, count, ne, notInArray, inArray } from 'drizzle-orm';

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
        } catch (error: any) {
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
    const allNonAdminUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      type: users.type,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(ne(users.role, 'admin'))
    .orderBy(desc(users.createdAt));
    
    res.json(allNonAdminUsers);
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

/**
 * Promuove un utente a Staff (licenza gratuita di 10 anni)
 * Solo admin può eseguire questa operazione
 */
router.post('/upgrade-to-staff', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID utente richiesto'
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }

    // 10 anni a partire da oggi
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);

    // Disattiva tutte le licenze esistenti dell'utente
    await db.update(licenses)
      .set({ isActive: false })
      .where(eq(licenses.userId, userId));

    // Crea la nuova licenza STAFF_FREE
    const crypto = await import('crypto');
    const code = `STAFF-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    await db.insert(licenses).values({
      code,
      type: LicenseType.STAFF_FREE,
      isActive: true,
      userId: userId,
      createdAt: new Date(),
      activatedAt: new Date(),
      expiresAt
    });

    res.json({
      success: true,
      message: `Utente ${user.username} promosso a Staff (accesso gratuito per 10 anni)`,
      username: user.username,
      expiresAt
    });
  } catch (error: any) {
    console.error("Errore nell'upgrade a Staff:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Errore durante l'upgrade a Staff"
    });
  }
});

/**
 * Statistiche accessi utenti - oggi, ultimi 7gg, totali
 * Solo admin può accedere
 */
router.get('/access-stats', async (req, res) => {
  try {
    const now = new Date();
    
    // Inizio di oggi (mezzanotte)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // 7 giorni fa
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    // Trova tutti gli utenti admin per escluderli dalle statistiche globali
    const adminUsers = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'));
    const adminIds = adminUsers.map(u => u.id);
    
    // Condizione per escludere admin (se ci sono admin)
    const excludeAdminCondition = adminIds.length > 0 
      ? notInArray(userLogins.userId, adminIds)
      : sql`1=1`;
    
    // Accessi oggi (esclusi admin)
    const [todayResult] = await db.select({ count: count() })
      .from(userLogins)
      .where(and(gte(userLogins.loginAt, todayStart), excludeAdminCondition));
    
    // Accessi ultimi 7 giorni (esclusi admin)
    const [weekResult] = await db.select({ count: count() })
      .from(userLogins)
      .where(and(gte(userLogins.loginAt, weekAgo), excludeAdminCondition));
    
    // Accessi totali (esclusi admin)
    const [totalResult] = await db.select({ count: count() })
      .from(userLogins)
      .where(excludeAdminCondition);
    
    // Utenti unici oggi (esclusi admin)
    const [uniqueTodayResult] = await db.select({ 
      count: sql<number>`count(distinct ${userLogins.userId})` 
    })
      .from(userLogins)
      .where(and(gte(userLogins.loginAt, todayStart), excludeAdminCondition));
    
    // Utenti unici ultimi 7 giorni (esclusi admin)
    const [uniqueWeekResult] = await db.select({ 
      count: sql<number>`count(distinct ${userLogins.userId})` 
    })
      .from(userLogins)
      .where(and(gte(userLogins.loginAt, weekAgo), excludeAdminCondition));
    
    res.json({
      success: true,
      stats: {
        today: todayResult?.count || 0,
        week: weekResult?.count || 0,
        total: totalResult?.count || 0,
        uniqueToday: uniqueTodayResult?.count || 0,
        uniqueWeek: uniqueWeekResult?.count || 0
      }
    });
  } catch (error: any) {
    console.error('Errore nel recupero statistiche accessi:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Errore durante il recupero delle statistiche' 
    });
  }
});

/**
 * Elimina un account utente e tutti i dati associati
 * Solo admin può eseguire questa operazione
 * L'admin non può eliminare se stesso
 */
router.delete('/delete-user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminUser = req.user as any;
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'ID utente non valido' });
    }
    
    if (userId === adminUser.id) {
      return res.status(400).json({ success: false, message: 'Non puoi eliminare il tuo stesso account' });
    }
    
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }
    
    if (targetUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Non puoi eliminare un account admin' });
    }
    
    console.log(`🗑️ [ADMIN] Eliminazione account utente ID ${userId} (${targetUser.username}) richiesta da admin ID ${adminUser.id}`);
    
    const {
      onboardingProgress, clients, services, appointments, bookingRequests,
      treatmentRooms, marketingMessages, marketingCampaigns, userIcons,
      consents, invoices, invoiceItems, payments, packageTemplates,
      packagePurchases, packageRedemptions, clientAccounts, clientNotes,
      notifications, activationTokens, googleCalendarEvents,
      googleCalendarSettings, googleCalendarSyncTokens, clientAccesses,
      notificationSettings, betaFeedback, referralCommissions,
      staffCommissions, referralPayments, reminderTemplates, appSettings,
      phones, userSettings, productCategories, products, stockMovements,
      productSales, companyNameSettings, contactSettings, currencySettings,
      paymentMethodsConfig, manualContent,
      userLogins, pushSubscriptions, emailBounces, subscriptions: subscriptionsTable,
      paymentMethods: paymentMethodsTable, paymentTransactions
    } = await import('../../shared/schema');
    
    await db.transaction(async (tx) => {
      // Elimina tabelle figlie che referenziano altre tabelle dell'utente
      const userClients = await tx.select({ id: clients.id }).from(clients).where(eq(clients.userId, userId));
      const clientIds = userClients.map(c => c.id);
      
      if (clientIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        await tx.delete(clientAccesses).where(inArray(clientAccesses.clientId, clientIds));
        await tx.delete(consents).where(inArray(consents.clientId, clientIds));
        await tx.delete(clientNotes).where(inArray(clientNotes.clientId, clientIds));
        await tx.delete(clientAccounts).where(inArray(clientAccounts.clientId, clientIds));
      }

      const userInvoices = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.userId, userId));
      const invoiceIds = userInvoices.map(i => i.id);
      if (invoiceIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        await tx.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds));
      }

      // Elimina prodotti correlati (stockMovements e productSales referenziano products)
      const userProducts = await tx.select({ id: products.id }).from(products).where(eq(products.userId, userId));
      const productIds = userProducts.map(p => p.id);
      if (productIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        await tx.delete(stockMovements).where(inArray(stockMovements.productId, productIds));
        await tx.delete(productSales).where(inArray(productSales.productId, productIds));
      }

      // Elenco tabelle da pulire
      const tablesToClean = [
        { table: appointments, col: appointments.userId },
        { table: bookingRequests, col: bookingRequests.userId },
        { table: clients, col: clients.userId },
        { table: services, col: services.userId },
        { table: treatmentRooms, col: treatmentRooms.userId },
        { table: marketingMessages, col: marketingMessages.userId },
        { table: marketingCampaigns, col: marketingCampaigns.userId },
        { table: userIcons, col: userIcons.userId },
        { table: invoices, col: invoices.userId },
        { table: payments, col: payments.userId },
        { table: packageTemplates, col: packageTemplates.userId },
        { table: packagePurchases, col: packagePurchases.userId },
        { table: packageRedemptions, col: packageRedemptions.userId },
        { table: notifications, col: notifications.userId },
        { table: activationTokens, col: activationTokens.userId },
        { table: googleCalendarEvents, col: googleCalendarEvents.userId },
        { table: googleCalendarSettings, col: googleCalendarSettings.userId },
        { table: googleCalendarSyncTokens, col: googleCalendarSyncTokens.userId },
        { table: notificationSettings, col: (notificationSettings as any).userId },
        { table: betaFeedback, col: betaFeedback.userId },
        { table: referralCommissions, col: referralCommissions.referrerId },
        { table: referralCommissions, col: referralCommissions.referredId },
        { table: staffCommissions, col: staffCommissions.staffId },
        { table: referralPayments, col: referralPayments.userId },
        { table: reminderTemplates, col: reminderTemplates.userId },
        { table: appSettings, col: appSettings.userId },
        { table: phones, col: phones.userId },
        { table: licenses, col: licenses.userId },
        { table: onboardingProgress, col: onboardingProgress.userId },
        { table: userSettings, col: userSettings.userId },
        { table: productCategories, col: productCategories.userId },
        { table: products, col: products.userId },
        { table: stockMovements, col: stockMovements.userId },
        { table: productSales, col: productSales.userId },
        { table: companyNameSettings, col: companyNameSettings.userId },
        { table: contactSettings, col: contactSettings.userId },
        { table: currencySettings, col: currencySettings.userId },
        { table: paymentMethodsConfig, col: paymentMethodsConfig.userId },
        { table: manualContent, col: manualContent.userId },
        { table: userLogins, col: userLogins.userId },
        { table: pushSubscriptions, col: pushSubscriptions.userId },
        { table: emailBounces, col: emailBounces.ownerId },
        { table: subscriptionsTable, col: subscriptionsTable.userId },
        { table: paymentMethodsTable, col: paymentMethodsTable.userId },
        { table: paymentTransactions, col: paymentTransactions.userId },
      ];
      
      for (const { table, col } of tablesToClean) {
        if (table && col) {
          try {
            await tx.delete(table).where(eq(col, userId));
          } catch (e) {
            console.log(`⚠️ [ADMIN] Skip tabella durante eliminazione: ${e}`);
          }
        }
      }
      
      // Infine elimina l'utente
      await tx.delete(users).where(eq(users.id, userId));
    });
    
    console.log(`✅ [ADMIN] Account utente ${targetUser.username} (${targetUser.email}) eliminato con successo`);
    
    res.json({ 
      success: true, 
      message: `Account ${targetUser.username} eliminato con successo`,
      deletedUser: { id: targetUser.id, username: targetUser.username, email: targetUser.email }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Errore eliminazione account:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Errore durante l\'eliminazione dell\'account' 
    });
  }
});

export default router;