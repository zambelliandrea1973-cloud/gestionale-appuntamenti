/**
 * Sistema di protezione dati per prevenire modifiche accidentali durante testing
 */

import fs from 'fs';
import path from 'path';

export class DataProtection {
  private static readonly BACKUP_DIR = 'data_backups';
  private static readonly STORAGE_FILE = 'storage_data.json';
  
  /**
   * Crea un backup timestampato prima di operazioni critiche
   */
  static createBackup(operation: string): string {
    const timestamp = Date.now();
    const backupFileName = `storage_data_backup_${timestamp}_${operation}.json`;
    const backupPath = path.join(this.BACKUP_DIR, backupFileName);
    
    // Crea directory se non esiste
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
    
    // Copia il file corrente
    const currentData = fs.readFileSync(this.STORAGE_FILE, 'utf8');
    fs.writeFileSync(backupPath, currentData);
    
    console.log(`📁 Backup creato: ${backupFileName} per operazione: ${operation}`);
    return backupPath;
  }
  
  /**
   * Ripristina da backup specifico
   */
  static restoreFromBackup(backupFileName: string): boolean {
    try {
      const backupPath = path.join(this.BACKUP_DIR, backupFileName);
      
      if (!fs.existsSync(backupPath)) {
        console.error(`❌ Backup non trovato: ${backupFileName}`);
        return false;
      }
      
      // Crea backup del file corrente prima del ripristino
      this.createBackup('pre_restore');
      
      // Ripristina dal backup
      const backupData = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(this.STORAGE_FILE, backupData);
      
      console.log(`✅ Dati ripristinati da: ${backupFileName}`);
      return true;
      
    } catch (error: any) {
      console.error(`❌ Errore nel ripristino: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Lista tutti i backup disponibili
   */
  static listBackups(): string[] {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      return [];
    }
    
    return fs.readdirSync(this.BACKUP_DIR)
      .filter(file => file.startsWith('storage_data_backup_'))
      .sort((a, b) => {
        const timestampA = parseInt(a.match(/\d+/)?.[0] || '0');
        const timestampB = parseInt(b.match(/\d+/)?.[0] || '0');
        return timestampB - timestampA; // Più recenti prima
      });
  }
  
  /**
   * Wrapper per operazioni di testing che modifica dati
   */
  static async safeTestOperation<T>(
    operation: string,
    testFn: () => Promise<T>,
    shouldRestore: boolean = true
  ): Promise<T> {
    console.log(`🔒 Inizio operazione protetta: ${operation}`);
    
    // Crea backup
    const backupPath = this.createBackup(operation);
    
    try {
      // Esegue l'operazione
      const result = await testFn();
      
      if (shouldRestore) {
        // Ripristina automaticamente i dati originali
        const backupFileName = path.basename(backupPath);
        this.restoreFromBackup(backupFileName);
        console.log(`🔄 Dati automaticamente ripristinati dopo test: ${operation}`);
      }
      
      return result;
      
    } catch (error: any) {
      // In caso di errore, ripristina sempre i dati
      const backupFileName = path.basename(backupPath);
      this.restoreFromBackup(backupFileName);
      console.error(`❌ Errore durante ${operation}, dati ripristinati`);
      throw error;
    }
  }
}