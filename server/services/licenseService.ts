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
import { licenses, users } from '../../shared/schema';
import { SQL } from 'drizzle-orm';

// Enumerazione dei tipi di licenza
export enum LicenseType {
  TRIAL = 'trial',
  BASE = 'base',
  PRO = 'pro',
  BUSINESS = 'business',
  STAFF_FREE = 'staff_free', // Licenza gratuita di 10 anni per lo staff
  PASSEPARTOUT = 'passepartout'  // Accesso completo a tutte le funzionalità senza limitazioni
}

// Durata in giorni dei periodi
const LICENSE_DURATIONS = {
  [LicenseType.TRIAL]: 40, // 40 giorni di prova
  [LicenseType.BASE]: 365, // Abbonamento base di 1 anno
  [LicenseType.PRO]: 365, // Abbonamento pro di 1 anno
  [LicenseType.BUSINESS]: 365, // Abbonamento business di 1 anno
  [LicenseType.STAFF_FREE]: 365 * 10, // 10 anni di licenza per lo staff
  [LicenseType.PASSEPARTOUT]: null, // Abbonamento passepartout permanente senza scadenza
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
    
    // Calcoliamo la data di scadenza (se applicabile)
    let expiresAt = null;
    if (LICENSE_DURATIONS[licenseType] !== null) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + LICENSE_DURATIONS[licenseType]);
    }
    
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
    
    // I codici passepartout sono sempre utilizzabili, anche se già attivati
    if (license.type !== LicenseType.PASSEPARTOUT && license.isActive) {
      return { success: false, message: 'Questo codice è già stato attivato' };
    }
    
    // Se non è già attivo o è un passepartout, aggiorniamo lo stato
    if (!license.isActive) {
      await db.update(licenses)
        .set({ 
          isActive: true,
          activatedAt: new Date(),
        })
        .where(eq(licenses.code, normalizedCode));
    }
    
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
   * Se userId è fornito, cerca licenze specifiche di quell'utente
   */
  async getCurrentLicenseInfo(userId?: number): Promise<LicenseInfo> {
    console.log(`Ottengo info licenza${userId ? ` per utente ${userId}` : " corrente"}`);
    
    // Se userId è fornito, controlla se l'utente ha licenze specifiche
    if (userId) {
      try {
        // DEBUG: Mostriamo tutte le licenze per questo utente
        const userLicenses = await db.select()
          .from(licenses)
          .where(eq(licenses.userId, userId));
        
        console.log(`DEBUG: Trovate ${userLicenses.length} licenze totali per l'utente ${userId}`);
        for (const lic of userLicenses) {
          console.log(`- ID: ${lic.id}, Tipo: ${lic.type}, Attiva: ${lic.isActive}, Scadenza: ${lic.expiresAt}`);
        }
        
        // Cerca la licenza attiva più recente per questo utente
        const [userLicense] = await db.select()
          .from(licenses)
          .where(
            and(
              eq(licenses.userId, userId),
              eq(licenses.isActive, true)
            )
          )
          .orderBy(licenses.createdAt, 'desc')
          .limit(1);
        
        if (userLicense) {
          console.log(`Trovata licenza di tipo ${userLicense.type} per utente ${userId} (ID licenza: ${userLicense.id})`);
          const daysLeft = this.calculateDaysLeft(userLicense.expiresAt);
          return {
            type: userLicense.type as LicenseType,
            expiresAt: userLicense.expiresAt,
            isActive: true,
            daysLeft
          };
        } else {
          console.log(`Nessuna licenza trovata per utente ${userId}, utilizzando licenza di sistema`);
        }
      } catch (error) {
        console.error('Errore durante il recupero licenza utente:', error);
      }
    }
    
    // Procedi con il metodo normale se non c'è userId o se non sono state trovate licenze
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
          isActive: trialLicense.isActive === true,
          daysLeft
        };
      }
    }
    
    // Carica la licenza dal database
    const [license] = await db.select()
      .from(licenses)
      .where(eq(licenses.code, currentLicenseCode as string));
    
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
      isActive: license.isActive === true,
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
    // Ottieni l'utente corrente dalla richiesta (se disponibile)
    if (global.currentRequest && global.currentRequest.user) {
      // Se l'utente è di tipo staff o admin, ha automaticamente accesso PRO
      if (global.currentRequest.user.type === 'staff' || global.currentRequest.user.type === 'admin') {
        return true;
      }
    }
    
    // Se non è staff o admin, verifichiamo il tipo di licenza
    const licenseInfo = await this.getCurrentLicenseInfo();
    
    // Verificiamo che la licenza sia attiva e non scaduta
    const isActive = licenseInfo.isActive && (licenseInfo.expiresAt === null || licenseInfo.expiresAt > new Date());
    
    // Accesso consentito per licenze PRO, BUSINESS, STAFF_FREE e PASSEPARTOUT
    if (isActive && (
        licenseInfo.type === LicenseType.PRO || 
        licenseInfo.type === LicenseType.BUSINESS || 
        licenseInfo.type === LicenseType.STAFF_FREE ||
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
  
  /**
   * Crea una licenza di prova per un utente
   */
  async createTrialLicense(userId: number, expiresAt: Date): Promise<void> {
    try {
      // Genera un codice univoco per la licenza di prova
      const randomBytes = crypto.randomBytes(8);
      const trialCode = `TRIAL-${randomBytes.toString('hex').toUpperCase()}`;
      
      // Controlla se l'utente è un amministratore
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      // Se l'utente è un amministratore, creiamo una licenza passepartout permanente
      if (user && user.role === 'admin') {
        await db.insert(licenses).values({
          code: '0103 1973 2009 1979', // Codice fisso per amministratori
          type: LicenseType.PASSEPARTOUT,
          isActive: true,
          createdAt: new Date(),
          expiresAt: null, // Nessuna scadenza
          activatedAt: new Date(),
          userId
        });
        
        console.log(`Licenza PASSEPARTOUT permanente creata per l'amministratore ${userId}`);
        
        // Imposta questa licenza come quella corrente per l'utente
        process.env.CURRENT_LICENSE_CODE = '0103 1973 2009 1979';
        process.env.CURRENT_LICENSE_TYPE = LicenseType.PASSEPARTOUT;
      } else {
        // Per utenti normali, crea una licenza di prova con scadenza
        await db.insert(licenses).values({
          code: trialCode,
          type: LicenseType.TRIAL,
          isActive: true,
          createdAt: new Date(),
          expiresAt,
          activatedAt: new Date(),
          userId // Associamo la licenza all'utente
        });
        
        console.log(`Licenza di prova creata con codice ${trialCode} per l'utente ${userId}, scadenza: ${expiresAt.toISOString()}`);
        
        // Imposta questa licenza come quella corrente per l'utente
        process.env.CURRENT_LICENSE_CODE = trialCode;
        process.env.CURRENT_LICENSE_TYPE = LicenseType.TRIAL;
      }
    } catch (error) {
      console.error('Errore durante la creazione della licenza di prova:', error);
      throw error;
    }
  }

  /**
   * Genera una licenza di 10 anni per un membro dello staff
   * Solo l'amministratore può generare queste licenze speciali
   */
  async generateStaffLicense(userId: number, licenseType: LicenseType, expiresAt: Date): Promise<string> {
    try {
      // Genera un codice univoco con prefisso STAFF-
      const randomBytes = crypto.randomBytes(6);
      const staffCode = `STAFF-${randomBytes.toString('hex').toUpperCase()}`;
      
      // Inserisci la licenza nel database
      await db.insert(licenses).values({
        code: staffCode,
        type: licenseType,
        isActive: true,
        createdAt: new Date(),
        expiresAt, // Scadenza a 10 anni
        activatedAt: new Date(),
        userId
      });
      
      console.log(`Licenza staff di 10 anni creata con codice ${staffCode} per l'utente ${userId}, scadenza: ${expiresAt.toISOString()}`);
      
      return staffCode;
    } catch (error) {
      console.error('Errore durante la creazione della licenza staff:', error);
      throw error;
    }
  }

  /**
   * Revoca una licenza esistente
   */
  async revokeLicense(licenseId: number): Promise<void> {
    try {
      // Disattiva la licenza senza eliminarla dal database (per mantenere la storia)
      await db.update(licenses)
        .set({ 
          isActive: false
        })
        .where(eq(licenses.id, licenseId));
      
      console.log(`Licenza ${licenseId} revocata`);
    } catch (error) {
      console.error('Errore durante la revoca della licenza:', error);
      throw error;
    }
  }
}

export const licenseService = new LicenseService();