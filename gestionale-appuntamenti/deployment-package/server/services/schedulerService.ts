import cron from 'node-cron';
import { notificationService } from './notificationService';
import { PayPalPayoutService } from './paypalPayoutService';
import { db } from '../db';
import { marketingCampaigns } from '../../shared/schema';
import { lt } from 'drizzle-orm';

/**
 * Servizio per la pianificazione di attività ricorrenti
 */
export const schedulerService = {
  /**
   * Avvia il servizio di pianificazione dei promemoria degli appuntamenti
   * Verifica ogni 15 minuti gli appuntamenti delle prossime 30 ore e invia i promemoria 
   * Questo garantisce che anche appuntamenti creati a poche ore dall'incontro ricevano l'email entro max 15 minuti
   */
  startReminderScheduler(): void {
    // Cron job che viene eseguito ogni 15 minuti (ai minuti 0, 15, 30, 45)
    // Formato cron: second(0-59) minute(0-59) hour(0-23) day-of-month(1-31) month(1-12) day-of-week(0-6, 0=Sunday)
    cron.schedule('0 */15 * * * *', async () => {
      const now = new Date();
      const isVerbose = process.env.LOG_SCHEDULER !== 'false';
      if (isVerbose) console.log('⏰ Esecuzione del job di promemoria appuntamenti:', now.toISOString());
      
      try {
        // Elabora i promemoria per gli appuntamenti delle prossime 30 ore
        const sentCount = await notificationService.processReminders();
        if (isVerbose || sentCount > 0) console.log(`✅ Job completato: inviati ${sentCount} promemoria`);
      } catch (error) {
        console.error('❌ Errore nell\'esecuzione del job di promemoria:', error);
      }
    });
    
    // Eseguiamo il job immediatamente all'avvio per verificare eventuali promemoria pendenti
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    setTimeout(async () => {
      try {
        if (isVerbose) console.log('🚀 Esecuzione immediata del job di promemoria all\'avvio del server');
        const sentCount = await notificationService.processReminders();
        if (isVerbose || sentCount > 0) console.log(`✅ Job iniziale completato: inviati ${sentCount} promemoria`);
      } catch (error) {
        console.error('❌ Errore nell\'esecuzione iniziale del job di promemoria:', error);
      }
    }, 5000); // Esegui dopo 5 secondi dall'avvio per permettere alle connessioni di stabilizzarsi
    
    if (isVerbose) console.log('⏰ Scheduler dei promemoria avviato con successo (esecuzione ogni 15 minuti)');
  },
  
  /**
   * Avvia il servizio di pianificazione dei payout PayPal
   * Verifica ogni giorno alle 10:00 le commissioni pronte per il payout (30gg dopo creazione)
   */
  startPayoutScheduler(): void {
    // Cron job che viene eseguito ogni giorno alle 10:00
    // Formato cron: second(0-59) minute(0-59) hour(0-23) day-of-month(1-31) month(1-12) day-of-week(0-6, 0=Sunday)
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    cron.schedule('0 0 10 * * *', async () => {
      const now = new Date();
      if (isVerbose) console.log('💰 Esecuzione del job di payout commissioni referral:', now.toISOString());
      
      try {
        const result = await PayPalPayoutService.processScheduledPayouts();
        if (isVerbose || result.processed > 0 || result.failed > 0) {
          console.log(`💰 Job payout completato: ${result.processed} processati, ${result.failed} falliti`);
        }
      } catch (error) {
        console.error('❌ Errore nell\'esecuzione del job di payout:', error);
      }
    });
    
    if (isVerbose) console.log('💰 Scheduler dei payout PayPal avviato con successo (esecuzione giornaliera alle 10:00)');
  },
  
  /**
   * Avvia il servizio di pulizia automatica delle campagne marketing
   * Elimina campagne più vecchie di 12 mesi ogni giorno alle 03:00
   */
  startCampaignCleanupScheduler(): void {
    // Cron job che viene eseguito ogni giorno alle 03:00
    const isVerbose = process.env.LOG_SCHEDULER !== 'false';
    cron.schedule('0 0 3 * * *', async () => {
      const now = new Date();
      if (isVerbose) console.log('🗑️ Esecuzione del job di pulizia campagne marketing:', now.toISOString());
      
      try {
        // Calcola la data limite (12 mesi fa)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        // Elimina campagne più vecchie di 12 mesi
        const deletedCampaigns = await db
          .delete(marketingCampaigns)
          .where(lt(marketingCampaigns.createdAt, twelveMonthsAgo))
          .returning();
        
        if (isVerbose || deletedCampaigns.length > 0) {
          console.log(`🗑️ Pulizia campagne completata: ${deletedCampaigns.length} campagne eliminate (più vecchie di 12 mesi)`);
        }
        
        if (deletedCampaigns.length > 0) {
          console.log(`📋 Campagne eliminate: ${deletedCampaigns.map(c => c.title).join(', ')}`);
        }
      } catch (error) {
        console.error('❌ Errore nell\'esecuzione del job di pulizia campagne:', error);
      }
    });
    
    if (isVerbose) console.log('🗑️ Scheduler di pulizia campagne avviato con successo (esecuzione giornaliera alle 03:00)');
  },
  
  /**
   * Possibilità di aggiungere altre pianificazioni come:
   * - Report settimanali
   * - Backup automatici
   * ecc.
   */
};

/**
 * Avvia tutti i servizi pianificati all'inizializzazione dell'applicazione
 */
export function initializeSchedulers(): void {
  schedulerService.startReminderScheduler();
  schedulerService.startPayoutScheduler();
  schedulerService.startCampaignCleanupScheduler();
  if (process.env.LOG_SCHEDULER !== 'false') console.log('Tutti gli scheduler inizializzati');
}