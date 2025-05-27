/**
 * SISTEMA DI BACKUP SICURO E MULTIPLO
 * Crea backup con timestamp e controlli di sicurezza
 */

const fs = require('fs');
const path = require('path');

function createSafeBackup(backupName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeBackupName = `${backupName}-${timestamp}`;
  const backupDir = path.join('backup', safeBackupName);
  
  console.log(`🔐 CREAZIONE BACKUP SICURO: ${safeBackupName}`);
  
  // Crea directory di backup
  if (!fs.existsSync('backup')) {
    fs.mkdirSync('backup', { recursive: true });
  }
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Lista dei file/cartelle da includere nel backup
  const itemsToBackup = [
    'client',
    'server', 
    'shared',
    'public',
    'package.json',
    'package-lock.json',
    'drizzle.config.ts',
    'vite.config.ts',
    'tsconfig.json',
    'tailwind.config.ts',
    'theme.json'
  ];
  
  console.log('📁 Copiando file essenziali...');
  
  itemsToBackup.forEach(item => {
    const sourcePath = path.join('.', item);
    const destPath = path.join(backupDir, item);
    
    if (fs.existsSync(sourcePath)) {
      if (fs.statSync(sourcePath).isDirectory()) {
        copyDirectory(sourcePath, destPath);
        console.log(`✅ Cartella copiata: ${item}`);
      } else {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ File copiato: ${item}`);
      }
    } else {
      console.log(`⚠️  File non trovato: ${item}`);
    }
  });
  
  // Crea file di info del backup
  const backupInfo = {
    name: safeBackupName,
    originalName: backupName,
    created: new Date().toISOString(),
    description: 'Backup sicuro con timestamp per evitare sovrascritture',
    files: itemsToBackup.filter(item => fs.existsSync(item))
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'backup-info.json'),
    JSON.stringify(backupInfo, null, 2)
  );
  
  console.log(`🎉 BACKUP COMPLETATO: ${safeBackupName}`);
  console.log(`📍 Percorso: backup/${safeBackupName}`);
  
  return safeBackupName;
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Esegui backup se chiamato direttamente
if (require.main === module) {
  const backupName = process.argv[2] || 'backup-corrente';
  createSafeBackup(backupName);
}

module.exports = { createSafeBackup };