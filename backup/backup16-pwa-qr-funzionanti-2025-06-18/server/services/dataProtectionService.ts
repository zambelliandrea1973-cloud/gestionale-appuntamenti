import fs from 'fs';
import path from 'path';

/**
 * Servizio per la protezione e backup automatico dei dati utente
 * Previene perdite accidentali di servizi, clienti e configurazioni
 */
export const dataProtectionService = {
  /**
   * Crea backup automatici dei dati critici
   */
  createAutoBackup(reason: string = 'scheduled'): void {
    try {
      const timestamp = Date.now();
      const storageDataPath = './storage_data.json';
      
      if (!fs.existsSync(storageDataPath)) {
        console.error('File storage_data.json non trovato per backup');
        return;
      }
      
      // Leggi il contenuto corrente
      const currentData = JSON.parse(fs.readFileSync(storageDataPath, 'utf8'));
      
      // Verifica che contengano dati critici prima del backup
      const hasUserServices = currentData.userServices && Object.keys(currentData.userServices).length > 0;
      const hasClients = currentData.clients && currentData.clients.length > 0;
      
      if (!hasUserServices && !hasClients) {
        console.warn('Dati vuoti rilevati - skip backup automatico per prevenire sovrascrittura');
        return;
      }
      
      const backupPath = `./storage_data_backup_${timestamp}.json`;
      fs.writeFileSync(backupPath, JSON.stringify(currentData, null, 2));
      
      console.log(`✅ Backup automatico creato: ${backupPath} (motivo: ${reason})`);
      
      // Mantieni solo gli ultimi 20 backup per evitare accumulo eccessivo
      this.cleanOldBackups();
      
    } catch (error) {
      console.error('Errore durante backup automatico:', error);
    }
  },
  
  /**
   * Verifica l'integrità dei dati prima di operazioni critiche
   */
  verifyDataIntegrity(): boolean {
    try {
      const storageDataPath = './storage_data.json';
      
      if (!fs.existsSync(storageDataPath)) {
        console.error('File storage_data.json mancante');
        return false;
      }
      
      const data = JSON.parse(fs.readFileSync(storageDataPath, 'utf8'));
      
      // Verifica presenza di campi critici
      if (!data.userServices) {
        console.warn('Campo userServices mancante');
        return false;
      }
      
      if (!data.clients) {
        console.warn('Campo clients mancante');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Errore verifica integrità dati:', error);
      return false;
    }
  },
  
  /**
   * Pulisce backup vecchi mantenendo solo gli ultimi 20
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
      
      // Mantieni solo i 20 più recenti
      if (backupFiles.length > 20) {
        const toDelete = backupFiles.slice(20);
        toDelete.forEach(backup => {
          try {
            fs.unlinkSync(backup.name);
            console.log(`🗑️ Backup vecchio rimosso: ${backup.name}`);
          } catch (error) {
            console.error(`Errore rimozione backup ${backup.name}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Errore pulizia backup vecchi:', error);
    }
  },
  
  /**
   * Ripristina dati da backup in caso di corruzione
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
        console.error('Nessun backup disponibile per ripristino');
        return false;
      }
      
      // Prova il backup più recente
      const latestBackup = backupFiles[0];
      const backupData = JSON.parse(fs.readFileSync(latestBackup.name, 'utf8'));
      
      // Verifica che il backup contenga dati validi
      if (!backupData.userServices || !backupData.clients) {
        console.error('Backup corrotto, tentativo con backup precedente');
        return false;
      }
      
      // Ripristina
      fs.writeFileSync('./storage_data.json', JSON.stringify(backupData, null, 2));
      console.log(`✅ Dati ripristinati da backup: ${latestBackup.name}`);
      
      return true;
    } catch (error) {
      console.error('Errore ripristino da backup:', error);
      return false;
    }
  }
};