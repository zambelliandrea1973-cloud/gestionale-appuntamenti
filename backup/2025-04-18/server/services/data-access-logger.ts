import fs from 'fs';
import path from 'path';

/**
 * Servizio per la registrazione degli accessi ai dati personali
 * Conforme alle normative GDPR per la tracciabilità degli accessi
 */
export class DataAccessLogger {
  private static logDir = path.join(process.cwd(), 'logs');
  private static logFile = path.join(DataAccessLogger.logDir, 'data-access.log');

  /**
   * Inizializza il sistema di logging creando la directory dei log se non esiste
   */
  static initialize(): void {
    if (!fs.existsSync(DataAccessLogger.logDir)) {
      fs.mkdirSync(DataAccessLogger.logDir, { recursive: true });
    }
  }

  /**
   * Registra un accesso ai dati personali
   * @param userId ID dell'utente che ha effettuato l'accesso
   * @param action Azione eseguita (read, create, update, delete)
   * @param resource Risorsa a cui si è acceduto (client, appointment, ecc.)
   * @param resourceId ID della risorsa
   * @param details Dettagli aggiuntivi sull'accesso
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
        ipAddress: 'unknown' // In un'implementazione reale, dovresti catturare l'IP del client
      });

      // Aggiungi l'accesso al file di log
      fs.appendFileSync(DataAccessLogger.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Errore durante la registrazione dell\'accesso ai dati:', error);
    }
  }

  /**
   * Ottiene i log di accesso per una risorsa specifica
   * @param resource Nome della risorsa
   * @param resourceId ID della risorsa
   * @returns Array di log di accesso
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
      console.error('Errore durante la lettura dei log di accesso:', error);
      return [];
    }
  }

  /**
   * Esporta i log di accesso per un utente specifico (utile per le richieste GDPR)
   * @param userId ID dell'utente
   * @returns Array di log di accesso
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
      console.error('Errore durante la lettura dei log di accesso:', error);
      return [];
    }
  }
}