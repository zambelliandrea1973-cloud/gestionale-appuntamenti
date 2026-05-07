// @ts-nocheck
/**
 * Routes for license management by the administrator
 * These routes are accessible only by the user with admin role
 */

import express from 'express';
import { isAdmin } from '../auth';
import { licenseService, LicenseType } from '../services/licenseService';
import { db } from '../db';
import { users, licenses, subscriptions, subscriptionPlans, userLogins } from '../../shared/schema';
import { eq, desc, sql, gte, and, count, ne, notInArray, inArray } from 'drizzle-orm';

const router = express.Router();

// Protection middleware: only admin can access
router.use(isAdmin);

/**
 * Get all users with their license and subscription states
 * Returns complete data for the admin users management page
 */
router.get('/all-users', async (req, res) => {
  try {
    // Get all users from the database
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

    // For each user, get the license and subscription info
    const usersWithStatus = await Promise.all(
      allUsers.map(async (user) => {
        try {
          // Get license
          const [license] = await db.select()
            .from(licenses)
            .where(eq(licenses.userId, user.id))
            .orderBy(desc(licenses.createdAt))
            .limit(1);

          // Get active subscription
          const [subscription] = await db.select({
            subscription: subscriptions,
            plan: subscriptionPlans
          })
          .from(subscriptions)
          .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
          .where(eq(subscriptions.userId, user.id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

          // Calculate remaining days
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

            // Determine status
            if (diffDays > 0) {
              licenseStatus = 'active';
            } else {
              licenseStatus = 'expired';
            }
          } else if (license && !license.expiresAt) {
            // Permanent license (passepartout or staff)
            licenseStatus = 'permanent';
            daysLeft = null;
          }

          // If active subscription, override status
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
          console.error(`Error retrieving data for user ${user.id}:`, error);
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
    console.error('Error retrieving all users:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error retrieving users' 
    });
  }
});

// Generate a new long-duration free license (10 years) for a staff member
router.post('/generate-staff-license', async (req, res) => {
  try {
    const { userId, licenseType = LicenseType.PRO } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }
    
    // Verify that the user exists and is of type staff
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.type !== 'staff') {
      return res.status(400).json({ message: 'The free license can only be assigned to staff members' });
    }
    
    // Calculate the expiry date (10 years from today)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);
    
    // Generate a code di license speciale
    const licenseCode = await licenseService.generateStaffLicense(userId, licenseType, expiresAt);
    
    res.status(201).json({ 
      success: true, 
      message: `Free 10-year license of type ${licenseType} generated successfully for user ${user.username}`,
      licenseCode
    });
  } catch (error: any) {
    console.error('Error generating staff license:', error);
    res.status(500).json({ message: error.message || 'Error generating license' });
  }
});

// Get all licenses attualmente generate
router.get('/licenses', async (req, res) => {
  try {
    // Get all licenses and their associations with users
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
    console.error('Error retrieving licenses:', error);
    res.status(500).json({ message: error.message || 'Error retrieving licenses' });
  }
});

// Revoke an existing license
router.post('/revoke-license', async (req, res) => {
  try {
    const { licenseId } = req.body;
    
    if (!licenseId) {
      return res.status(400).json({ message: 'License ID required' });
    }
    
    await licenseService.revokeLicense(licenseId);
    
    res.json({ 
      success: true, 
      message: 'License revoked successfully'
    });
  } catch (error: any) {
    console.error('Error revoking license:', error);
    res.status(500).json({ message: error.message || 'Error revoking license' });
  }
});

// Get the list of staff users who can receive a license
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
    console.error('Error retrieving staff users:', error);
    res.status(500).json({ message: error.message || 'Error retrieving staff users' });
  }
});

/**
 * Manually modify the creation or expiry date of a license
 * Only admin can perform this operation
 */
router.post('/update-expiry-date', async (req, res) => {
  try {
    const { userId, newExpiryDate, field = 'expiry' } = req.body;

    if (!userId || !newExpiryDate) {
      return res.status(400).json({
        success: false,
        message: 'userId and newExpiryDate are required'
      });
    }

    // Find the license of the user
    const [userLicense] = await db.select()
      .from(licenses)
      .where(eq(licenses.userId, userId))
      .orderBy(desc(licenses.createdAt))
      .limit(1);

    if (!userLicense) {
      return res.status(404).json({
        success: false,
        message: 'No license found for this user'
      });
    }

    // Validate the date
    const newDate = new Date(newExpiryDate);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Data invalid'
      });
    }

    // Prepare the update object based on the field to modify
    const updateData: any = {};
    let fieldLabel = '';
    
    if (field === 'created') {
      updateData.createdAt = newDate;
      fieldLabel = 'Data di creazione';
    } else {
      updateData.expiresAt = newDate;
      updateData.isActive = true; // Reactivate if expiry is modified
      fieldLabel = 'Data di scadenza';
    }

    // Update the license
    await db.update(licenses)
      .set(updateData)
      .where(eq(licenses.id, userLicense.id));

    console.log(`✅ ${fieldLabel} modified for user ${userId}: ${newDate.toISOString()}`);

    res.json({
      success: true,
      message: `${fieldLabel} updated to ${newDate.toLocaleDateString()}`,
      newDate: newDate
    });
  } catch (error: any) {
    console.error('Error modifying date:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error modifying date'
    });
  }
});

/**
 * Extend the trial by 40 days for a specific user
 * Only admin can perform this operation
 */
router.post('/extend-trial', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID required' 
      });
    }
    
    // Verify that the user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Extend the trial
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
    console.error('Error extending trial:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error extending trial' 
    });
  }
});

/**
 * Promote a user to Staff (free 10-year license)
 * Only admin can perform this operation
 */
router.post('/upgrade-to-staff', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required'
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 10 years from today
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);

    // Deactivate all existing licenses of the user
    await db.update(licenses)
      .set({ isActive: false })
      .where(eq(licenses.userId, userId));

    // Create the new STAFF_FREE license with code in consistent format STAFF-{userId}-{timestamp}
    const code = `STAFF-${userId}-${Math.floor(Date.now() / 1000)}`;

    await db.insert(licenses).values({
      code,
      type: LicenseType.STAFF_FREE,
      isActive: true,
      userId: userId,
      createdAt: new Date(),
      activatedAt: new Date(),
      expiresAt
    });

    // Generate assignmentCode if the user does not already have one.
    // Without this code the client filter always returns [] for staff.
    let assignmentCode = user.assignmentCode || null;
    if (!assignmentCode) {
      const alphanumUsername = (user.username || '').replace(/[^a-zA-Z0-9]/g, '');
      const prefix = alphanumUsername.substring(0, 3).toUpperCase().padEnd(3, 'X');
      const paddedId = String(userId).padStart(4, '0');
      assignmentCode = `${prefix}${paddedId}`;
    }

    // Update users.type, users.role e (If missing) users.assignmentCode
    await db.update(users)
      .set({ type: 'staff', role: 'staff', assignmentCode })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: `User ${user.username} promoted to Staff (free access for 10 years)`,
      username: user.username,
      expiresAt,
      assignmentCode
    });
  } catch (error: any) {
    console.error("Error upgrading to Staff:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error upgrading to Staff"
    });
  }
});

/**
 * User access statistics - today, last 7 days, total
 * Only admin can access
 */
router.get('/access-stats', async (req, res) => {
  try {
    const now = new Date();
    
    // Start of today (midnight)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // 7 days ago
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    // Find all admin users to exclude them from global statistics
    const adminUsers = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'));
    const adminIds = adminUsers.map(u => u.id);
    
    // Condition to exclude admins (if any admins exist)
    const excludeAdminCondition = adminIds.length > 0 
      ? notInArray(userLogins.userId, adminIds)
      : sql`1=1`;
    
    // Accessi oggi (esclusi admin)
    const [todayResult] = await db.select({ count: count() })
      .from(userLogins)
      .where(and(gte(userLogins.loginAt, todayStart), excludeAdminCondition));
    
    // Accesses last 7 days (excluding admins)
    const [weekResult] = await db.select({ count: count() })
      .from(userLogins)
      .where(and(gte(userLogins.loginAt, weekAgo), excludeAdminCondition));
    
    // Total accesses (excluding admins)
    const [totalResult] = await db.select({ count: count() })
      .from(userLogins)
      .where(excludeAdminCondition);
    
    // Users unici oggi (esclusi admin)
    const [uniqueTodayResult] = await db.select({ 
      count: sql<number>`count(distinct ${userLogins.userId})` 
    })
      .from(userLogins)
      .where(and(gte(userLogins.loginAt, todayStart), excludeAdminCondition));
    
    // Unique users last 7 days (excluding admins)
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
    console.error('Error retrieving access statistics:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error retrieving statistics' 
    });
  }
});

/**
 * Delete a user account and all associated data
 * Only admin can perform this operation
 * Admin cannot delete themselves
 */
router.delete('/delete-user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminUser = req.user as any;
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    if (userId === adminUser.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (targetUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot delete an admin account' });
    }
    
    console.log(`🗑️ [ADMIN] Deleting user account ID ${userId} (${targetUser.username}) requested by admin ID ${adminUser.id}`);
    
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
      // Delete child tables that reference other tables of the user
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

      // Delete related products (stockMovements and productSales reference products)
      const userProducts = await tx.select({ id: products.id }).from(products).where(eq(products.userId, userId));
      const productIds = userProducts.map(p => p.id);
      if (productIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        await tx.delete(stockMovements).where(inArray(stockMovements.productId, productIds));
        await tx.delete(productSales).where(inArray(productSales.productId, productIds));
      }

      // List of tables to clean up
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
            console.log(`⚠️ [ADMIN] Skip table during deletion: ${e}`);
          }
        }
      }
      
      // Finally delete the user
      await tx.delete(users).where(eq(users.id, userId));
    });
    
    console.log(`✅ [ADMIN] Account user ${targetUser.username} (${targetUser.email}) deleted successfully`);
    
    res.json({ 
      success: true, 
      message: `Account ${targetUser.username} deleted successfully`,
      deletedUser: { id: targetUser.id, username: targetUser.username, email: targetUser.email }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Error deleting account:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error deleting account' 
    });
  }
});

export default router;