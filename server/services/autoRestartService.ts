import { logger } from '../utils/logger';
/**
 * AutoRestartService - Advanced service for automatic application restart
 * Monitors the application and automatically restarts it if issues are detected
 * such as blocks, high memory usage, or request timeouts
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
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MEMORY_THRESHOLD = 0.85; // 85% of available memory
  private readonly CPU_THRESHOLD = 0.9; // 90% CPU load
  private readonly RESPONSE_TIMEOUT = 10000; // 10 seconds timeout for responses
  private readonly RESTART_COOLDOWN = 15 * 60 * 1000; // 15 minutes of cooldown between restarts
  
  private checkTimer: NodeJS.Timeout | null = null;
  private lastRestartTime: number = 0;
  private restartAttempts: number = 0;
  private restartLogs: RestartLogEntry[] = [];
  private logFile: string;
  private enabled: boolean = true;
  
  constructor() {
    this.logFile = path.join(process.cwd(), 'restart_logs.json');
    this.loadLogs();
    console.log('Auto-restart service initialized');
  }
  
  /**
   * Start application monitoring
   */
  start(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    
    this.checkTimer = setInterval(() => this.performHealthCheck(), this.CHECK_INTERVAL);
    console.log(`Application monitoring started, check every ${this.CHECK_INTERVAL / 60000} minutes`);
  }
  
  /**
   * Stop application monitoring
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    console.log('Application monitoring stopped');
  }
  
  /**
   * Enable or disable the automatic restart
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`Auto-restart ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled && !this.checkTimer) {
      this.start();
    } else if (!enabled && this.checkTimer) {
      this.stop();
    }
  }
  
  /**
   * Performs a complete health check of the application
   */
  private async performHealthCheck(): Promise<void> {
    console.log('Running full health check...');
    
    try {
      // 1. Verify the API status
      const apiHealthy = await this.checkApiHealth();
      
      // 2. Verify resource usage
      const resourcesHealthy = this.checkResourceUsage();
      
      // If both checks pass, all good
      if (apiHealthy && resourcesHealthy) {
        console.log('Health check completed: system in good state');
        
        // Reset restart attempts after a period of stability
        if (Date.now() - this.lastRestartTime > this.RESTART_COOLDOWN * 2) {
          if (this.restartAttempts > 0) {
            console.log(`Restart attempts reset from ${this.restartAttempts} to 0 after a stability period`);
            this.restartAttempts = 0;
          }
        }
        
        return;
      }
      
      // If one of the checks fails, consider the restart
      const reason = !apiHealthy 
        ? 'API non risponde' 
        : 'Utilizzo risorse eccessivo';
      
      this.considerRestart(reason);
    } catch (error) {
      console.error('Error during health check:', error);
      this.considerRestart('Health check error');
    }
  }
  
  /**
   * Verify API health
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
      console.error('Error verifying API:', error);
      return false;
    }
  }
  
  /**
   * Verify system resource usage
   */
  private checkResourceUsage(): boolean {
    try {
      // Verify memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = (totalMem - freeMem) / totalMem;
      
      // Verify CPU load
      const cpuLoad = os.loadavg()[0] / os.cpus().length;
      
      const memoryOk = memUsage < this.MEMORY_THRESHOLD;
      const cpuOk = cpuLoad < this.CPU_THRESHOLD;
      
      if (!memoryOk) {
        console.warn(`High memory usage: ${(memUsage * 100).toFixed(1)}%`);
      }
      
      if (!cpuOk) {
        console.warn(`High CPU load: ${(cpuLoad * 100).toFixed(1)}%`);
      }
      
      return memoryOk && cpuOk;
    } catch (error) {
      console.error('Error verifying resource usage:', error);
      return false; // In case of error, consider the system unhealthy
    }
  }
  
  /**
   * Evaluate whether to restart the application based on current state
   */
  private considerRestart(reason: string): void {
    if (!this.enabled) {
      console.log(`Restart needed for: ${reason}, but auto-restart is disabled`);
      return;
    }
    
    const now = Date.now();
    const timeSinceLastRestart = now - this.lastRestartTime;
    
    // Check if we are in the cooldown period
    if (timeSinceLastRestart < this.RESTART_COOLDOWN) {
      console.log(`Restart needed, but we are in cooldown period (${Math.round(timeSinceLastRestart / 60000)}/${Math.round(this.RESTART_COOLDOWN / 60000)} minutes)`);
      return;
    }
    
    // Limit the maximum number of restart attempts
    if (this.restartAttempts >= 3 && timeSinceLastRestart < this.RESTART_COOLDOWN * 3) {
      console.log(`Too many restart attempts (${this.restartAttempts}), system potentially unstable. Manual intervention required.`);
      return;
    }
    
    console.log(`Auto-restart in progress... Reason: ${reason}`);
    this.restartApplication(reason);
  }
  
  /**
   * Restart the application
   */
  private restartApplication(reason: string): void {
    try {
      // Update the status
      this.lastRestartTime = Date.now();
      this.restartAttempts++;
      
      // Register the restart
      const logEntry: RestartLogEntry = {
        timestamp: new Date().toISOString(),
        reason,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        systemLoad: os.loadavg()
      };
      
      this.restartLogs.push(logEntry);
      this.saveLogs();
      
      // Execute the restart effettivo
      console.log(`Executing restart, attempt #${this.restartAttempts}...`);
      
      // In Replit, terminating the process is sufficient
      // The system will automatically restart the application
      console.log('Terminating process for restart...');
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (error) {
      console.error('Error during application restart:', error);
    }
  }
  
  /**
   * Load previous restart logs
   */
  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const data = fs.readFileSync(this.logFile, 'utf8');
        this.restartLogs = JSON.parse(data);
        
        // Load the last restart timestamp
        if (this.restartLogs.length > 0) {
          const lastLog = this.restartLogs[this.restartLogs.length - 1];
          this.lastRestartTime = new Date(lastLog.timestamp).getTime();
        }
        
        console.log(`Loaded ${this.restartLogs.length} restart logs`);
      }
    } catch (error) {
      console.error('Error loading restart logs:', error);
      this.restartLogs = [];
    }
  }
  
  /**
   * Save restart logs
   */
  private saveLogs(): void {
    try {
      // Keep only the last 50 logs to avoid files becoming too large
      if (this.restartLogs.length > 50) {
        this.restartLogs = this.restartLogs.slice(-50);
      }
      
      fs.writeFileSync(this.logFile, JSON.stringify(this.restartLogs, null, 2));
    } catch (error) {
      console.error('Error saving restart logs:', error);
    }
  }
  
  /**
   * Get restart logs
   */
  getRestartLogs(): RestartLogEntry[] {
    return [...this.restartLogs];
  }
  
  /**
   * Force a manual restart
   */
  forceRestart(reason: string = 'Manual restart'): void {
    console.log(`Forced manual restart: ${reason}`);
    this.restartApplication(reason);
  }
}

// Export a singleton instance
export const autoRestartService = new AutoRestartService();