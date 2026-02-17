/**
 * AutoRestartService - Servizio avanzato per il riavvio automatico dell'applicazione
 * Monitora l'applicazione e la riavvia automaticamente se rileva problemi
 * come blocchi, utilizzo elevato della memoria o timeout nelle richieste
 */

import axios from 'axios';
import { exec } from 'child_process';
import * as os from 'os';
import fs from 'fs';
import path from 'path';

interface RestartLogEntry {
  timestamp: string;
  reason: string;
  memoryUsage?: any;
  systemLoad?: any;
  uptime?: number;
}

class AutoRestartService {
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minuti
  private readonly MEMORY_THRESHOLD = 0.85; // 85% della memoria disponibile
  private readonly CPU_THRESHOLD = 0.9; // 90% di carico CPU
  private readonly RESPONSE_TIMEOUT = 10000; // 10 secondi di timeout per le risposte
  private readonly RESTART_COOLDOWN = 15 * 60 * 1000; // 15 minuti di cooldown tra riavvii
  
  private checkTimer: NodeJS.Timeout | null = null;
  private lastRestartTime: number = 0;
  private restartAttempts: number = 0;
  private restartLogs: RestartLogEntry[] = [];
  private logFile: string;
  private enabled: boolean = true;
  
  constructor() {
    this.logFile = path.join(process.cwd(), 'restart_logs.json');
    this.loadLogs();
    console.log('Servizio di riavvio automatico inizializzato');
  }
  
  /**
   * Avvia il monitoraggio dell'applicazione
   */
  start(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    
    this.checkTimer = setInterval(() => this.performHealthCheck(), this.CHECK_INTERVAL);
    console.log(`Monitoraggio applicazione avviato, verifica ogni ${this.CHECK_INTERVAL / 60000} minuti`);
  }
  
  /**
   * Ferma il monitoraggio dell'applicazione
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    console.log('Monitoraggio applicazione fermato');
  }
  
  /**
   * Abilita o disabilita il riavvio automatico
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`Riavvio automatico ${enabled ? 'abilitato' : 'disabilitato'}`);
    
    if (enabled && !this.checkTimer) {
      this.start();
    } else if (!enabled && this.checkTimer) {
      this.stop();
    }
  }
  
  /**
   * Esegue un controllo di salute completo dell'applicazione
   */
  private async performHealthCheck(): Promise<void> {
    console.log('Esecuzione controllo di salute completo...');
    
    try {
      // 1. Verifica lo stato dell'API
      const apiHealthy = await this.checkApiHealth();
      
      // 2. Verifica l'utilizzo delle risorse
      const resourcesHealthy = this.checkResourceUsage();
      
      // Se entrambi i controlli passano, tutto ok
      if (apiHealthy && resourcesHealthy) {
        console.log('Controllo di salute completato: sistema in buono stato');
        
        // Resetta i tentativi di riavvio dopo un certo periodo di stabilità
        if (Date.now() - this.lastRestartTime > this.RESTART_COOLDOWN * 2) {
          if (this.restartAttempts > 0) {
            console.log(`Reset dei tentativi di riavvio da ${this.restartAttempts} a 0 dopo un periodo di stabilità`);
            this.restartAttempts = 0;
          }
        }
        
        return;
      }
      
      // Se fallisce uno dei controlli, considera il riavvio
      const reason = !apiHealthy 
        ? 'API non risponde' 
        : 'Utilizzo risorse eccessivo';
      
      this.considerRestart(reason);
    } catch (error) {
      console.error('Errore durante il controllo di salute:', error);
      this.considerRestart('Errore nel controllo di salute');
    }
  }
  
  /**
   * Verifica la salute dell'API
   */
  private async checkApiHealth(): Promise<boolean> {
    try {
      const response = await axios.get('http://localhost:5000/api/health', {
        timeout: this.RESPONSE_TIMEOUT,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      return response.status === 200 && response.data.status === 'OK';
    } catch (error) {
      console.error('Errore nella verifica dell\'API:', error);
      return false;
    }
  }
  
  /**
   * Verifica l'utilizzo delle risorse del sistema
   */
  private checkResourceUsage(): boolean {
    try {
      // Verifica l'utilizzo della memoria
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = (totalMem - freeMem) / totalMem;
      
      // Verifica il carico della CPU
      const cpuLoad = os.loadavg()[0] / os.cpus().length;
      
      const memoryOk = memUsage < this.MEMORY_THRESHOLD;
      const cpuOk = cpuLoad < this.CPU_THRESHOLD;
      
      if (!memoryOk) {
        console.warn(`Utilizzo memoria elevato: ${(memUsage * 100).toFixed(1)}%`);
      }
      
      if (!cpuOk) {
        console.warn(`Carico CPU elevato: ${(cpuLoad * 100).toFixed(1)}%`);
      }
      
      return memoryOk && cpuOk;
    } catch (error) {
      console.error('Errore nella verifica dell\'utilizzo delle risorse:', error);
      return false; // In caso di errore, considera il sistema non in salute
    }
  }
  
  /**
   * Valuta se riavviare l'applicazione in base allo stato corrente
   */
  private considerRestart(reason: string): void {
    if (!this.enabled) {
      console.log(`Riavvio necessario per: ${reason}, ma il riavvio automatico è disabilitato`);
      return;
    }
    
    const now = Date.now();
    const timeSinceLastRestart = now - this.lastRestartTime;
    
    // Verifica se siamo nel periodo di cooldown
    if (timeSinceLastRestart < this.RESTART_COOLDOWN) {
      console.log(`Riavvio necessario, ma siamo nel periodo di cooldown (${Math.round(timeSinceLastRestart / 60000)}/${Math.round(this.RESTART_COOLDOWN / 60000)} minuti)`);
      return;
    }
    
    // Limita il numero massimo di tentativi di riavvio
    if (this.restartAttempts >= 3 && timeSinceLastRestart < this.RESTART_COOLDOWN * 3) {
      console.log(`Troppi tentativi di riavvio (${this.restartAttempts}), sistema potenzialmente instabile. Attendi intervento manuale.`);
      return;
    }
    
    console.log(`Riavvio automatico in corso... Motivo: ${reason}`);
    this.restartApplication(reason);
  }
  
  /**
   * Riavvia l'applicazione
   */
  private restartApplication(reason: string): void {
    try {
      // Aggiorna lo stato
      this.lastRestartTime = Date.now();
      this.restartAttempts++;
      
      // Registra il riavvio
      const logEntry: RestartLogEntry = {
        timestamp: new Date().toISOString(),
        reason,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        systemLoad: os.loadavg()
      };
      
      this.restartLogs.push(logEntry);
      this.saveLogs();
      
      // Esegui il riavvio effettivo
      console.log(`Esecuzione riavvio, tentativo #${this.restartAttempts}...`);
      
      // In Replit, terminare il processo è sufficiente
      // Il sistema riavvierà automaticamente l'applicazione
      console.log('Terminazione processo per riavvio...');
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (error) {
      console.error('Errore durante il riavvio dell\'applicazione:', error);
    }
  }
  
  /**
   * Carica i log dei riavvii precedenti
   */
  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const data = fs.readFileSync(this.logFile, 'utf8');
        this.restartLogs = JSON.parse(data);
        
        // Carica l'ultimo timestamp di riavvio
        if (this.restartLogs.length > 0) {
          const lastLog = this.restartLogs[this.restartLogs.length - 1];
          this.lastRestartTime = new Date(lastLog.timestamp).getTime();
        }
        
        console.log(`Caricati ${this.restartLogs.length} log di riavvio`);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei log di riavvio:', error);
      this.restartLogs = [];
    }
  }
  
  /**
   * Salva i log dei riavvii
   */
  private saveLogs(): void {
    try {
      // Mantieni solo gli ultimi 50 log per evitare file troppo grandi
      if (this.restartLogs.length > 50) {
        this.restartLogs = this.restartLogs.slice(-50);
      }
      
      fs.writeFileSync(this.logFile, JSON.stringify(this.restartLogs, null, 2));
    } catch (error) {
      console.error('Errore nel salvataggio dei log di riavvio:', error);
    }
  }
  
  /**
   * Ottiene i log dei riavvii
   */
  getRestartLogs(): RestartLogEntry[] {
    return [...this.restartLogs];
  }
  
  /**
   * Forza un riavvio manuale
   */
  forceRestart(reason: string = 'Riavvio manuale'): void {
    console.log(`Riavvio manuale forzato: ${reason}`);
    this.restartApplication(reason);
  }
}

// Esporta un'istanza singleton
export const autoRestartService = new AutoRestartService();