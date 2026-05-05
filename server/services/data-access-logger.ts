import fs from 'fs';
import path from 'path';

/**
 * Service for logging personal data access
 * Compliant with GDPR regulations for access traceability
 */
export class DataAccessLogger {
  private static logDir = path.join(process.cwd(), 'logs');
  private static logFile = path.join(DataAccessLogger.logDir, 'data-access.log');

  /**
   * Initialize the logging system creating the log directory if it exists
   */
  static initialize(): void {
    if (!fs.existsSync(DataAccessLogger.logDir)) {
      fs.mkdirSync(DataAccessLogger.logDir, { recursive: true });
    }
  }

  /**
   * Register a personal data access
   * @param userId ID of the user who performed the access
   * @param action Azione eseguita (read, create, update, delete)
   * @param resource Resource that was accessed (client, appointment, etc.)
   * @param resourceId Resource ID
   * @param details Additional details about the access
   */
  static logAccess(
    userId: number | string,
    action: 'read' | 'create' | 'update' | 'delete',
    resource: string,
    resourceId: number | string,
    details?: string
  ): void {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = JSON.stringify({
        timestamp,
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress: 'unknown' // In a real implementation, you should capture the client IP
      });

      // Add the access to the log file
      fs.appendFileSync(DataAccessLogger.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Error registering data access:', error);
    }
  }

  /**
   * Get access logs for a specific resource
   * @param resource Resource name
   * @param resourceId Resource ID
   * @returns Array of access logs
   */
  static getAccessLogs(resource: string, resourceId: number | string): any[] {
    try {
      if (!fs.existsSync(DataAccessLogger.logFile)) {
        return [];
      }

      const logs = fs.readFileSync(DataAccessLogger.logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => JSON.parse(line))
        .filter(log => log.resource === resource && log.resourceId == resourceId);

      return logs;
    } catch (error) {
      console.error('Error reading access logs:', error);
      return [];
    }
  }

  /**
   * Export access logs for a specific user (useful for GDPR requests)
   * @param userId ID of the user
   * @returns Array of access logs
   */
  static getUserDataAccessLogs(userId: number | string): any[] {
    try {
      if (!fs.existsSync(DataAccessLogger.logFile)) {
        return [];
      }

      const logs = fs.readFileSync(DataAccessLogger.logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => JSON.parse(line))
        .filter(log => log.userId == userId);

      return logs;
    } catch (error) {
      console.error('Error reading access logs:', error);
      return [];
    }
  }
}