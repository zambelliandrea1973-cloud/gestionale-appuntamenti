import { EncryptionService } from './encryption';
import { DataAccessLogger } from './data-access-logger';

/**
 * Class for managing GDPR compliance of the application
 */
export class GDPRCompliance {
  private static instance: GDPRCompliance;
  private dataRetentionPeriodDays = 730; // 2 years by default
  private databaseRegion = 'EU'; // Default setting
  private isEncryptionEnabled = true;
  private isLoggingEnabled = true;

  private constructor() {
    // Singleton pattern
  }

  /**
   * Get the istanza singleton of the service GDPR
   */
  public static getInstance(): GDPRCompliance {
    if (!GDPRCompliance.instance) {
      GDPRCompliance.instance = new GDPRCompliance();
      // Initialize the logging system
      DataAccessLogger.initialize();
    }
    return GDPRCompliance.instance;
  }

  /**
   * Set the database region
   * @param region The database region (must be 'EU' for GDPR compliance)
   */
  public setDatabaseRegion(region: string): void {
    this.databaseRegion = region;
    console.log(`Database region set to: ${region}`);
  }

  /**
   * Check if the database is configured to be in the EU
   */
  public isDatabaseInEU(): boolean {
    return this.databaseRegion === 'EU';
  }

  /**
   * Enable or disable data encryption
   */
  public setEncryptionEnabled(enabled: boolean): void {
    this.isEncryptionEnabled = enabled;
    console.log(`Data encryption ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable access logging
   */
  public setLoggingEnabled(enabled: boolean): void {
    this.isLoggingEnabled = enabled;
    console.log(`Data access logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set the data retention period in days
   */
  public setDataRetentionPeriod(days: number): void {
    this.dataRetentionPeriodDays = days;
    console.log(`Data retention period set to ${days} days`);
  }

  /**
   * Encrypt a sensitive data field if encryption is enabled
   */
  public encryptSensitiveData(data: string): string {
    if (!this.isEncryptionEnabled || !data) {
      return data;
    }
    
    // Avoid encrypting data that is already encrypted
    if (EncryptionService.isEncrypted(data)) {
      return data;
    }
    
    return EncryptionService.encrypt(data);
  }

  /**
   * Decrypt a sensitive encrypted data field
   */
  public decryptSensitiveData(encryptedData: string): string {
    if (!this.isEncryptionEnabled || !encryptedData) {
      return encryptedData;
    }
    
    // If sembra criptato, restituisci the data originali
    if (!EncryptionService.isEncrypted(encryptedData)) {
      return encryptedData;
    }
    
    return EncryptionService.decrypt(encryptedData);
  }

  /**
   * Register data access if logging is enabled
   */
  public logDataAccess(
    userId: number | string,
    action: 'read' | 'create' | 'update' | 'delete',
    resource: string,
    resourceId: number | string,
    details?: string
  ): void {
    if (this.isLoggingEnabled) {
      DataAccessLogger.logAccess(userId, action, resource, resourceId, details);
    }
  }

  /**
   * Anonymize personal data for deletion (right to be forgotten)
   * @param date Object containing personal data
   * @returns Object con the data personali anonimizzati
   */
  public anonymizePersonalData(data: any): any {
    if (!data) return data;
    
    const anonymized = { ...data };
    
    // Anonymize common personal data fields
    if (anonymized.firstName) anonymized.firstName = '[ELIMINATO]';
    if (anonymized.lastName) anonymized.lastName = '[ELIMINATO]';
    if (anonymized.email) anonymized.email = `deleted-${Date.now()}@anonymous.com`;
    if (anonymized.phone) anonymized.phone = '0000000000';
    if (anonymized.address) anonymized.address = '[INDIRIZZO ELIMINATO]';
    if (anonymized.birthday) anonymized.birthday = null;
    if (anonymized.medicalNotes) anonymized.medicalNotes = '';
    if (anonymized.notes) anonymized.notes = '';
    if (anonymized.allergies) anonymized.allergies = '';
    
    return anonymized;
  }

  /**
   * Check if data should be deleted based on the retention policy
   */
  public shouldDataBeDeleted(creationDate: Date): boolean {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - creationDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > this.dataRetentionPeriodDays;
  }

  /**
   * Generate a GDPR compliance report
   */
  public generateComplianceReport(): any {
    return {
      databaseInEU: this.isDatabaseInEU(),
      encryptionEnabled: this.isEncryptionEnabled,
      loggingEnabled: this.isLoggingEnabled,
      dataRetentionPeriodDays: this.dataRetentionPeriodDays,
      timestamp: new Date().toISOString(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate recommendations for improving GDPR compliance
   */
  private generateRecommendations(): string[] {
    const recommendations = [];
    
    if (!this.isDatabaseInEU()) {
      recommendations.push('Il database dovrebbe essere ospitato in una regione dell\'Unione Europea');
    }
    
    if (!this.isEncryptionEnabled) {
      recommendations.push('Sensitive data encryption should be enabled');
    }
    
    if (!this.isLoggingEnabled) {
      recommendations.push('Personal data access logging should be enabled');
    }
    
    if (this.dataRetentionPeriodDays > 730) {
      recommendations.push('Data retention period exceeds 2 years, consider reducing it');
    }
    
    return recommendations;
  }
}