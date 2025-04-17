/**
 * Servizio per mantenere l'applicazione attiva
 * Implementa un meccanismo di auto-ping per evitare che l'applicazione vada in sospensione
 */

import axios from 'axios';
import http from 'http';

class KeepAliveService {
  private interval: NodeJS.Timeout | null = null;
  private pingInterval = 5 * 60 * 1000; // 5 minuti in millisecondi
  private appUrl: string = '';
  private isActive: boolean = false;

  /**
   * Inizializza il servizio con l'URL dell'applicazione
   */
  initialize(server: http.Server) {
    if (this.isActive) {
      console.log('Il servizio keep-alive è già attivo');
      return;
    }

    // Determina l'URL dell'applicazione
    const address = server.address();
    if (address && typeof address !== 'string') {
      const port = address.port;
      this.appUrl = `http://localhost:${port}`;
      
      console.log(`Servizio keep-alive inizializzato con URL: ${this.appUrl}`);
      this.startPinging();
    } else {
      console.error('Impossibile determinare l\'indirizzo del server per il servizio keep-alive');
    }
  }

  /**
   * Avvia il processo di ping automatico
   */
  private startPinging() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.isActive = true;
    console.log(`Avvio del processo di ping ogni ${this.pingInterval / 1000} secondi`);
    
    // Esegui immediatamente il primo ping
    this.pingHealthCheck();

    // Pianifica ping regolari
    this.interval = setInterval(() => {
      this.pingHealthCheck();
    }, this.pingInterval);
  }

  /**
   * Esegue un ping all'endpoint di health check
   */
  private async pingHealthCheck() {
    try {
      const response = await axios.get(`${this.appUrl}/api/health`);
      if (response.status === 200) {
        console.log(`[${new Date().toISOString()}] Health check riuscito: l'applicazione è attiva`);
      } else {
        console.warn(`Health check ha risposto con status: ${response.status}`);
      }
    } catch (error) {
      console.error('Errore durante il ping di health check:', error);
    }
  }

  /**
   * Ferma il processo di ping automatico
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isActive = false;
      console.log('Servizio keep-alive fermato');
    }
  }
}

export const keepAliveService = new KeepAliveService();