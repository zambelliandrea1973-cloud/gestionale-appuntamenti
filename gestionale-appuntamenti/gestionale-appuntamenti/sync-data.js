/**
 * Script sincronizzazione dati tra sistemi
 */

// Backup automatico prima della migrazione
function createDataBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
        timestamp,
        storage: JSON.parse(fs.readFileSync('storage_data.json', 'utf8')),
        accounts: JSON.parse(fs.readFileSync('accounts-credentials.json', 'utf8')),
        version: '1.0.0'
    };
    
    fs.writeFileSync(`backup-migration-${timestamp}.json`, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup creato: backup-migration-${timestamp}.json`);
    return backupData;
}

// Verifica integrità dati
function verifyDataIntegrity(data) {
    const clients = data.storage.clients?.length || 0;
    const accounts = Object.keys(data.accounts).length || 0;
    
    console.log(`📊 Verifica dati:`);
    console.log(`   - Clienti: ${clients}`);
    console.log(`   - Account: ${accounts}`);
    
    return clients > 0 && accounts > 0;
}

// Export per uso esterno
if (typeof module !== 'undefined') {
    module.exports = { createDataBackup, verifyDataIntegrity };
}
