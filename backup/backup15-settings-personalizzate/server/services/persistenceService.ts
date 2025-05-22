/**
 * PersistenceService - Servizio avanzato per mantenere l'applicazione attiva su Replit
 * Questo servizio implementa diverse tecniche per evitare che l'applicazione venga sospesa
 * 
 * 1. Mantiene attività costante con operazioni leggere di background
 * 2. Si collega ad un servizio di ping esterno (UptimeRobot)
 * 3. Evita la sospensione dell'applicazione usando tecniche specifiche per Replit
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

interface PersistenceOptions {
  pingInterval: number;          // Intervallo tra i ping in millisecondi
  activityInterval: number;      // Intervallo tra le attività in millisecondi
  maxRetries: number;            // Numero massimo di tentativi di riconnessione
  retryBackoffFactor: number;    // Fattore di backoff per i tentativi (es. 1.5 = aumenta del 50% ad ogni tentativo)
  debugLog: boolean;             // Attiva i log dettagliati
}

const DEFAULT_OPTIONS: PersistenceOptions = {
  pingInterval: 30 * 1000,       // 30 secondi
  activityInterval: 60 * 1000,   // 1 minuto
  maxRetries: 5,
  retryBackoffFactor: 2,
  debugLog: true
};

class PersistenceService {
  private options: PersistenceOptions;
  private pingTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private lastSuccessfulPing: Date = new Date();
  private pingFailureCount: number = 0;
  private uptimeMinutes: number = 0;
  private isActive: boolean = false;
  private healthEndpoint: string = '/api/health';
  private healthcheckUrl: string = '';
  
  constructor(options: Partial<PersistenceOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Avvia il timer per l'uptime
    setInterval(() => {
      if (this.isActive) {
        this.uptimeMinutes++;
        if (this.uptimeMinutes % 60 === 0) {
          this.log(`Servizio persistence attivo da ${this.uptimeMinutes / 60} ore`);
        }
      }
    }, 60 * 1000);
    
    this.log('Servizio persistence inizializzato');
  }
  
  /**
   * Avvia il servizio con tutte le sue componenti
   */
  start(healthEndpoint: string = '/api/health'): void {
    this.isActive = true;
    this.healthEndpoint = healthEndpoint;
    
    // Determina l'URL di healthcheck basato su Replit
    this.determineApplicationUrl().then(baseUrl => {
      this.healthcheckUrl = baseUrl + this.healthEndpoint;
      this.log(`URL di healthcheck configurato: ${this.healthcheckUrl}`);
      
      // Avvia i ping regolari
      this.startRegularPings();
      
      // Avvia le attività di background
      this.startBackgroundActivity();
      
      // Registra alla chiusura dell'applicazione
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());
    }).catch(error => {
      this.logError('Errore nel determinare l\'URL dell\'applicazione:', error);
    });
  }
  
  /**
   * Ferma il servizio
   */
  stop(): void {
    this.isActive = false;
    
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    
    this.log('Servizio persistence fermato');
  }
  
  /**
   * Avvia i ping regolari
   */
  private startRegularPings(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    
    this.pingTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logError('Errore durante il ping di salute:', error);
        this.handlePingFailure();
      }
    }, this.options.pingInterval);
    
    this.log(`Avviati ping regolari ogni ${this.options.pingInterval / 1000} secondi`);
  }
  
  /**
   * Esegue un controllo di salute attraverso il ping
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const response = await axios.get(this.healthcheckUrl, {
        timeout: 5000,
        headers: {
          'X-Persistence-Service': 'true',
          'X-Timestamp': timestamp,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.status === 200) {
        this.lastSuccessfulPing = new Date();
        this.pingFailureCount = 0;
        
        if (this.options.debugLog) {
          this.log('Ping di salute completato con successo');
        }
        
        // Opzionalmente scrivi anche su file per avere uno storico
        this.appendToLog('ping_success', {
          timestamp,
          uptime: this.uptimeMinutes
        });
      } else {
        this.logError(`Ping di salute fallito con status: ${response.status}`);
        this.handlePingFailure();
      }
    } catch (error) {
      this.logError('Errore durante il ping di salute:', error);
      this.handlePingFailure();
    }
  }
  
  /**
   * Gestisce un fallimento del ping
   */
  private handlePingFailure(): void {
    this.pingFailureCount++;
    this.log(`Ping fallito (${this.pingFailureCount}/${this.options.maxRetries})`);
    
    // Se il numero di fallimenti consecutivi supera la soglia, prova a riattivare
    if (this.pingFailureCount >= this.options.maxRetries) {
      this.log('Troppi fallimenti consecutivi, tentativo di riattivazione dell\'applicazione...');
      this.attemptWakeup();
      this.pingFailureCount = 0; // Reset del contatore dopo il tentativo
    }
  }
  
  /**
   * Tenta di riattivare l'applicazione se non risponde
   */
  private async attemptWakeup(): Promise<void> {
    this.log('Tentativo di riattivazione dell\'applicazione...');
    
    // Salva lo stato corrente prima del tentativo
    this.appendToLog('wakeup_attempt', {
      timestamp: new Date().toISOString(),
      uptime: this.uptimeMinutes,
      pingFailures: this.pingFailureCount
    });
    
    // Esegue un ping su un endpoint esterno per mantenere il processo attivo
    try {
      await axios.get('https://www.google.com', { timeout: 5000 });
      this.log('Connessione a Internet attiva');
    } catch (error) {
      this.logError('Errore nella verifica di connettività a Internet:', error);
    }
    
    // Esegue una scrittura su file per "risvegliare" il filesystem
    try {
      const wakeupFile = path.join(process.cwd(), '.wakeup');
      fs.writeFileSync(wakeupFile, new Date().toISOString());
      this.log('File di wakeup scritto con successo');
    } catch (error) {
      this.logError('Errore nella scrittura del file di wakeup:', error);
    }
    
    // Esegue una piccola operazione di CPU per "risvegliare" il processore
    const startTime = Date.now();
    let counter = 0;
    for (let i = 0; i < 1000000; i++) {
      counter += i;
    }
    const duration = Date.now() - startTime;
    this.log(`Operazione CPU completata in ${duration}ms (risultato: ${counter})`);
  }
  
  /**
   * Avvia attività di background per mantenere l'applicazione attiva
   */
  private startBackgroundActivity(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
    
    // Attività leggere in background per mantenere l'applicazione attiva
    this.activityTimer = setInterval(() => {
      try {
        const timestamp = new Date().toISOString();
        
        // Esegue una piccola operazione di I/O
        const activityFile = path.join(process.cwd(), '.activity');
        fs.writeFileSync(activityFile, timestamp);
        
        // Esegue una piccola operazione di memoria
        const buffer = Buffer.allocUnsafe(1024); // 1KB
        buffer.fill(0);
        
        if (this.options.debugLog) {
          this.log('Attività di background completata');
        }
      } catch (error) {
        this.logError('Errore nell\'attività di background:', error);
      }
    }, this.options.activityInterval);
    
    this.log(`Avviate attività di background ogni ${this.options.activityInterval / 1000} secondi`);
  }
  
  /**
   * Determina l'URL dell'applicazione in base all'ambiente Replit
   */
  private async determineApplicationUrl(): Promise<string> {
    // Prova prima ad ottenere l'URL da Replit
    const replitHostname = process.env.REPL_SLUG;
    const replitOwner = process.env.REPL_OWNER;
    
    if (replitHostname && replitOwner) {
      return `https://${replitHostname}.${replitOwner}.repl.co`;
    }
    
    // Altrimenti utilizza localhost
    return 'http://localhost:5000';
  }
  
  /**
   * Scrive una voce nel log del servizio
   */
  private log(message: string): void {
    console.log(`[PersistenceService] ${message}`);
  }
  
  /**
   * Scrive un errore nel log del servizio
   */
  private logError(message: string, error?: any): void {
    console.error(`[PersistenceService] ${message}`, error || '');
  }
  
  /**
   * Aggiunge una voce al file di log
   */
  private appendToLog(type: string, data: any): void {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, `persistence_${type}.log`);
      
      // Crea la directory se non esiste
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Scrive nel file di log
      const logEntry = `${new Date().toISOString()}\t${JSON.stringify(data)}\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      this.logError(`Errore nella scrittura del log di ${type}:`, error);
    }
  }
  
  /**
   * Ottiene lo stato attuale del servizio
   */
  getStatus(): any {
    return {
      active: this.isActive,
      uptimeMinutes: this.uptimeMinutes,
      lastSuccessfulPing: this.lastSuccessfulPing.toISOString(),
      pingFailureCount: this.pingFailureCount,
      healthcheckUrl: this.healthcheckUrl
    };
  }
}

// Esporta un'istanza singleton
export const persistenceService = new PersistenceService();