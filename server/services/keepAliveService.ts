/**
 * Servizio avanzato per mantenere l'applicazione attiva
 * Implementa meccanismi di auto-ping multipli, rilevamento problemi
 * e auto-recupero per garantire la massima disponibilità del servizio
 * 
 * Versione 2.0: Sistema migliorato per evitare disconnessioni periodiche
 */

import axios from 'axios';
import http from 'http';
import { exec } from 'child_process';
import os from 'os';

class KeepAliveService {
  private pingInterval: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private externalPingInterval: NodeJS.Timeout | null = null;
  
  // Frequenze di controllo ottimizzate
  private pingFrequency = 30 * 1000; // 30 secondi in millisecondi (ridotto per ping più frequenti)
  private watchdogFrequency = 2 * 60 * 1000; // 2 minuti in millisecondi (ridotto per controlli più frequenti)
  private externalPingFrequency = 5 * 60 * 1000; // 5 minuti per ping esterni
  
  private appUrl: string = '';
  private publicUrl: string = ''; // URL pubblico dell'applicazione
  private isActive: boolean = false;
  private failedPings: number = 0;
  private maxFailedPings: number = 3; // Dopo 3 fallimenti consecutivi, esegue azioni di recupero
  private lastSuccessfulPing: Date = new Date();
  private appStartTime: Date = new Date();
  private consecutiveMemoryProblems: number = 0;
  private memoryUsageHistory: number[] = [];
  private isRecoveryInProgress: boolean = false;
  
  /**
   * Inizializza il servizio con l'URL dell'applicazione
   */
  initialize(server: http.Server) {
    if (this.isActive) {
      console.log('Il servizio keep-alive è già attivo');
      return;
    }

    this.appStartTime = new Date();
    
    // Ritardiamo l'inizializzazione per assicurarci che il server sia completamente avviato
    console.log('Pianificazione inizializzazione servizio keep-alive tra 5 secondi...');
    
    setTimeout(() => {
      // Determina l'URL dell'applicazione
      const address = server.address();
      if (address && typeof address !== 'string') {
        const port = address.port;
        this.appUrl = `http://localhost:${port}`;
        
        // Determina l'URL pubblico dall'ambiente o usa un fallback
        const REPLIT_SLUG = process.env.REPLIT_SLUG;
        const REPLIT_OWNER = process.env.REPLIT_OWNER;
        
        if (REPLIT_SLUG && REPLIT_OWNER) {
          this.publicUrl = `https://${REPLIT_SLUG}.${REPLIT_OWNER}.repl.co`;
          console.log(`URL pubblico rilevato: ${this.publicUrl}`);
        } else {
          // Usa localhost come fallback se non siamo su Replit
          this.publicUrl = this.appUrl;
          console.log(`URL pubblico non rilevato, uso locale: ${this.publicUrl}`);
        }
        
        console.log(`Servizio keep-alive avanzato 2.0 inizializzato con URL interno: ${this.appUrl}`);
        this.startPinging();
        this.startWatchdog();
        this.startExternalPing();
        this.registerProcessHandlers();
      } else {
        console.error('Impossibile determinare l\'indirizzo del server per il servizio keep-alive dopo il ritardo');
      }
    }, 5000); // Ritardo di 5 secondi
  }

  /**
   * Registra gestori per eventi di processo
   */
  private registerProcessHandlers() {
    // Gestisce errori non catturati
    process.on('uncaughtException', (error) => {
      console.error('Errore non catturato nel processo:', error);
      this.collectDiagnosticInfo();
      // Non terminiamo il processo per mantenere l'app attiva
    });
    
    // Gestisce rifiuti di promise non gestiti
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Promise non gestita rifiutata:', reason);
      // Non terminiamo il processo per mantenere l'app attiva
    });
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
   * Avvia il processo di ping esterno
   * Questo aiuta a mantenere attiva la connessione a Replit
   */
  private startExternalPing() {
    if (this.externalPingInterval) {
      clearInterval(this.externalPingInterval);
    }

    console.log(`Avvio del processo di ping esterno ogni ${this.externalPingFrequency / 1000} secondi`);
    
    // Tentare di fare ping a se stessi attraverso l'URL pubblico
    this.externalPingInterval = setInterval(() => {
      this.pingExternalEndpoint();
    }, this.externalPingFrequency);
  }

  /**
   * Pinga l'endpoint pubblico per mantenere attiva la connessione
   */
  private async pingExternalEndpoint() {
    if (!this.publicUrl) return;
    
    try {
      console.log(`Esecuzione ping esterno a ${this.publicUrl}/api/health`);
      const response = await axios.get(`${this.publicUrl}/api/health`, { 
        timeout: 10000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Keep-Alive': 'true' // Header speciale per identificare richieste di keepalive
        }
      });
      
      if (response.status === 200) {
        console.log(`[${new Date().toISOString()}] Ping esterno riuscito, servizio raggiungibile pubblicamente`);
      } else {
        console.warn(`Ping esterno ha risposto con status: ${response.status}`);
      }
    } catch (error) {
      console.warn(`Errore durante il ping esterno: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      // Non intraprendiamo azioni di recupero basate solo sul ping esterno
      // perché potrebbe fallire per motivi di rete esterni al nostro controllo
    }
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
    const uptime = process.uptime();
    
    // Log di uptime periodico per monitoraggio
    if (uptime % 3600 < 10) { // Approssimativamente ogni ora
      const uptimeHours = Math.floor(uptime / 3600);
      console.log(`[INFO] Uptime applicazione: ${uptimeHours} ore e ${Math.floor((uptime % 3600) / 60)} minuti`);
    }
    
    // Verifica periodica memoria e utilizzo CPU
    this.checkResourceUsage();
    
    // Se è passato troppo tempo dall'ultimo ping riuscito (5 minuti)
    if (timeSinceLastPing > 5 * 60 * 1000) {
      console.warn(`[${now.toISOString()}] ATTENZIONE: Nessun ping riuscito negli ultimi 5 minuti`);
      
      if (!this.isRecoveryInProgress) {
        console.log('Esecuzione procedura di auto-recupero...');
        this.isRecoveryInProgress = true;
        
        // Esegue un ping di recupero
        try {
          const isAlive = await this.attemptRecoveryPing();
          if (!isAlive) {
            console.error('Impossibile contattare il server. Tentativo di riattivazione in corso...');
            await this.performAutoRecovery();
          } else {
            console.log('Server recuperato con successo!');
          }
        } catch (error) {
          console.error('Errore durante il tentativo di recupero:', error);
          await this.performAutoRecovery();
        } finally {
          this.isRecoveryInProgress = false;
        }
      } else {
        console.log('Procedura di recupero già in corso, salto...');
      }
    }
  }

  /**
   * Verifica l'utilizzo di risorse del sistema con monitoraggio avanzato
   */
  private checkResourceUsage() {
    try {
      // Memoria
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
      
      // Registra storico uso memoria per rilevare perdite
      this.memoryUsageHistory.push(rssMB);
      if (this.memoryUsageHistory.length > 10) {
        this.memoryUsageHistory.shift();
      }
      
      // Informazioni sistema
      const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
      const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
      const memoryUsagePercent = Math.round((1 - (freeMemoryMB / totalMemoryMB)) * 100);
      
      // CPU load
      const cpuLoad = os.loadavg();
      
      console.log(`Utilizzo risorse - Mem: ${rssMB}/${totalMemoryMB} MB (${memoryUsagePercent}%), Heap: ${heapUsedMB}/${heapTotalMB} MB, CPU Load: ${cpuLoad[0].toFixed(2)}`);
      
      // Rileva potenziali perdite di memoria
      const isMemoryIncreasing = this.detectMemoryLeak();
      if (isMemoryIncreasing) {
        console.warn('ATTENZIONE: Possibile memory leak rilevato - la memoria continua ad aumentare');
        this.consecutiveMemoryProblems++;
      } else {
        this.consecutiveMemoryProblems = 0;
      }
      
      // Se l'utilizzo della memoria è alto o rilevata perdita persistente, esegue GC e potenziale riavvio
      if ((heapUsedMB > heapTotalMB * 0.85) || this.consecutiveMemoryProblems >= 3) {
        console.log('Utilizzo memoria elevato o perdita rilevata, avvio procedure di pulizia...');
        
        if (global.gc) {
          console.log('Esecuzione garbage collection manuale');
          global.gc();
          
          // Verifica l'effetto del GC
          setTimeout(() => {
            const afterGcMemory = process.memoryUsage();
            const afterHeapUsedMB = Math.round(afterGcMemory.heapUsed / 1024 / 1024);
            const memoryFreed = heapUsedMB - afterHeapUsedMB;
            
            console.log(`GC ha liberato ${memoryFreed} MB di memoria heap`);
            
            // Se GC non ha avuto effetto significativo, considera riavvio
            if (memoryFreed < 5 && this.consecutiveMemoryProblems >= 3) {
              console.warn('GC inefficace e problemi persistenti: considerare riavvio applicazione');
              // Nota: qui potremmo implementare un riavvio automatico se necessario
            }
          }, 1000);
        } else {
          console.log('GC non disponibile, impossibile forzare pulizia memoria');
        }
      }
    } catch (error) {
      console.error('Errore durante la verifica delle risorse:', error);
    }
  }
  
  /**
   * Rileva potenziali memory leak confrontando lo storico dell'utilizzo
   */
  private detectMemoryLeak(): boolean {
    if (this.memoryUsageHistory.length < 5) return false;
    
    // Consideriamo gli ultimi 5 campioni
    const recentSamples = this.memoryUsageHistory.slice(-5);
    
    // Controlla se la memoria è sempre in aumento
    let isIncreasing = true;
    for (let i = 1; i < recentSamples.length; i++) {
      if (recentSamples[i] <= recentSamples[i-1]) {
        isIncreasing = false;
        break;
      }
    }
    
    // Se è in aumento, verifica anche che l'incremento sia significativo
    if (isIncreasing) {
      const firstSample = recentSamples[0];
      const lastSample = recentSamples[recentSamples.length - 1];
      const percentIncrease = ((lastSample - firstSample) / firstSample) * 100;
      
      // Consideriamo significativo un aumento del 10% o più
      return percentIncrease >= 10;
    }
    
    return false;
  }

  /**
   * Esegue un ping all'endpoint di health check
   */
  private async pingHealthCheck() {
    try {
      const response = await axios.get(`${this.appUrl}/api/health`, { 
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache', 
          'Pragma': 'no-cache'
        }
      });
      
      if (response.status === 200) {
        // Reset del contatore fallimenti
        this.failedPings = 0;
        this.lastSuccessfulPing = new Date();
        
        // Log meno frequente per ridurre rumore nella console
        const minutes = this.lastSuccessfulPing.getMinutes();
        if (minutes % 5 === 0 || this.lastSuccessfulPing.getSeconds() < 10) {
          console.log(`[${this.lastSuccessfulPing.toISOString()}] Health check riuscito: l'applicazione è attiva`);
        }
      } else {
        this.handleFailedPing(`Health check ha risposto con status: ${response.status}`);
      }
    } catch (error) {
      let errorMessage = 'Errore durante il ping di health check';
      if (axios.isAxiosError(error) && error.message) {
        errorMessage += `: ${error.message}`;
      }
      this.handleFailedPing(errorMessage);
    }
  }

  /**
   * Gestisce il caso di un ping fallito con strategie di escalation graduali
   */
  private handleFailedPing(message: string) {
    this.failedPings++;
    
    // Escalation basata sul numero di fallimenti
    if (this.failedPings === 1) {
      console.warn(`${message}. Primo fallimento, continuo monitoraggio.`);
    } else if (this.failedPings < this.maxFailedPings) {
      console.warn(`${message}. Fallimento consecutivo #${this.failedPings} di ${this.maxFailedPings}.`);
    } else {
      console.error(`Rilevati ${this.failedPings} ping falliti consecutivi. Avvio procedura di recupero avanzata...`);
      this.performAutoRecovery();
    }
  }

  /**
   * Tenta un ping di recupero all'endpoint di health con opzioni estese
   */
  private async attemptRecoveryPing(): Promise<boolean> {
    console.log('Tentativo di ping di recupero con timeout esteso...');
    
    try {
      // Tenta con un timeout più lungo e più tentativi
      const response = await axios.get(`${this.appUrl}/api/health`, { 
        timeout: 15000, // Timeout più lungo per il recupero
        maxRedirects: 5,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Recovery-Attempt': 'true'
        },
        validateStatus: () => true // Accetta qualsiasi status code come risposta
      });
      
      console.log(`Ping di recupero ha risposto con status: ${response.status}`);
      return response.status === 200;
    } catch (error) {
      console.error('Ping di recupero fallito:', error instanceof Error ? error.message : 'Errore sconosciuto');
      return false;
    }
  }

  /**
   * Esegue procedure di auto-recupero in caso di problemi con approccio graduale
   */
  private async performAutoRecovery() {
    if (this.isRecoveryInProgress) {
      console.log('Procedura di recupero già in corso, salto...');
      return;
    }
    
    this.isRecoveryInProgress = true;
    console.log('Esecuzione procedura di recupero automatico avanzata');
    
    try {
      // Raccoglie informazioni di diagnostica
      this.collectDiagnosticInfo();
      
      // Esegue garbage collection se possibile
      if (global.gc) {
        console.log('Esecuzione garbage collection forzata come parte del recupero');
        global.gc();
      }
      
      // Verifica le connessioni di database attive
      this.checkDatabaseConnections();
      
      // Notifica il problema
      this.notifyIssue();
      
      console.log('Recovery completato. Sistema rimarrà monitorato per verificare il recupero');
    } catch (error) {
      console.error('Errore durante la procedura di recupero:', error);
    } finally {
      // Reset del contatore di fallimenti
      this.failedPings = 0;
      this.isRecoveryInProgress = false;
    }
  }

  /**
   * Verifica le connessioni di database attive
   */
  private checkDatabaseConnections() {
    // Questa funzione dovrebbe verificare lo stato delle connessioni al database
    // e potrebbe richiedere la chiusura e riapertura delle connessioni se necessario
    console.log('Verifica delle connessioni database...');
    // Implementazione reale dipende dal tipo di database utilizzato
  }

  /**
   * Raccoglie informazioni di diagnostica estese per il debug
   */
  private collectDiagnosticInfo() {
    try {
      console.log('--- Informazioni diagnostiche estese ---');
      
      // Info base
      console.log(`Node.js: ${process.version}`);
      console.log(`Uptime app: ${Math.floor((Date.now() - this.appStartTime.getTime()) / 1000)} secondi`);
      console.log(`Uptime processo: ${Math.floor(process.uptime())} secondi`);
      
      // Memoria
      const memoryUsage = process.memoryUsage();
      console.log('Memoria processo:', {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        arrayBuffers: `${Math.round((memoryUsage as any).arrayBuffers / 1024 / 1024)} MB`
      });
      
      // Info sistema
      console.log('Sistema:', {
        platform: process.platform,
        arch: process.arch,
        cpus: os.cpus().length,
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
        loadAvg: os.loadavg()
      });
      
      // Variabili ambiente cruciali (ma senza valori sensibili)
      console.log('Variabili ambiente:', {
        NODE_ENV: process.env.NODE_ENV,
        TZ: process.env.TZ,
        PORT: process.env.PORT,
        // Non loggare DB_URL o altre var sensibili
        DATABASE_EXISTS: !!process.env.DATABASE_URL
      });
      
      console.log('--- Fine informazioni diagnostiche ---');
    } catch (error) {
      console.error('Errore nella raccolta informazioni diagnostiche:', error);
    }
  }

  /**
   * Notifica di problemi rilevati con informazioni dettagliate
   */
  private notifyIssue() {
    const timestamp = new Date().toISOString();
    const uptimeHours = Math.floor(process.uptime() / 3600);
    const uptimeMinutes = Math.floor((process.uptime() % 3600) / 60);
    
    console.error(`[${timestamp}] AVVISO: Rilevato potenziale problema con l'applicazione.`);
    console.error(`Ultimo ping riuscito: ${this.lastSuccessfulPing.toISOString()}`);
    console.error(`Uptime attuale: ${uptimeHours}h ${uptimeMinutes}m`);
    console.error(`Il sistema di monitoraggio e auto-recupero è attivo. Continuazione monitoraggio...`);
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
    
    if (this.externalPingInterval) {
      clearInterval(this.externalPingInterval);
      this.externalPingInterval = null;
    }
    
    this.isActive = false;
    console.log('Servizio keep-alive fermato');
  }
}

export const keepAliveService = new KeepAliveService();