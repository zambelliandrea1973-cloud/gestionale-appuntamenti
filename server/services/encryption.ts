import CryptoJS from 'crypto-js';

// We use an encryption key based on an environment variable
// In production, this key should be a secure and complex string
const isProduction = process.env.PRODUCTION_DOMAIN || process.env.NODE_ENV === 'production';
if (isProduction && !process.env.ENCRYPTION_KEY) {
  console.error('🔴 CRITICAL: ENCRYPTION_KEY not configured in production! The server cannot start safely.');
  process.exit(1);
}
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-development';

/**
 * Service for encrypting sensitive data
 * Uses AES to encrypt and decrypt data
 */
export class EncryptionService {
  /**
   * Encrypt a value using AES
   * @param value The value to encrypt
   * @returns The encrypted value as a string
   */
  static encrypt(value: string): string {
    if (!value) return value;
    try {
      return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Error during encryption:', error);
      return value;
    }
  }

  /**
   * Decrypt a value encrypted with AES
   * @param encryptedValue The encrypted value
   * @returns The decrypted value
   */
  static decrypt(encryptedValue: string): string {
    if (!encryptedValue) return encryptedValue;
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error during decryption:', error);
      return encryptedValue;
    }
  }
  
  /**
   * Check if a value is already encrypted
   * @param value The value to verify
   * @returns true if the value appears to already be encrypted
   */
  static isEncrypted(value: string): boolean {
    if (!value) return false;
    // A simple heuristic to verify if a string is already encrypted
    // Il format AES di CryptoJS inizia normalmente con "U2FsdGVk"
    return value.startsWith('U2FsdGVk');
  }

  static decryptToken(value: string): string {
    if (!value) return value;
    if (EncryptionService.isEncrypted(value)) {
      return EncryptionService.decrypt(value);
    }
    return value;
  }
}