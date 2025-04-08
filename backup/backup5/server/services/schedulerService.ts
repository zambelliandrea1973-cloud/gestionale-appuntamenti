import cron from 'node-cron';
import { notificationService } from './notificationService';

/**
 * Servizio per la pianificazione di attività ricorrenti
 */
export const schedulerService = {
  /**
   * Avvia il servizio di pianificazione dei promemoria degli appuntamenti
   * Verifica ogni giorno alle 10:00 gli appuntamenti di domani e invia i promemoria
   */
  startReminderScheduler(): void {
    // Cron job che viene eseguito ogni giorno alle 10:00
    // Formato cron: second(0-59) minute(0-59) hour(0-23) day-of-month(1-31) month(1-12) day-of-week(0-6, 0=Sunday)
    cron.schedule('0 0 10 * * *', async () => {
      console.log('Esecuzione del job di promemoria appuntamenti:', new Date().toISOString());
      
      try {
        // Elabora i promemoria per gli appuntamenti di domani
        const sentCount = await notificationService.processReminders();
        console.log(`Job completato: inviati ${sentCount} promemoria`);
      } catch (error) {
        console.error('Errore nell\'esecuzione del job di promemoria:', error);
      }
    });
    
    console.log('Scheduler dei promemoria avviato con successo');
  },
  
  /**
   * Possibilità di aggiungere altre pianificazioni come:
   * - Report settimanali
   * - Pulizia dati vecchi
   * - Backup automatici
   * ecc.
   */
};

/**
 * Avvia tutti i servizi pianificati all'inizializzazione dell'applicazione
 */
export function initializeSchedulers(): void {
  schedulerService.startReminderScheduler();
  console.log('Tutti gli scheduler inizializzati');
}