/**
 * PersistenceService - Advanced service to keep the application alive on Replit
 * This service implementa diverse tecniche per evitare che l'applicazione venga sospesa
 * 
 * 1. Maintains constant activity with lightweight background operations
 * 2. Connects to an external ping service (UptimeRobot)
 * 3. Avoids application suspension using Replit-specific techniques
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

interface PersistenceOptions {
  pingInterval: number;          // Intervallo tra i ping in millisecondi
  activityInterval: number;      // Interval between activities in milliseconds
  maxRetries: number;            // Maximum number of reconnection attempts
  retryBackoffFactor: number;    // Backoff factor for retries (e.g. 1.5 = increases by 50% each attempt)
  debugLog: boolean;             // Enable detailed logs
}

const DEFAULT_OPTIONS: PersistenceOptions = {
  pingInterval: 30 * 1000,       // 30 seconds
  activityInterval: 60 * 1000,   // 1 minute
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
    
    // Start the timer per l'uptime
    setInterval(() => {
      if (this.isActive) {
        this.uptimeMinutes++;
        if (this.uptimeMinutes % 60 === 0) {
          this.log(`Persistence service active for ${this.uptimeMinutes / 60} ore`);
        }
      }
    }, 60 * 1000);
    
    this.log('Persistence service initialized');
  }
  
  /**
   * Start the service with all sue componenti
   */
  start(healthEndpoint: string = '/api/health'): void {
    this.isActive = true;
    this.healthEndpoint = healthEndpoint;
    
    // Determine l'URL di healthcheck basato su Replit
    this.determineApplicationUrl().then(baseUrl => {
      this.healthcheckUrl = baseUrl + this.healthEndpoint;
      this.log(`URL di healthcheck configurato: ${this.healthcheckUrl}`);
      
      // Start i ping regolari
      this.startRegularPings();
      
      // Start background activities
      this.startBackgroundActivity();
      
      // Register on application shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());
    }).catch(error => {
      this.logError('Errore nel determinare l\'URL dell\'applicazione:', error);
    });
  }
  
  /**
   * Stop the service
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
   * Start i ping regolari
   */
  private startRegularPings(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    
    this.pingTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logError('Error during health ping:', error);
        this.handlePingFailure();
      }
    }, this.options.pingInterval);
    
    this.log(`Avviati ping regolari ogni ${this.options.pingInterval / 1000} secondi`);
  }
  
  /**
   * Performs a health check via ping
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
          this.log('Ping di salute completato successfully');
        }
        
        // Optionally write also to file to keep a history
        this.appendToLog('ping_success', {
          timestamp,
          uptime: this.uptimeMinutes
        });
      } else {
        this.logError(`Ping di salute fallito con status: ${response.status}`);
        this.handlePingFailure();
      }
    } catch (error) {
      this.logError('Error during health ping:', error);
      this.handlePingFailure();
    }
  }
  
  /**
   * Handle a ping failure
   */
  private handlePingFailure(): void {
    this.pingFailureCount++;
    this.log(`Ping fallito (${this.pingFailureCount}/${this.options.maxRetries})`);
    
    // if the number of consecutive failures exceeds the threshold, try to reactivate
    if (this.pingFailureCount >= this.options.maxRetries) {
      this.log('Troppi fallimenti consecutivi, tentativo di riattivazione dell\'applicazione...');
      this.attemptWakeup();
      this.pingFailureCount = 0; // Reset the counter after the attempt
    }
  }
  
  /**
   * Attempt di riattivare l'applicazione If risponde
   */
  private async attemptWakeup(): Promise<void> {
    this.log('Tentativo di riattivazione dell\'applicazione...');
    
    // Save the current state before the attempt
    this.appendToLog('wakeup_attempt', {
      timestamp: new Date().toISOString(),
      uptime: this.uptimeMinutes,
      pingFailures: this.pingFailureCount
    });
    
    // Execute a ping on an external endpoint to keep the process alive
    try {
      await axios.get('https://www.google.com', { timeout: 5000 });
      this.log('Connessione a Internet attiva');
    } catch (error) {
      this.logError('Error verifying internet connectivity:', error);
    }
    
    // Execute a file write to "wake up" the filesystem
    try {
      const wakeupFile = path.join(process.cwd(), '.wakeup');
      fs.writeFileSync(wakeupFile, new Date().toISOString());
      this.log('File di wakeup scritto successfully');
    } catch (error) {
      this.logError('Error writing wakeup file:', error);
    }
    
    // Execute a small CPU operation to "wake up" the processor
    const startTime = Date.now();
    let counter = 0;
    for (let i = 0; i < 1000000; i++) {
      counter += i;
    }
    const duration = Date.now() - startTime;
    this.log(`Operazione CPU completata in ${duration}ms (risultato: ${counter})`);
  }
  
  /**
   * Start background activities to keep the application alive
   */
  private startBackgroundActivity(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
    
    // Light background activities to keep the application alive
    this.activityTimer = setInterval(() => {
      try {
        const timestamp = new Date().toISOString();
        
        // Execute a small I/O operation
        const activityFile = path.join(process.cwd(), '.activity');
        fs.writeFileSync(activityFile, timestamp);
        
        // Execute a small memory operation
        const buffer = Buffer.allocUnsafe(1024); // 1KB
        buffer.fill(0);
        
        if (this.options.debugLog) {
          this.log('Attività di background completata');
        }
      } catch (error) {
        this.logError('Error in background activity:', error);
      }
    }, this.options.activityInterval);
    
    this.log(`Background activities started every ${this.options.activityInterval / 1000} seconds`);
  }
  
  /**
   * Determine the application URL based on the Replit environment
   */
  private async determineApplicationUrl(): Promise<string> {
    // First try to get the URL from Replit
    const replitHostname = process.env.REPL_SLUG;
    const replitOwner = process.env.REPL_OWNER;
    
    if (replitHostname && replitOwner) {
      return `https://${replitHostname}.${replitOwner}.repl.co`;
    }
    
    // otherwise utilizza localhost
    return 'http://localhost:5000';
  }
  
  /**
   * Write an entry to the service log
   */
  private log(message: string): void {
    console.log(`[PersistenceService] ${message}`);
  }
  
  /**
   * Write an error to the service log
   */
  private logError(message: string, error?: any): void {
    console.error(`[PersistenceService] ${message}`, error || '');
  }
  
  /**
   * Add an entry to the log file
   */
  private appendToLog(type: string, data: any): void {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, `persistence_${type}.log`);
      
      // Create the directory if it exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Write to the log file
      const logEntry = `${new Date().toISOString()}\t${JSON.stringify(data)}\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      this.logError(`Error writing log for ${type}:`, error);
    }
  }
  
  /**
   * Get the current status of the service
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

// Export a singleton instance
export const persistenceService = new PersistenceService();