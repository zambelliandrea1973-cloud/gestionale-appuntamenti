import cron from 'node-cron';
import { notificationService } from './notificationService';

/**
 * Servizio per la pianificazione di attività ricorrenti
 */
export const schedulerService = {
  /**
   * Avvia il servizio di pianificazione dei promemoria degli appuntamenti
   * Verifica ogni ora gli appuntamenti delle prossime 24-25 ore e invia i promemoria 
   */
  startReminderScheduler(): void {
    // Cron job che viene eseguito ogni ora (al minuto 0)
    // Formato cron: second(0-59) minute(0-59) hour(0-23) day-of-month(1-31) month(1-12) day-of-week(0-6, 0=Sunday)
    cron.schedule('0 0 * * * *', async () => {
      const now = new Date();
      console.log('Esecuzione del job di promemoria appuntamenti:', now.toISOString());
      
      try {
        // Elabora i promemoria per gli appuntamenti delle prossime 24-25 ore
        const sentCount = await notificationService.processReminders();
        console.log(`Job completato: inviati ${sentCount} promemoria`);
      } catch (error) {
        console.error('Errore nell\'esecuzione del job di promemoria:', error);
      }
    });
    
    // Eseguiamo il job immediatamente all'avvio per verificare eventuali promemoria pendenti
    setTimeout(async () => {
      try {
        console.log('Esecuzione immediata del job di promemoria all\'avvio del server');
        const sentCount = await notificationService.processReminders();
        console.log(`Job iniziale completato: inviati ${sentCount} promemoria`);
      } catch (error) {
        console.error('Errore nell\'esecuzione iniziale del job di promemoria:', error);
      }
    }, 5000); // Esegui dopo 5 secondi dall'avvio per permettere alle connessioni di stabilizzarsi
    
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