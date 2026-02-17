/**
 * Servizio per gestire il ping esterno dell'applicazione
 * Questo servizio consente di configurare servizi esterni come UptimeRobot o Pingdom
 * per mantenere l'applicazione attiva ed evitare sospensioni dovute a inattività
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Request, Response, Router } from 'express';
import { exec } from 'child_process';
import * as os from 'os';

interface PingStats {
  lastPingTime: string;
  pingCount: number;
  uptime: number;
  startTime: string;
  externalPings: {
    timestamp: string;
    source: string;
    userAgent: string;
  }[];
}

class ExternalPingService {
  private pingStats: PingStats;
  private statsFilePath: string;
  private uptimeRobotKey: string | null = null;
  private secretRestartKey: string = this.generateSecretKey();
  
  constructor() {
    this.statsFilePath = path.join(process.cwd(), 'ping_stats.json');
    
    // Inizializza le statistiche
    this.pingStats = {
      lastPingTime: new Date().toISOString(),
      pingCount: 0,
      uptime: 0,
      startTime: new Date().toISOString(),
      externalPings: []
    };
    
    // Carica le statistiche esistenti se presenti
    this.loadStats();
    
    // Aggiorna l'uptime
    this.pingStats.uptime = process.uptime();
    this.pingStats.startTime = new Date(Date.now() - (process.uptime() * 1000)).toISOString();
    
    // Salva le statistiche aggiornate
    this.saveStats();
    
    // Inizia il processo di salvataggio periodico delle statistiche
    setInterval(() => {
      this.pingStats.uptime = process.uptime();
      this.saveStats();
    }, 60000); // Ogni minuto
    
    console.log('Servizio ping esterno inizializzato');
    console.log(`Chiave segreta per riavvio generata: ${this.secretRestartKey}`);
  }

  /**
   * Registra un router Express con tutti gli endpoint del servizio
   */
  registerRoutes(router: Router): void {
    // Endpoint per il ping standard (monitora la salute dell'app)
    router.get('/ping', (req: Request, res: Response) => {
      this.recordPing(req);
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Applicazione attiva e funzionante',
        uptime: this.formatUptime(process.uptime())
      });
    });
    
    // Endpoint con payload per verifica completa (usato da UptimeRobot/Pingdom)
    router.get('/ping/extended', (req: Request, res: Response) => {
      this.recordPing(req);
      const systemInfo = this.getSystemInfo();
      
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Verifica estesa completata con successo',
        uptime: this.formatUptime(process.uptime()),
        stats: {
          pingCount: this.pingStats.pingCount,
          startTime: this.pingStats.startTime
        },
        system: systemInfo
      });
    });
    
    // Endpoint speciale per forzare riavvio (richiede chiave segreta)
    router.post('/ping/restart', (req: Request, res: Response) => {
      const { restartKey } = req.body;
      
      if (!restartKey || restartKey !== this.secretRestartKey) {
        return res.status(403).json({
          status: 'ERROR',
          message: 'Chiave di riavvio non valida o mancante'
        });
      }
      
      // Registra il comando di riavvio
      console.log(`Riavvio dell'applicazione richiesto dall'esterno alle ${new Date().toISOString()}`);
      
      // Comunica l'intenzione di riavviare prima di farlo
      res.status(200).json({
        status: 'OK',
        message: 'Riavvio in corso...',
        timestamp: new Date().toISOString()
      });
      
      // Riavvia l'applicazione dopo un breve ritardo
      setTimeout(() => {
        this.restartApplication();
      }, 1000);
    });
    
    // Endpoint per ottenere la chiave di riavvio (solo per uso interno)
    router.get('/ping/key', (req: Request, res: Response) => {
      // Verifica se la richiesta proviene da localhost
      const ip = req.ip || req.connection.remoteAddress;
      if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        res.status(200).json({
          restartKey: this.secretRestartKey
        });
      } else {
        // Se non è una richiesta locale, non rivelare la chiave
        res.status(403).json({
          message: 'Accesso negato: questo endpoint è accessibile solo da localhost'
        });
      }
    });
    
    // Endpoint diagnostico per visualizzare le statistiche di ping
    router.get('/ping/stats', (req: Request, res: Response) => {
      // Aggiorna l'uptime prima di inviare le statistiche
      this.pingStats.uptime = process.uptime();
      
      res.status(200).json({
        ...this.pingStats,
        formattedUptime: this.formatUptime(this.pingStats.uptime),
        recentPings: this.pingStats.externalPings.slice(-10) // Mostra solo gli ultimi 10 ping
      });
    });
  }
  
  /**
   * Registra un ping ricevuto
   */
  private recordPing(req: Request): void {
    const now = new Date();
    this.pingStats.lastPingTime = now.toISOString();
    this.pingStats.pingCount++;
    this.pingStats.uptime = process.uptime();
    
    // Registra informazioni sul ping
    const pingInfo = {
      timestamp: now.toISOString(),
      source: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // Mantieni solo gli ultimi 100 ping per evitare che il file diventi troppo grande
    this.pingStats.externalPings.push(pingInfo);
    if (this.pingStats.externalPings.length > 100) {
      this.pingStats.externalPings.shift();
    }
    
    // Non salvare le statistiche ad ogni ping per evitare sovraccarico di I/O
    // Le statistiche verranno salvate periodicamente dall'intervallo
  }
  
  /**
   * Carica le statistiche da file se esistono
   */
  private loadStats(): void {
    try {
      if (fs.existsSync(this.statsFilePath)) {
        const statsData = fs.readFileSync(this.statsFilePath, 'utf8');
        const loadedStats = JSON.parse(statsData);
        this.pingStats = {
          ...this.pingStats,
          ...loadedStats,
          // Non sovrascrivere l'uptime e startTime perché vengono aggiornati con il processo corrente
        };
        console.log('Statistiche di ping caricate da file');
      }
    } catch (error) {
      console.error('Errore nel caricamento delle statistiche di ping:', error);
    }
  }
  
  /**
   * Salva le statistiche su file
   */
  private saveStats(): void {
    try {
      fs.writeFileSync(this.statsFilePath, JSON.stringify(this.pingStats, null, 2));
    } catch (error) {
      console.error('Errore nel salvataggio delle statistiche di ping:', error);
    }
  }
  
  /**
   * Ottiene informazioni di sistema
   */
  private getSystemInfo(): any {
    try {
      return {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: this.formatUptime(os.uptime()),
        loadavg: os.loadavg(),
        freemem: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
        totalmem: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        cpus: os.cpus().length,
        node: process.version
      };
    } catch (error) {
      console.error('Errore nel recupero delle informazioni di sistema:', error);
      return { error: 'Unable to retrieve system information' };
    }
  }
  
  /**
   * Riavvia l'applicazione (può variare in base all'ambiente di hosting)
   */
  private restartApplication(): void {
    try {
      console.log('Tentativo di riavvio dell\'applicazione...');
      
      // In Replit, simuliamo un riavvio terminando il processo
      // Il sistema Replit riavvierà automaticamente il processo
      process.exit(0);
    } catch (error) {
      console.error('Errore durante il tentativo di riavvio:', error);
    }
  }
  
  /**
   * Formatta il tempo di uptime in un formato leggibile
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }
  
  /**
   * Genera una chiave segreta casuale per il riavvio
   */
  private generateSecretKey(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Ottiene l'URL dell'applicazione per la configurazione di UptimeRobot
   */
  getUptimeRobotSetupInfo(baseUrl: string): any {
    return {
      pingUrl: `${baseUrl}/api/external/ping`,
      extendedPingUrl: `${baseUrl}/api/external/ping/extended`, 
      restartUrl: `${baseUrl}/api/external/ping/restart`,
      restartKey: this.secretRestartKey,
      instructions: [
        "1. Aggiungi un nuovo monitor su UptimeRobot di tipo HTTP(s)",
        `2. Usa l'URL: ${baseUrl}/api/external/ping come endpoint di controllo`,
        "3. Imposta l'intervallo a 5 minuti",
        "4. Attiva le notifiche in caso di DOWN"
      ],
      uptimeRobotLink: "https://uptimerobot.com/dashboard"
    };
  }
}

export const externalPingService = new ExternalPingService();