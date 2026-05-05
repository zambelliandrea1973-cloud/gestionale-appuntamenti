/**
 * Service for managing external application pings
 * This service allows configuring external services like UptimeRobot or Pingdom
 * to keep the application alive and avoid suspensions due to inactivity
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
    
    // Initialize the statistics
    this.pingStats = {
      lastPingTime: new Date().toISOString(),
      pingCount: 0,
      uptime: 0,
      startTime: new Date().toISOString(),
      externalPings: []
    };
    
    // Load the statistics esistenti If presenti
    this.loadStats();
    
    // Update l'uptime
    this.pingStats.uptime = process.uptime();
    this.pingStats.startTime = new Date(Date.now() - (process.uptime() * 1000)).toISOString();
    
    // Save the statistiche aggiornate
    this.saveStats();
    
    // Start the periodic statistics saving process
    setInterval(() => {
      this.pingStats.uptime = process.uptime();
      this.saveStats();
    }, 60000); // Every minute
    
    console.log('External ping service initialized');
    console.log(`Restart secret key generated: ${this.secretRestartKey}`);
  }

  /**
   * Register a router Express with all endpoint of the service
   */
  registerRoutes(router: Router): void {
    // Endpoint for standard ping (monitors app health)
    router.get('/ping', (req: Request, res: Response) => {
      this.recordPing(req);
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Application active and running',
        uptime: this.formatUptime(process.uptime())
      });
    });
    
    // Endpoint with payload for full verification (used by UptimeRobot/Pingdom)
    router.get('/ping/extended', (req: Request, res: Response) => {
      this.recordPing(req);
      const systemInfo = this.getSystemInfo();
      
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Extended verification completed successfully',
        uptime: this.formatUptime(process.uptime()),
        stats: {
          pingCount: this.pingStats.pingCount,
          startTime: this.pingStats.startTime
        },
        system: systemInfo
      });
    });
    
    // Endpoint speciale per forzare riavvio (richiede key segreta)
    router.post('/ping/restart', (req: Request, res: Response) => {
      const { restartKey } = req.body;
      
      if (!restartKey || restartKey !== this.secretRestartKey) {
        return res.status(403).json({
          status: 'ERROR',
          message: 'Restart key invalid or missing'
        });
      }
      
      // Register the restart command
      console.log(`Application restart triggered externally at ${new Date().toISOString()}`);
      
      // Communicate the intention to restart before doing it
      res.status(200).json({
        status: 'OK',
        message: 'Riavvio in corso...',
        timestamp: new Date().toISOString()
      });
      
      // Restart the application after a brief delay
      setTimeout(() => {
        this.restartApplication();
      }, 1000);
    });
    
    // Endpoint to get the restart key (internal use only)
    router.get('/ping/key', (req: Request, res: Response) => {
      // Check if the request comes from localhost
      const ip = req.ip || req.connection.remoteAddress;
      if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        res.status(200).json({
          restartKey: this.secretRestartKey
        });
      } else {
        // If it is a local request, do not reveal the key
        res.status(403).json({
          message: 'Access denied: this endpoint is only accessible from localhost'
        });
      }
    });
    
    // Endpoint diagnostico per visualizzare the statistics di ping
    router.get('/ping/stats', (req: Request, res: Response) => {
      // Update l'uptime prima di inviare the statistics
      this.pingStats.uptime = process.uptime();
      
      res.status(200).json({
        ...this.pingStats,
        formattedUptime: this.formatUptime(this.pingStats.uptime),
        recentPings: this.pingStats.externalPings.slice(-10) // Show only the last 10 pings
      });
    });
  }
  
  /**
   * Register a received ping
   */
  private recordPing(req: Request): void {
    const now = new Date();
    this.pingStats.lastPingTime = now.toISOString();
    this.pingStats.pingCount++;
    this.pingStats.uptime = process.uptime();
    
    // Register ping information
    const pingInfo = {
      timestamp: now.toISOString(),
      source: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // Keep only the last 100 pings to avoid the file becoming too large
    this.pingStats.externalPings.push(pingInfo);
    if (this.pingStats.externalPings.length > 100) {
      this.pingStats.externalPings.shift();
    }
    
    // Not salvare the statistics ad each ping per evitare sovraccarico di I/O
    // the statistics verranno salvate periodicamente dall'intervallo
  }
  
  /**
   * Load the statistics da file If esistono
   */
  private loadStats(): void {
    try {
      if (fs.existsSync(this.statsFilePath)) {
        const statsData = fs.readFileSync(this.statsFilePath, 'utf8');
        const loadedStats = JSON.parse(statsData);
        this.pingStats = {
          ...this.pingStats,
          ...loadedStats,
          // Do not overwrite uptime and startTime because they are updated with the current process
        };
        console.log('Ping statistics loaded from file');
      }
    } catch (error) {
      console.error('Error loading ping statistics:', error);
    }
  }
  
  /**
   * Save the statistiche to file
   */
  private saveStats(): void {
    try {
      fs.writeFileSync(this.statsFilePath, JSON.stringify(this.pingStats, null, 2));
    } catch (error) {
      console.error('Error saving ping statistics:', error);
    }
  }
  
  /**
   * Get system information
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
      console.error('Error retrieving system information:', error);
      return { error: 'Unable to retrieve system information' };
    }
  }
  
  /**
   * Restart the application (may vary based on the hosting environment)
   */
  private restartApplication(): void {
    try {
      console.log('Attempting application restart...');
      
      // In Replit, simulate a restart by terminating the process
      // The Replit system will automatically restart the process
      process.exit(0);
    } catch (error) {
      console.error('Error during restart attempt:', error);
    }
  }
  
  /**
   * Format the uptime in a readable format
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
   * Generate a key segreta casuale per the restart
   */
  private generateSecretKey(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Get the application URL for UptimeRobot configuration
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