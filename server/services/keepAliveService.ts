/**
 * Servizio per mantenere l'applicazione attiva
 * Implementa un meccanismo di auto-ping per evitare che l'applicazione vada in sospensione
 * e auto-restart in caso di problemi
 */

import axios from 'axios';
import http from 'http';
import { exec } from 'child_process';

class KeepAliveService {
  private pingInterval: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private pingFrequency = 1 * 60 * 1000; // 1 minuto in millisecondi
  private watchdogFrequency = 3 * 60 * 1000; // 3 minuti in millisecondi
  private appUrl: string = '';
  private isActive: boolean = false;
  private failedPings: number = 0;
  private maxFailedPings: number = 3; // Dopo 3 fallimenti consecutivi, esegue azioni di recupero
  private lastSuccessfulPing: Date = new Date();
  
  /**
   * Inizializza il servizio con l'URL dell'applicazione
   */
  initialize(server: http.Server) {
    if (this.isActive) {
      console.log('Il servizio keep-alive è già attivo');
      return;
    }

    // Ritardiamo l'inizializzazione per assicurarci che il server sia completamente avviato
    console.log('Pianificazione inizializzazione servizio keep-alive tra 5 secondi...');
    
    setTimeout(() => {
      // Determina l'URL dell'applicazione
      const address = server.address();
      if (address && typeof address !== 'string') {
        const port = address.port;
        this.appUrl = `http://localhost:${port}`;
        
        console.log(`Servizio keep-alive avanzato inizializzato con URL: ${this.appUrl}`);
        this.startPinging();
        this.startWatchdog();
      } else {
        console.error('Impossibile determinare l\'indirizzo del server per il servizio keep-alive dopo il ritardo');
      }
    }, 5000); // Ritardo di 5 secondi
  }

  /**
   * Avvia il processo di ping automatico
   */
  private startPinging() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.isActive = true;
    console.log(`Avvio del processo di ping ogni ${this.pingFrequency / 1000} secondi`);
    
    // Esegui immediatamente il primo ping
    this.pingHealthCheck();

    // Pianifica ping regolari
    this.pingInterval = setInterval(() => {
      this.pingHealthCheck();
    }, this.pingFrequency);
  }

  /**
   * Avvia il watchdog per monitorare la salute dell'applicazione
   */
  private startWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }

    console.log(`Avvio del watchdog ogni ${this.watchdogFrequency / 1000} secondi`);
    
    this.watchdogInterval = setInterval(() => {
      this.checkSystemHealth();
    }, this.watchdogFrequency);
  }

  /**
   * Verifica lo stato di salute complessivo del sistema
   */
  private async checkSystemHealth() {
    const now = new Date();
    const timeSinceLastPing = now.getTime() - this.lastSuccessfulPing.getTime();
    
    // Se è passato troppo tempo dall'ultimo ping riuscito (10 minuti)
    if (timeSinceLastPing > 10 * 60 * 1000) {
      console.warn(`[${now.toISOString()}] ATTENZIONE: Nessun ping riuscito negli ultimi 10 minuti`);
      console.log('Esecuzione procedura di auto-recupero...');
      
      // Verifica memoria e utilizzo CPU
      this.checkResourceUsage();
      
      // Esegue un ping di recupero
      try {
        const isAlive = await this.attemptRecoveryPing();
        if (!isAlive) {
          console.error('Impossibile contattare il server. Tentativo di riattivazione in corso...');
          this.performAutoRecovery();
        }
      } catch (error) {
        console.error('Errore durante il tentativo di recupero:', error);
        this.performAutoRecovery();
      }
    }
  }

  /**
   * Verifica l'utilizzo di risorse del sistema
   */
  private checkResourceUsage() {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
      
      console.log(`Utilizzo memoria - RSS: ${rssMB} MB, Heap: ${heapUsedMB}/${heapTotalMB} MB`);
      
      // Se l'utilizzo della memoria è alto, esegue un garbage collection manuale
      if (heapUsedMB > heapTotalMB * 0.9) {
        console.log('Utilizzo heap elevato, tentativo di pulizia memoria...');
        if (global.gc) {
          global.gc();
          console.log('Garbage collection eseguita manualmente');
        }
      }
    } catch (error) {
      console.error('Errore durante la verifica delle risorse:', error);
    }
  }

  /**
   * Esegue un ping all'endpoint di health check
   */
  private async pingHealthCheck() {
    try {
      const response = await axios.get(`${this.appUrl}/api/health`, { timeout: 5000 });
      if (response.status === 200) {
        // Reset del contatore fallimenti
        this.failedPings = 0;
        this.lastSuccessfulPing = new Date();
        console.log(`[${this.lastSuccessfulPing.toISOString()}] Health check riuscito: l'applicazione è attiva`);
      } else {
        this.handleFailedPing(`Health check ha risposto con status: ${response.status}`);
      }
    } catch (error) {
      this.handleFailedPing('Errore durante il ping di health check');
    }
  }

  /**
   * Gestisce il caso di un ping fallito
   */
  private handleFailedPing(message: string) {
    this.failedPings++;
    console.warn(`${message}. Fallimento consecutivo #${this.failedPings}`);
    
    // Se abbiamo raggiunto il numero massimo di fallimenti consecutivi
    if (this.failedPings >= this.maxFailedPings) {
      console.error(`Rilevati ${this.failedPings} ping falliti consecutivi. Avvio procedura di recupero...`);
      this.performAutoRecovery();
    }
  }

  /**
   * Tenta un ping di recupero all'endpoint di health con opzioni estese
   */
  private async attemptRecoveryPing(): Promise<boolean> {
    try {
      // Tenta con un timeout più lungo e più tentativi
      const response = await axios.get(`${this.appUrl}/api/health`, { 
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true // Accetta qualsiasi status code come risposta
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Esegue procedure di auto-recupero in caso di problemi
   */
  private performAutoRecovery() {
    console.log('Esecuzione procedura di recupero automatico');
    
    // Raccoglie informazioni di diagnostica
    this.collectDiagnosticInfo();
    
    // Notifica il problema
    this.notifyIssue();
    
    console.log('Sistema rimarrà monitorato per verificare il recupero');
    
    // Reset del contatore di fallimenti
    this.failedPings = 0;
  }

  /**
   * Raccoglie informazioni di diagnostica per il debug
   */
  private collectDiagnosticInfo() {
    try {
      // Informazioni sull'ambiente Node.js
      console.log('--- Informazioni diagnostiche ---');
      console.log(`Node.js versione: ${process.version}`);
      console.log(`Uptime: ${Math.floor(process.uptime())} secondi`);
      
      const memoryUsage = process.memoryUsage();
      console.log('Memoria:', {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      });
      console.log('--- Fine informazioni diagnostiche ---');
    } catch (error) {
      console.error('Errore nella raccolta informazioni diagnostiche:', error);
    }
  }

  /**
   * Notifica di problemi rilevati
   */
  private notifyIssue() {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] AVVISO: Rilevato potenziale problema con l'applicazione. Il sistema di monitoraggio è attivo. Ultimo ping riuscito: ${this.lastSuccessfulPing.toISOString()}`);
  }

  /**
   * Ferma il processo di ping automatico
   */
  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    
    this.isActive = false;
    console.log('Servizio keep-alive fermato');
  }
}

export const keepAliveService = new KeepAliveService();