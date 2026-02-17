import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const keyEnv = process.env.ENCRYPTION_KEY;
  
  if (!keyEnv) {
    console.warn('⚠️ [ENCRYPTION] ENCRYPTION_KEY non impostata, usando chiave di default (NON SICURO IN PRODUZIONE!)');
    return Buffer.from('12345678901234567890123456789012', 'utf8');
  }
  
  // Se la chiave è in formato hex (64 caratteri), convertila in 32 bytes
  if (keyEnv.length === 64 && /^[0-9a-fA-F]+$/.test(keyEnv)) {
    return Buffer.from(keyEnv, 'hex');
  }
  
  // Altrimenti usa la chiave come stringa UTF-8 (deve essere 32 caratteri)
  if (keyEnv.length === 32) {
    return Buffer.from(keyEnv, 'utf8');
  }
  
  // Chiave non valida, usa hash SHA-256 per normalizzarla a 32 bytes
  console.warn('⚠️ [ENCRYPTION] ENCRYPTION_KEY non ha lunghezza corretta, normalizzando con SHA-256');
  return crypto.createHash('sha256').update(keyEnv).digest();
}

const ENCRYPTION_KEY = getEncryptionKey();

export function encryptPassword(password: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(password, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    const combined = iv.toString('hex') + ':' + encrypted.toString('hex') + ':' + authTag.toString('hex');
    return combined;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore durante encryption:', error);
    throw new Error('Errore durante la cifratura della password');
  }
}

export function decryptPassword(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato dati criptati non valido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('❌ [DECRYPTION] Errore durante decryption:', error);
    throw new Error('Errore durante la decifratura della password');
  }
}
