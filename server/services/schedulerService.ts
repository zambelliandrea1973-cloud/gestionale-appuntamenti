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
   * Start the automatic Google Calendar synchronisation service
   * Check every 5 minutes for new events on Google Calendar and import them
   */
  startGoogleCalendarImportScheduler(): void {
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    
    // Cron job that runs every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      const now = new Date();
      if (isVerbose) console.log('🔄 [GOOGLE IMPORT] Executing automatic import from Google Calendar:', now.toISOString());
      
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
        
        let totalImported = 0;
        let totalDeleted = 0;
        let totalErrors = 0;
        
        // Synchronize for each user: import new events AND detect deleted ones
        for (const user of usersWithGoogleCalendar) {
          try {
            // 1. Import new events from Google
            const importResult = await importGoogleCalendarEvents(user.id);
            totalImported += importResult.imported;
            totalErrors += importResult.errors.length;
            
            if (importResult.imported > 0) {
              logger.debug(`✅ [GOOGLE SYNC] user ${user.id}: imported ${importResult.imported} events from Google Calendar`);
            }
            
            // 2. Detect events deleted from Google and remove from the scheduler
            const deleteResult = await syncDeletedEvents(user.id);
            totalDeleted += deleteResult.deleted;
            totalErrors += deleteResult.errors.length;
            
            if (deleteResult.deleted > 0) {
              console.log(`🗑️ [GOOGLE SYNC] user ${user.id}: removed ${deleteResult.deleted} appointments (deleted from Google)`);
            }
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
    
    console.log('🔄 Google Calendar import scheduler started successfully (every 5 minutes)');
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
  // ⏸️ Google sync managed on-demand when the calendar page is opened
  // schedulerService.startGoogleCalendarImportScheduler();
  if (process.env.LOG_SCHEDULER !== 'false') console.log('All schedulers initialized');
}