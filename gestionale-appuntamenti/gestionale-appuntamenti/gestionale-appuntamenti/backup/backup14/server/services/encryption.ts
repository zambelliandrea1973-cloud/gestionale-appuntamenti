import CryptoJS from 'crypto-js';

// Utilizziamo una chiave di crittografia basata su una variabile di ambiente
// In produzione, questa chiave dovrebbe essere una stringa sicura e complessa
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-development';

/**
 * Servizio per la crittografia dei dati sensibili
 * Utilizza AES per criptare e decriptare i dati
 */
export class EncryptionService {
  /**
   * Cripta un valore usando AES
   * @param value Il valore da criptare
   * @returns Il valore criptato come stringa
   */
  static encrypt(value: string): string {
    if (!value) return value;
    try {
      return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Errore durante la crittografia:', error);
      return value;
    }
  }

  /**
   * Decripta un valore criptato con AES
   * @param encryptedValue Il valore criptato
   * @returns Il valore decriptato
   */
  static decrypt(encryptedValue: string): string {
    if (!encryptedValue) return encryptedValue;
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Errore durante la decrittografia:', error);
      return encryptedValue;
    }
  }
  
  /**
   * Verifica se un valore è già criptato
   * @param value Il valore da verificare
   * @returns true se il valore sembra essere già criptato
   */
  static isEncrypted(value: string): boolean {
    if (!value) return false;
    // Una semplice euristica per verificare se una stringa è già criptata
    // Il formato AES di CryptoJS inizia normalmente con "U2FsdGVk"
    return value.startsWith('U2FsdGVk');
  }
}