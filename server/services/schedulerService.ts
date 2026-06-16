import { logger } from '../utils/logger';
import cron from 'node-cron';
import { notificationService } from './notificationService';
import { PayPalPayoutService } from './paypalPayoutService';
import { trialNotificationService } from './trialNotificationService';
import { importGoogleCalendarEvents, syncDeletedEvents } from './googleCalendarSync';
import { db } from '../db';
import { marketingCampaigns, users } from '../../shared/schema';
import { lt, eq, and, isNotNull } from 'drizzle-orm';

/**
 * Service for scheduling recurring activities
 */
export const schedulerService = {
  /**
   * Start the appointment reminder scheduling service
   * Verify every 15 minutes the appointments in the next 30 hours and send reminders 
   * This ensures that appointments created just hours before the meeting also receive the email within max 15 minutes
   */
  startReminderScheduler(): void {
    // Cron job that runs every 15 minutes (at minutes 0, 15, 30, 45)
    // Cron format: second(0-59) minute(0-59) hour(0-23) day-of-month(1-31) month(1-12) day-of-week(0-6, 0=Sunday)
    cron.schedule('0 */15 * * * *', async () => {
      const now = new Date();
      const isVerbose = process.env.LOG_SCHEDULER !== 'false';
      if (isVerbose) console.log('⏰ Executing appointment reminder job:', now.toISOString());
      
      try {
        // Process reminders for the appointments in the next 30 hours
        const sentCount = await notificationService.processReminders();
        if (isVerbose || sentCount > 0) logger.debug(`✅ Job completed: sent ${sentCount} reminders`);
      } catch (error) {
        console.error('❌ Error executing reminder job:', error);
      }
    });
    
    // Run the job immediately on startup to check for any pending reminders
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    setTimeout(async () => {
      try {
        if (isVerbose) console.log('🚀 Immediate execution of reminder job on server startup');
        const sentCount = await notificationService.processReminders();
        if (isVerbose || sentCount > 0) logger.debug(`✅ Initial job completed: sent ${sentCount} reminders`);
      } catch (error) {
        console.error('❌ Error in initial reminder job execution:', error);
      }
    }, 5000); // Run 5 seconds after startup to allow connections to stabilize
    
    if (isVerbose) console.log('⏰ Reminder scheduler started successfully (every 15 minutes)');
  },
  
  /**
   * Start the PayPal payout scheduling service
   * Verify each day at 10:00 the commissions ready for payout (30 days after creation)
   */
  startPayoutScheduler(): void {
    // Cron job executed each day at 10:00
    // Cron format: second(0-59) minute(0-59) hour(0-23) day-of-month(1-31) month(1-12) day-of-week(0-6, 0=Sunday)
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    cron.schedule('0 0 10 * * *', async () => {
      const now = new Date();
      if (isVerbose) console.log('💰 Executing referral commission payout job:', now.toISOString());
      
      try {
        const result = await PayPalPayoutService.processScheduledPayouts();
        if (isVerbose || result.processed > 0 || result.failed > 0) {
          logger.debug(`💰 Payout job completed: ${result.processed} processed, ${result.failed} failed`);
        }
      } catch (error) {
        console.error('❌ Error executing payout job:', error);
      }
    });
    
    if (isVerbose) console.log('💰 PayPal payout scheduler started successfully (daily execution at 10:00)');
  },
  
  /**
   * Start the automatic marketing campaign cleanup service
   * Delete campaigns older than 12 months each day at 03:00
   */
  startCampaignCleanupScheduler(): void {
    // Cron job executed each day at 03:00
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    cron.schedule('0 0 3 * * *', async () => {
      const now = new Date();
      if (isVerbose) console.log('🗑️ Executing marketing campaign cleanup job:', now.toISOString());
      
      try {
        // Calculate the cutoff date (12 months ago)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        // Delete campaigns older than 12 months
        const deletedCampaigns = await db
          .delete(marketingCampaigns)
          .where(lt(marketingCampaigns.createdAt, twelveMonthsAgo))
          .returning();
        
        if (isVerbose || deletedCampaigns.length > 0) {
          console.log(`🗑️ Campaign cleanup completed: ${deletedCampaigns.length} campaigns deleted (older than 12 months)`);
        }
        
        if (deletedCampaigns.length > 0) {
          logger.debug(`📋 Campaigns deleted: ${deletedCampaigns.map(c => c.title).join(', ')}`);
        }
      } catch (error) {
        console.error('❌ Error executing campaign cleanup job:', error);
      }
    });
    
    if (isVerbose) console.log('🗑️ Campaign cleanup scheduler started successfully (daily execution at 03:00)');
  },
  
  /**
   * Start the trial expiry notification service
   * Check each day at 09:00 for trial users expiring in 10 days
   */
  startTrialNotificationScheduler(): void {
    // Cron job executed each day at 09:00
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    cron.schedule('0 0 9 * * *', async () => {
      const now = new Date();
      if (isVerbose) console.log('📧 Executing expiring trial notifications job:', now.toISOString());
      
      try {
        const result = await trialNotificationService.processTrialNotifications();
        if (isVerbose || result.sent > 0 || result.failed > 0) {
          logger.debug(`📧 Trial notifications job completed: ${result.sent} sent, ${result.failed} failed`);
        }
      } catch (error) {
        console.error('❌ Error executing trial notification job:', error);
      }
    });
    
    if (isVerbose) console.log('📧 Trial notifications scheduler started successfully (daily execution at 09:00)');
  },
  
  /**
   * Start the automatic Google Calendar synchronisation service.
   * Runs every hour; syncs only users whose last sync is >= 24 hours ago.
   */
  startGoogleCalendarImportScheduler(): void {
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

    // Cron job that runs every hour to pick up users due for their 24-hour sync
    cron.schedule('0 * * * *', async () => {
      // Only run on production (Sliplane) — skip on Replit dev to avoid
      // interfering with the shared DB (token overwrites, encryption key mismatch)
      if (!process.env.PRODUCTION_DOMAIN) {
        logger.debug('⏭️ [GOOGLE IMPORT] Skipping scheduler on dev environment');
        return;
      }
      const now = new Date();
      if (isVerbose) console.log('🔄 [GOOGLE IMPORT] Hourly check — syncing users overdue by 24h:', now.toISOString());

      try {
        // Find all users with Google Calendar enabled
        const usersWithGoogleCalendar = await db.select()
          .from(users)
          .where(and(
            eq(users.googleCalendarEnabled, true),
            isNotNull(users.googleAuthToken)
          ));

        if (usersWithGoogleCalendar.length === 0) {
          if (isVerbose) console.log('📭 [GOOGLE IMPORT] No users with Google Calendar enabled');
          return;
        }

        // Keep only users whose last sync was >= 24 hours ago (or never synced)
        const dueUsers = usersWithGoogleCalendar.filter(u => {
          if (!u.lastGoogleSyncAt) return true;
          return (now.getTime() - new Date(u.lastGoogleSyncAt).getTime()) >= SYNC_INTERVAL_MS;
        });

        if (dueUsers.length === 0) {
          if (isVerbose) console.log('⏳ [GOOGLE IMPORT] All users synced within last 24h — nothing to do');
          return;
        }

        if (isVerbose) console.log(`🔄 [GOOGLE IMPORT] ${dueUsers.length} user(s) due for 24h sync`);

        let totalImported = 0;
        let totalDeleted = 0;
        let totalErrors = 0;

        for (const user of dueUsers) {
          try {
            // 1. Import new events from Google
            const importResult = await importGoogleCalendarEvents(user.id);
            totalImported += importResult.imported;
            totalErrors += importResult.errors.length;

            if (importResult.imported > 0) {
              logger.debug(`✅ [GOOGLE SYNC] user ${user.id}: imported ${importResult.imported} events`);
            }

            // 2. Detect events deleted from Google
            const deleteResult = await syncDeletedEvents(user.id);
            totalDeleted += deleteResult.deleted;
            totalErrors += deleteResult.errors.length;

            if (deleteResult.deleted > 0) {
              console.log(`🗑️ [GOOGLE SYNC] user ${user.id}: removed ${deleteResult.deleted} appointments`);
            }

            // 3. Update lastGoogleSyncAt so the 24h window resets from now
            await db.update(users)
              .set({ lastGoogleSyncAt: now })
              .where(eq(users.id, user.id));

          } catch (userError) {
            console.error(`⚠️ [GOOGLE SYNC] Error for user ${user.id}:`, userError);
            totalErrors++;
          }
        }

        if (isVerbose || totalImported > 0 || totalDeleted > 0) {
          logger.debug(`🔄 [GOOGLE SYNC] completed: ${totalImported} imported, ${totalDeleted} deleted, ${totalErrors} errors`);
        }
      } catch (error) {
        console.error('❌ [GOOGLE IMPORT] Error executing job:', error);
      }
    });

    console.log('🔄 Google Calendar import scheduler started successfully (every 24h per user)');
  },

  /**
   * Renew Google Calendar push notification watch channels before they expire (max 7 days).
   * Runs daily at 05:00; renews any channel expiring within the next 2 days.
   * Only runs on production (requires public HTTPS URL).
   */
  startWatchRenewalScheduler(): void {
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    cron.schedule('0 0 5 * * *', async () => {
      if (!process.env.PRODUCTION_DOMAIN) return;
      const now = new Date();
      if (isVerbose) console.log('🔔 [WATCH RENEWAL] Checking expiring Google Calendar watches:', now.toISOString());

      try {
        const { registerCalendarWatches } = await import('./googleCalendarSync');
        const { googleCalendarSyncTokens } = await import('../../shared/schema');
        const { lt, isNotNull } = await import('drizzle-orm');

        // Find channels expiring within 2 days
        const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        const expiring = await db.select({ userId: googleCalendarSyncTokens.userId })
          .from(googleCalendarSyncTokens)
          .where(and(
            isNotNull(googleCalendarSyncTokens.channelId),
            lt(googleCalendarSyncTokens.watchExpiresAt, twoDaysFromNow)
          ));

        // Unique user IDs
        const userIds = [...new Set(expiring.map(r => r.userId))];
        if (userIds.length === 0) {
          if (isVerbose) console.log('✅ [WATCH RENEWAL] No channels expiring soon');
          return;
        }

        if (isVerbose) console.log(`🔔 [WATCH RENEWAL] Renewing watches for ${userIds.length} user(s)`);
        for (const uid of userIds) {
          await registerCalendarWatches(uid).catch(e =>
            console.error(`❌ [WATCH RENEWAL] Failed for user ${uid}:`, e)
          );
        }
        if (isVerbose) console.log(`✅ [WATCH RENEWAL] Done`);
      } catch (error) {
        console.error('❌ [WATCH RENEWAL] Error:', error);
      }
    });
    if (isVerbose) console.log('🔔 Watch renewal scheduler started (daily at 05:00)');
  },
};

/**
 * Start all scheduled services at application initialization
 */
export function initializeSchedulers(): void {
  schedulerService.startReminderScheduler();
  schedulerService.startPayoutScheduler();
  schedulerService.startCampaignCleanupScheduler();
  schedulerService.startTrialNotificationScheduler();
  schedulerService.startGoogleCalendarImportScheduler();
  schedulerService.startWatchRenewalScheduler();
  if (process.env.LOG_SCHEDULER !== 'false') console.log('All schedulers initialized');
}