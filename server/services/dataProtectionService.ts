import fs from 'fs';
import path from 'path';

/**
 * Service for protection and automatic backup of user data
 * Prevents accidental loss of services, clients and configurations
 */
export const dataProtectionService = {
  /**
   * Create backup automatici of the data critici
   */
  createAutoBackup(reason: string = 'scheduled'): void {
    try {
      const timestamp = Date.now();
      const storageDataPath = './storage_data.json';
      
      if (!fs.existsSync(storageDataPath)) {
        console.error('File storage_data.json not found per backup');
        return;
      }
      
      // Read the current content
      const currentData = JSON.parse(fs.readFileSync(storageDataPath, 'utf8'));
      
      // Verify that they contain critical data before backup
      const hasUserServices = currentData.userServices && Object.keys(currentData.userServices).length > 0;
      const hasClients = currentData.clients && currentData.clients.length > 0;
      
      if (!hasUserServices && !hasClients) {
        console.warn('Empty data detected - skipping automatic backup to prevent overwrite');
        return;
      }
      
      const backupPath = `./storage_data_backup_${timestamp}.json`;
      fs.writeFileSync(backupPath, JSON.stringify(currentData, null, 2));
      
      console.log(`✅ Automatic backup created: ${backupPath} (reason: ${reason})`);
      
      // Keep only the last 20 backups to avoid excessive accumulation
      this.cleanOldBackups();
      
    } catch (error) {
      console.error('Error during automatic backup:', error);
    }
  },
  
  /**
   * Verify data integrity before critical operations
   */
  verifyDataIntegrity(): boolean {
    try {
      const storageDataPath = './storage_data.json';
      
      if (!fs.existsSync(storageDataPath)) {
        console.error('File storage_data.json missing');
        return false;
      }
      
      const data = JSON.parse(fs.readFileSync(storageDataPath, 'utf8'));
      
      // Verify presenza di fields critici
      if (!data.userServices) {
        console.warn('Field userServices missing');
        return false;
      }
      
      if (!data.clients) {
        console.warn('Field clients missing');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying data integrity:', error);
      return false;
    }
  },
  
  /**
   * Clean up old backups keeping only the last 20
   */
  cleanOldBackups(): void {
    try {
      const backupFiles = fs.readdirSync('.')
        .filter(file => file.startsWith('storage_data_backup_') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          time: parseInt(file.match(/storage_data_backup_(\d+)\.json/)?.[1] || '0')
        }))
        .sort((a, b) => b.time - a.time);
      
      // Keep only the 20 most recent
      if (backupFiles.length > 20) {
        const toDelete = backupFiles.slice(20);
        toDelete.forEach(backup => {
          try {
            fs.unlinkSync(backup.name);
            console.log(`🗑️ Old backup removed: ${backup.name}`);
          } catch (error) {
            console.error(`Error removing backup ${backup.name}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  },
  
  /**
   * Restore data from backup in case of corruption
   */
  restoreFromBackup(): boolean {
    try {
      const backupFiles = fs.readdirSync('.')
        .filter(file => file.startsWith('storage_data_backup_') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          time: parseInt(file.match(/storage_data_backup_(\d+)\.json/)?.[1] || '0')
        }))
        .sort((a, b) => b.time - a.time);
      
      if (backupFiles.length === 0) {
        console.error('No backup available for restore');
        return false;
      }
      
      // Try the most recent backup
      const latestBackup = backupFiles[0];
      const backupData = JSON.parse(fs.readFileSync(latestBackup.name, 'utf8'));
      
      // Verify that the backup contains valid data
      if (!backupData.userServices || !backupData.clients) {
        console.error('Corrupted backup, attempting with previous backup');
        return false;
      }
      
      // Ripristina
      fs.writeFileSync('./storage_data.json', JSON.stringify(backupData, null, 2));
      console.log(`✅ Data restored from backup: ${latestBackup.name}`);
      
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }
};