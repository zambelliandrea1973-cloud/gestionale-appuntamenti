import { EncryptionService } from './encryption';
import { DataAccessLogger } from './data-access-logger';

/**
 * Classe per la gestione della conformità GDPR dell'applicazione
 */
export class GDPRCompliance {
  private static instance: GDPRCompliance;
  private dataRetentionPeriodDays = 730; // 2 anni di default
  private databaseRegion = 'EU'; // Impostazione predefinita
  private isEncryptionEnabled = true;
  private isLoggingEnabled = true;

  private constructor() {
    // Singleton pattern
  }

  /**
   * Ottiene l'istanza singleton del servizio GDPR
   */
  public static getInstance(): GDPRCompliance {
    if (!GDPRCompliance.instance) {
      GDPRCompliance.instance = new GDPRCompliance();
      // Inizializza il sistema di logging
      DataAccessLogger.initialize();
    }
    return GDPRCompliance.instance;
  }

  /**
   * Imposta la regione del database
   * @param region La regione del database (deve essere 'EU' per conformità GDPR)
   */
  public setDatabaseRegion(region: string): void {
    this.databaseRegion = region;
    console.log(`Regione database impostata su: ${region}`);
  }

  /**
   * Controlla se il database è configurato per essere nell'UE
   */
  public isDatabaseInEU(): boolean {
    return this.databaseRegion === 'EU';
  }

  /**
   * Abilita o disabilita la crittografia dei dati
   */
  public setEncryptionEnabled(enabled: boolean): void {
    this.isEncryptionEnabled = enabled;
    console.log(`Crittografia dati ${enabled ? 'abilitata' : 'disabilitata'}`);
  }

  /**
   * Abilita o disabilita il logging degli accessi
   */
  public setLoggingEnabled(enabled: boolean): void {
    this.isLoggingEnabled = enabled;
    console.log(`Logging accessi ai dati ${enabled ? 'abilitato' : 'disabilitato'}`);
  }

  /**
   * Imposta il periodo di conservazione dei dati in giorni
   */
  public setDataRetentionPeriod(days: number): void {
    this.dataRetentionPeriodDays = days;
    console.log(`Periodo di conservazione dati impostato a ${days} giorni`);
  }

  /**
   * Cripta un campo di dati sensibili se la crittografia è abilitata
   */
  public encryptSensitiveData(data: string): string {
    if (!this.isEncryptionEnabled || !data) {
      return data;
    }
    
    // Evita di criptare dati già criptati
    if (EncryptionService.isEncrypted(data)) {
      return data;
    }
    
    return EncryptionService.encrypt(data);
  }

  /**
   * Decripta un campo di dati sensibili criptati
   */
  public decryptSensitiveData(encryptedData: string): string {
    if (!this.isEncryptionEnabled || !encryptedData) {
      return encryptedData;
    }
    
    // Se non sembra criptato, restituisci i dati originali
    if (!EncryptionService.isEncrypted(encryptedData)) {
      return encryptedData;
    }
    
    return EncryptionService.decrypt(encryptedData);
  }

  /**
   * Registra l'accesso ai dati se il logging è abilitato
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
   * Anonimizza i dati personali per la cancellazione (diritto all'oblio)
   * @param data Oggetto contenente dati personali
   * @returns Oggetto con i dati personali anonimizzati
   */
  public anonymizePersonalData(data: any): any {
    if (!data) return data;
    
    const anonymized = { ...data };
    
    // Anonimizza campi comuni di dati personali
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
   * Controlla se i dati devono essere eliminati in base alla politica di conservazione
   */
  public shouldDataBeDeleted(creationDate: Date): boolean {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - creationDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > this.dataRetentionPeriodDays;
  }

  /**
   * Genera un report sulla conformità GDPR
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
   * Genera raccomandazioni per migliorare la conformità GDPR
   */
  private generateRecommendations(): string[] {
    const recommendations = [];
    
    if (!this.isDatabaseInEU()) {
      recommendations.push('Il database dovrebbe essere ospitato in una regione dell\'Unione Europea');
    }
    
    if (!this.isEncryptionEnabled) {
      recommendations.push('La crittografia dei dati sensibili dovrebbe essere abilitata');
    }
    
    if (!this.isLoggingEnabled) {
      recommendations.push('Il logging degli accessi ai dati personali dovrebbe essere abilitato');
    }
    
    if (this.dataRetentionPeriodDays > 730) {
      recommendations.push('Il periodo di conservazione dei dati supera i 2 anni, considerare una riduzione');
    }
    
    return recommendations;
  }
}