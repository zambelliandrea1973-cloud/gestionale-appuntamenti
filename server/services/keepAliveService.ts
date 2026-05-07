/**
 * Service to keep the application alive
 * Implements an auto-ping mechanism to prevent the application from going to sleep
 */

import axios from 'axios';
import http from 'http';

class KeepAliveService {
  private interval: NodeJS.Timeout | null = null;
  private pingInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
  private appUrl: string = '';
  private isActive: boolean = false;

  /**
   * Initialize the service with the application URL
   */
  initialize(server: http.Server) {
    if (this.isActive) {
      console.log('The keep-alive service is already active');
      return;
    }

    // Delay initialization to ensure the server is fully started
    console.log('Scheduling keep-alive service initialization in 5 seconds...');
    
    setTimeout(() => {
      // Determine the application URL
      const address = server.address();
      if (address && typeof address !== 'string') {
        const port = address.port;
        this.appUrl = `http://localhost:${port}`;
        
        console.log(`Keep-alive service initialized with URL: ${this.appUrl}`);
        this.startPinging();
      } else {
        console.error('Cannot determine server address for keep-alive service after delay');
      }
    }, 5000); // 5 second delay
  }

  /**
   * Start the automatic ping process
   */
  private startPinging() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.isActive = true;
    console.log(`Starting ping process every ${this.pingInterval / 1000} seconds`);
    
    // Execute immediatamente the first ping
    this.pingHealthCheck();

    // Schedule regular pings
    this.interval = setInterval(() => {
      this.pingHealthCheck();
    }, this.pingInterval);
  }

  /**
   * Executes a ping to the health check endpoint
   */
  private async pingHealthCheck() {
    try {
      const response = await axios.get(`${this.appUrl}/api/health`);
      if (response.status === 200) {
        console.log(`[${new Date().toISOString()}] Health check successful: the application is active`);
      } else {
        console.warn(`Health check responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error during health check ping:', error);
    }
  }

  /**
   * Stop the automatic ping process
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isActive = false;
      console.log('Keep-alive service stopped');
    }
  }
}

export const keepAliveService = new KeepAliveService();