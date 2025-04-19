/**
 * PingStatsService - Servizio per la gestione delle statistiche di ping
 * Questo servizio mantiene un registro dei ping ricevuti e salva le statistiche in un file JSON
 */

import fs from 'fs';
import path from 'path';

interface PingRecord {
  timestamp: string;
  status: string;
  source?: string;
  responseTime?: number;
  userAgent?: string;
}

interface PingStats {
  ping_history: PingRecord[];
  last_ping: string;
  ping_count: number;
  uptime_minutes: number;
  last_status: string;
}

class PingStatsService {
  private stats: PingStats;
  private statsFilePath: string;
  private maxHistorySize: number;
  private startTime: Date;
  private uptimeInterval: NodeJS.Timeout | null = null;
  
  constructor(maxHistorySize: number = 100) {
    this.statsFilePath = path.join(process.cwd(), 'ping_stats.json');
    this.maxHistorySize = maxHistorySize;
    this.startTime = new Date();
    
    // Carica le statistiche dal file JSON se esiste
    try {
      if (fs.existsSync(this.statsFilePath)) {
        const fileContent = fs.readFileSync(this.statsFilePath, 'utf8');
        this.stats = JSON.parse(fileContent);
        console.log('Statistiche di ping caricate da file');
      } else {
        this.stats = {
          ping_history: [],
          last_ping: '',
          ping_count: 0,
          uptime_minutes: 0,
          last_status: 'OK'
        };
        this.saveStats();
      }
    } catch (error) {
      console.error('Errore nel caricamento delle statistiche di ping:', error);
      this.stats = {
        ping_history: [],
        last_ping: '',
        ping_count: 0,
        uptime_minutes: 0,
        last_status: 'OK'
      };
      this.saveStats();
    }
    
    // Avvia il timer per incrementare il tempo di uptime
    this.startUptimeTracking();
  }
  
  /**
   * Avvia il tracciamento dell'uptime
   */
  private startUptimeTracking() {
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
    }
    
    this.uptimeInterval = setInterval(() => {
      this.stats.uptime_minutes++;
      if (this.stats.uptime_minutes % 60 === 0) {
        console.log(`Applicazione attiva da ${this.stats.uptime_minutes / 60} ore`);
        this.saveStats(); // Salva le statistiche ogni ora
      }
    }, 60 * 1000);
  }
  
  /**
   * Registra un nuovo ping nelle statistiche
   */
  recordPing(status: string = 'OK', source: string = 'internal', userAgent?: string): void {
    const now = new Date();
    const record: PingRecord = {
      timestamp: now.toISOString(),
      status,
      source,
      userAgent
    };
    
    // Aggiungi il record alla cronologia, mantenendo la dimensione massima
    this.stats.ping_history.unshift(record);
    if (this.stats.ping_history.length > this.maxHistorySize) {
      this.stats.ping_history = this.stats.ping_history.slice(0, this.maxHistorySize);
    }
    
    // Aggiorna le altre statistiche
    this.stats.last_ping = record.timestamp;
    this.stats.ping_count++;
    this.stats.last_status = status;
    
    // Salva le statistiche ogni 10 ping o in caso di errore
    if (this.stats.ping_count % 10 === 0 || status !== 'OK') {
      this.saveStats();
    }
  }
  
  /**
   * Salva le statistiche su file
   */
  private saveStats(): void {
    try {
      fs.writeFileSync(this.statsFilePath, JSON.stringify(this.stats, null, 2), 'utf8');
    } catch (error) {
      console.error('Errore nel salvataggio delle statistiche di ping:', error);
    }
  }
  
  /**
   * Restituisce le statistiche attuali
   */
  getStats(): PingStats {
    return { ...this.stats };
  }
  
  /**
   * Ottiene una lista degli ultimi N ping registrati
   */
  getRecentPings(count: number = 10): PingRecord[] {
    return this.stats.ping_history.slice(0, count);
  }
  
  /**
   * Ottiene l'uptime dell'applicazione in formato leggibile
   */
  getFormattedUptime(): string {
    const minutes = this.stats.uptime_minutes;
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  /**
   * Ottiene statistiche di uptime dettagliate
   */
  getUptimeStats(): any {
    const now = new Date();
    const uptimeMs = now.getTime() - this.startTime.getTime();
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    
    return {
      startTime: this.startTime.toISOString(),
      currentTime: now.toISOString(),
      uptimeSeconds,
      uptimeMinutes: this.stats.uptime_minutes,
      uptimeFormatted: this.getFormattedUptime(),
      pingCount: this.stats.ping_count,
      lastPing: this.stats.last_ping,
      status: this.stats.last_status
    };
  }
}

// Esporta un'istanza singleton
export const pingStatsService = new PingStatsService();