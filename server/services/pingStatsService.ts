/**
 * PingStatsService - Service for managing ping statistics
 * This service maintains a record of received pings and saves statistics to a JSON file
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
    
    // Load statistics from the JSON file if it exists
    try {
      if (fs.existsSync(this.statsFilePath)) {
        const fileContent = fs.readFileSync(this.statsFilePath, 'utf8');
        this.stats = JSON.parse(fileContent);
        console.log('Ping statistics loaded from file');
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
      console.error('Error loading ping statistics:', error);
      this.stats = {
        ping_history: [],
        last_ping: '',
        ping_count: 0,
        uptime_minutes: 0,
        last_status: 'OK'
      };
      this.saveStats();
    }
    
    // Start the timer to increment uptime
    this.startUptimeTracking();
  }
  
  /**
   * Start uptime tracking
   */
  private startUptimeTracking() {
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
    }
    
    this.uptimeInterval = setInterval(() => {
      this.stats.uptime_minutes++;
      if (this.stats.uptime_minutes % 60 === 0) {
        console.log(`Application running for ${this.stats.uptime_minutes / 60} hours`);
        this.saveStats(); // Save statistics every hour
      }
    }, 60 * 1000);
  }
  
  /**
   * Register a new ping in the statistics
   */
  recordPing(status: string = 'OK', source: string = 'internal', userAgent?: string): void {
    const now = new Date();
    const record: PingRecord = {
      timestamp: now.toISOString(),
      status,
      source,
      userAgent
    };
    
    // Add the record to the history, maintaining the maximum size
    this.stats.ping_history.unshift(record);
    if (this.stats.ping_history.length > this.maxHistorySize) {
      this.stats.ping_history = this.stats.ping_history.slice(0, this.maxHistorySize);
    }
    
    // Update the other statistics
    this.stats.last_ping = record.timestamp;
    this.stats.ping_count++;
    this.stats.last_status = status;
    
    // Save the statistiche every 10 pings o in caso di error
    if (this.stats.ping_count % 10 === 0 || status !== 'OK') {
      this.saveStats();
    }
  }
  
  /**
   * Save the statistiche to file
   */
  private saveStats(): void {
    try {
      fs.writeFileSync(this.statsFilePath, JSON.stringify(this.stats, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving ping statistics:', error);
    }
  }
  
  /**
   * Returns the current statistics
   */
  getStats(): PingStats {
    return { ...this.stats };
  }
  
  /**
   * Get a list of the last N registered pings
   */
  getRecentPings(count: number = 10): PingRecord[] {
    return this.stats.ping_history.slice(0, count);
  }
  
  /**
   * Get the application uptime in human-readable format
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
   * Get statistiche di uptime dettagliate
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

// Export a singleton instance
export const pingStatsService = new PingStatsService();