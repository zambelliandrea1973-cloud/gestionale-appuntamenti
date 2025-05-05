/**
 * Servizio per la gestione delle licenze
 * 
 * Questo servizio gestisce:
 * - Verifica dello stato della licenza (trial, base, pro)
 * - Generazione di codici di attivazione
 * - Attivazione delle licenze
 * - Verifica della scadenza dei periodi di prova
 */

import * as crypto from 'crypto';
import { db } from '../db';
import { eq, lt, and } from 'drizzle-orm';
import { licenses } from '../../shared/schema';
import { SQL } from 'drizzle-orm';

// Enumerazione dei tipi di licenza
export enum LicenseType {
  TRIAL = 'trial',
  BASE = 'base',
  PRO = 'pro',
  BUSINESS = 'business',
  PASSEPARTOUT = 'passepartout'  // Accesso completo a tutte le funzionalità senza limitazioni
}

// Durata in giorni dei periodi
const LICENSE_DURATIONS = {
  [LicenseType.TRIAL]: 40, // 40 giorni di prova
  [LicenseType.BASE]: 365, // Abbonamento base di 1 anno
  [LicenseType.PRO]: 365, // Abbonamento pro di 1 anno
  [LicenseType.BUSINESS]: 365, // Abbonamento business di 1 anno
  [LicenseType.PASSEPARTOUT]: 3650, // Abbonamento passepartout di 10 anni (praticamente permanente)
};

export interface LicenseInfo {
  type: LicenseType;
  expiresAt: Date | null;
  isActive: boolean;
  daysLeft: number | null;
}

class LicenseService {
  /**
   * Genera un codice di attivazione per una licenza
   */
  async generateActivationCode(licenseType: LicenseType): Promise<string> {
    // Generiamo un codice univoco di 16 caratteri
    const randomBytes = crypto.randomBytes(8);
    const activationCode = randomBytes.toString('hex').toUpperCase();
    
    // Calcoliamo la data di scadenza
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LICENSE_DURATIONS[licenseType]);
    
    // Inseriamo il codice nel database
    await db.insert(licenses).values({
      code: activationCode,
      type: licenseType,
      isActive: false,
      createdAt: new Date(),
      expiresAt,
      activatedAt: null
    });
    
    return activationCode;
  }
  
  /**
   * Attiva una licenza con un codice di attivazione
   */
  async activateLicense(activationCode: string): Promise<{ success: boolean, message: string }> {
    // Normalizza il codice (rimuovi spazi e converti a maiuscolo)
    const normalizedCode = activationCode.replace(/\s/g, '').toUpperCase();
    
    // Cerca la licenza nel database
    const [license] = await db.select().from(licenses).where(eq(licenses.code, normalizedCode));
    
    if (!license) {
      return { success: false, message: 'Codice di attivazione non valido' };
    }
    
    if (license.isActive) {
      return { success: false, message: 'Questo codice è già stato attivato' };
    }
    
    // Aggiorniamo la licenza
    await db.update(licenses)
      .set({ 
        isActive: true,
        activatedAt: new Date(),
      })
      .where(eq(licenses.code, normalizedCode));
    
    // Impostiamo questa licenza come quella corrente
    await this.setCurrentLicense(normalizedCode);
    
    return { 
      success: true, 
      message: `Licenza ${license.type} attivata con successo` 
    };
  }
  
  /**
   * Imposta una licenza come quella corrente nel sistema
   */
  async setCurrentLicense(activationCode: string): Promise<void> {
    // In un'implementazione reale, dovresti avere una tabella o una chiave di configurazione
    // che memorizza l'ID della licenza attuale. Per semplicità, usiamo un file JSON temporaneo.
    const normalizedCode = activationCode.replace(/\s/g, '').toUpperCase();
    
    // Cerca la licenza nel database
    const [license] = await db.select().from(licenses).where(eq(licenses.code, normalizedCode));
    
    if (!license) {
      throw new Error('Licenza non trovata');
    }
    
    // Qui impostiamo questa licenza come quella corrente
    // Per ora, impostiamo una variabile di ambiente o una configurazione globale
    process.env.CURRENT_LICENSE_CODE = normalizedCode;
    process.env.CURRENT_LICENSE_TYPE = license.type;
  }
  
  /**
   * Ottiene informazioni sulla licenza corrente
   */
  async getCurrentLicenseInfo(): Promise<LicenseInfo> {
    // Prova a caricare la licenza attuale
    const currentLicenseCode = process.env.CURRENT_LICENSE_CODE;
    
    // Se non c'è una licenza corrente, consideriamo che siamo in prova
    if (!currentLicenseCode) {
      // Controlla se esiste una licenza di prova
      const [trialLicense] = await db.select()
        .from(licenses)
        .where(eq(licenses.type, LicenseType.TRIAL));
      
      // Se non esiste, crea una nuova licenza di prova
      if (!trialLicense) {
        // Crea una nuova licenza di prova
        const trialCode = await this.generateActivationCode(LicenseType.TRIAL);
        // Attiva immediatamente la licenza di prova
        await this.activateLicense(trialCode);
        // Ricarica la licenza
        const [newTrialLicense] = await db.select()
          .from(licenses)
          .where(eq(licenses.code, trialCode));
          
        if (newTrialLicense) {
          const daysLeft = this.calculateDaysLeft(newTrialLicense.expiresAt);
          return {
            type: LicenseType.TRIAL,
            expiresAt: newTrialLicense.expiresAt,
            isActive: true,
            daysLeft
          };
        }
      } else {
        // Usa la licenza di prova esistente
        const daysLeft = this.calculateDaysLeft(trialLicense.expiresAt);
        return {
          type: LicenseType.TRIAL,
          expiresAt: trialLicense.expiresAt,
          isActive: trialLicense.isActive,
          daysLeft
        };
      }
    }
    
    // Carica la licenza dal database
    const [license] = await db.select()
      .from(licenses)
      .where(eq(licenses.code, currentLicenseCode));
    
    if (!license) {
      // Fallback a TRIAL se la licenza non esiste
      return {
        type: LicenseType.TRIAL,
        expiresAt: null,
        isActive: false,
        daysLeft: null
      };
    }
    
    const daysLeft = this.calculateDaysLeft(license.expiresAt);
    
    return {
      type: license.type as LicenseType,
      expiresAt: license.expiresAt,
      isActive: license.isActive,
      daysLeft
    };
  }
  
  /**
   * Verifica se la licenza corrente è scaduta
   */
  async isCurrentLicenseExpired(): Promise<boolean> {
    const licenseInfo = await this.getCurrentLicenseInfo();
    
    if (!licenseInfo.expiresAt) {
      return false;
    }
    
    return licenseInfo.expiresAt < new Date();
  }
  
  /**
   * Verifica se l'utente ha accesso alle funzionalità PRO
   */
  async hasProAccess(): Promise<boolean> {
    const licenseInfo = await this.getCurrentLicenseInfo();
    
    // Verificiamo che la licenza sia attiva e non scaduta
    const isActive = licenseInfo.isActive && (licenseInfo.expiresAt === null || licenseInfo.expiresAt > new Date());
    
    // Accesso consentito per licenze PRO, BUSINESS e PASSEPARTOUT
    if (isActive && (
        licenseInfo.type === LicenseType.PRO || 
        licenseInfo.type === LicenseType.BUSINESS || 
        licenseInfo.type === LicenseType.PASSEPARTOUT
      )) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Verifica se l'utente ha accesso alle funzionalità BUSINESS
   */
  async hasBusinessAccess(): Promise<boolean> {
    const licenseInfo = await this.getCurrentLicenseInfo();
    
    // Verificiamo che la licenza sia attiva e non scaduta
    const isActive = licenseInfo.isActive && (licenseInfo.expiresAt === null || licenseInfo.expiresAt > new Date());
    
    // Accesso consentito per licenze BUSINESS e PASSEPARTOUT
    if (isActive && (
        licenseInfo.type === LicenseType.BUSINESS || 
        licenseInfo.type === LicenseType.PASSEPARTOUT
      )) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Calcola i giorni rimanenti prima della scadenza
   */
  private calculateDaysLeft(expiresAt: Date | null): number | null {
    if (!expiresAt) return null;
    
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
  
  /**
   * Ottiene il titolo dell'applicazione in base al tipo di licenza
   */
  async getApplicationTitle(): Promise<string> {
    const licenseInfo = await this.getCurrentLicenseInfo();
    
    switch(licenseInfo.type) {
      case LicenseType.TRIAL:
        return "Gestione Appuntamenti Prova";
      case LicenseType.BASE:
        return "Gestione Appuntamenti Base";
      case LicenseType.PRO:
        return "Gestione Appuntamenti PRO";
      case LicenseType.BUSINESS:
        return "Gestione Appuntamenti BUSINESS";
      case LicenseType.PASSEPARTOUT:
        return "Gestione Appuntamenti PASSEPARTOUT";
      default:
        return "Gestione Appuntamenti";
    }
  }
}

export const licenseService = new LicenseService();