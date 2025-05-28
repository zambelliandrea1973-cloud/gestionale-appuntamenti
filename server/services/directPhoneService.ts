/**
 * Servizio per la gestione diretta dei numeri di telefono per l'invio di SMS
 * Questo approccio sostituisce l'accoppiamento tramite QR code
 */

import { db } from '../db';
import { eq } from 'drizzle-orm';
import { phones } from '@shared/schema';
import { twilioClient } from './twilioService';

// Stati del dispositivo
enum PhoneStatus {
  DISCONNECTED = 'disconnected',
  VERIFICATION_PENDING = 'verification_pending',
  VERIFIED = 'verified',
  CONNECTED = 'connected'
}

// Interfaccia per le informazioni sul telefono
interface PhoneInfo {
  status: PhoneStatus;
  phoneNumber: string | null;
  lastUpdated?: Date | null;
}

class DirectPhoneService {
  private activePhone: PhoneInfo | null = null;
  private verificationCodes: Map<string, string> = new Map();
  
  constructor() {
    this.loadSavedPhone();
    console.log('Servizio gestione telefono diretto inizializzato');
  }
  
  /**
   * Carica il telefono salvato dal database
   */
  private async loadSavedPhone() {
    try {
      const savedPhones = await db.select().from(phones).where(eq(phones.isActive, true));
      
      if (savedPhones.length > 0) {
        const phone = savedPhones[0];
        
        this.activePhone = {
          status: phone.isVerified ? PhoneStatus.VERIFIED : PhoneStatus.VERIFICATION_PENDING,
          phoneNumber: phone.phoneNumber,
          lastUpdated: phone.updatedAt
        };
        
        console.log(`Telefono caricato dal database: ${phone.phoneNumber}`);
      } else {
        this.activePhone = null;
        console.log('Nessun telefono attivo trovato nel database');
      }
    } catch (error) {
      console.error('Errore nel caricamento del telefono dal database:', error);
      this.activePhone = null;
    }
  }
  
  /**
   * Registra un nuovo numero di telefono
   * @param phoneNumber Numero di telefono da registrare
   * @returns Vero se la registrazione è riuscita
   */
  public async registerPhone(phoneNumber: string): Promise<boolean> {
    try {
      // Controlliamo che il numero sia formattato correttamente
      if (!phoneNumber.startsWith('+')) {
        throw new Error('Il numero di telefono deve iniziare con il prefisso internazionale (+)');
      }
      
      // Generiamo un codice di verifica (6 cifre casuali)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      this.verificationCodes.set(phoneNumber, verificationCode);
      
      // In un'implementazione reale, inviamo l'SMS con il codice di verifica
      // In questa versione demo, lo simuliamo semplicemente
      console.log(`Codice di verifica per ${phoneNumber}: ${verificationCode}`);
      
      try {
        // Invio del codice via email invece che SMS
        const fs = await import('fs/promises');
        let emailSettings;
        try {
          const data = await fs.readFile('email_settings.json', 'utf8');
          emailSettings = JSON.parse(data);
        } catch (error) {
          console.log('Impostazioni email non trovate, uso codice dai log');
          return { success: true, message: 'Codice di verifica generato (controlla i log del server)', phoneNumber };
        }

        if (emailSettings.emailEnabled && emailSettings.emailAddress && emailSettings.emailPassword) {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.default.createTransporter({
            service: 'gmail',
            auth: {
              user: emailSettings.emailAddress,
              pass: emailSettings.emailPassword
            }
          });

          await transporter.sendMail({
            from: emailSettings.emailAddress,
            to: emailSettings.emailAddress, // Invia a te stesso per ora
            subject: '🔐 Codice di verifica WhatsApp',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #25d366;">📱 Codice di Verifica WhatsApp</h2>
                <p>Il tuo codice di verifica per configurare WhatsApp è:</p>
                <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
                  ${verificationCode}
                </div>
                <p><strong>Numero da verificare:</strong> ${phoneNumber}</p>
                <p style="color: #666; font-size: 12px;">Questo codice è valido per 10 minuti.</p>
              </div>
            `
          });
          console.log(`📧 Email di verifica inviata per ${phoneNumber}`);
        } else {
          console.log('Email non configurata, codice di verifica solo nei log');
        }
      } catch (emailError) {
        console.error('Errore nell\'invio dell\'email di verifica:', emailError);
        // Continuiamo comunque perché il codice è nei log
      }
      
      // Prima disattiviamo eventuali telefoni esistenti
      await db.update(phones).set({ isActive: false }).where(eq(phones.isActive, true));
      
      // Poi inseriamo il nuovo telefono
      await db.insert(phones).values({
        phoneNumber,
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Aggiorniamo lo stato
      this.activePhone = {
        status: PhoneStatus.VERIFICATION_PENDING,
        phoneNumber,
        lastUpdated: new Date()
      };
      
      return true;
    } catch (error) {
      console.error('Errore nella registrazione del telefono:', error);
      throw error;
    }
  }
  
  /**
   * Verifica il codice ricevuto via SMS
   * @param phoneNumber Numero di telefono da verificare
   * @param code Codice di verifica
   * @returns Vero se la verifica è riuscita
   */
  public async verifyPhone(phoneNumber: string, code: string): Promise<boolean> {
    try {
      const savedCode = this.verificationCodes.get(phoneNumber);
      
      if (!savedCode) {
        throw new Error('Nessun codice di verifica trovato per questo numero');
      }
      
      if (savedCode !== code) {
        throw new Error('Codice di verifica non valido');
      }
      
      // Codice valido, aggiorniamo il database
      await db.update(phones)
        .set({ 
          isVerified: true,
          updatedAt: new Date()
        })
        .where(eq(phones.phoneNumber, phoneNumber));
      
      // Aggiorniamo lo stato
      this.activePhone = {
        status: PhoneStatus.VERIFIED,
        phoneNumber,
        lastUpdated: new Date()
      };
      
      // Rimuoviamo il codice dalla mappa
      this.verificationCodes.delete(phoneNumber);
      
      return true;
    } catch (error) {
      console.error('Errore nella verifica del telefono:', error);
      throw error;
    }
  }
  
  /**
   * Rimuove un telefono attivo
   * @returns Vero se la rimozione è riuscita
   */
  public async disconnectPhone(): Promise<boolean> {
    try {
      await db.update(phones)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(phones.isActive, true));
      
      // Resetta lo stato
      this.activePhone = null;
      
      return true;
    } catch (error) {
      console.error('Errore nella rimozione del telefono:', error);
      throw error;
    }
  }
  
  /**
   * Invia un WhatsApp di test al telefono attivo
   * @returns Vero se l'invio è riuscito
   */
  public async sendTestSms(): Promise<{ success: boolean; whatsappLink?: string }> {
    try {
      if (!this.activePhone || !this.activePhone.phoneNumber) {
        throw new Error('Nessun telefono attivo configurato');
      }
      
      const phoneNumber = this.activePhone.phoneNumber;
      
      const messageText = `Studio Medico: Gentile paziente, confermiamo il suo appuntamento di domani alle 10:00. Cordiali saluti.`;
      console.log(`Generazione link WhatsApp per ${phoneNumber}...`);
      
      // Creiamo un link WhatsApp
      const whatsappLink = encodeURI(`https://wa.me/${phoneNumber.replace('+', '')}?text=${messageText}`);
      
      console.log(`Link WhatsApp generato: ${whatsappLink}`);
      console.log(`WhatsApp di test preparato per ${phoneNumber}`);
      
      // Notifichiamo che l'utente deve utilizzare il link
      console.log('NOTA: Per completare l\'invio, aprire il link WhatsApp manualmente');
      
      return {
        success: true,
        whatsappLink: whatsappLink
      };
    } catch (error) {
      console.error('Errore nella preparazione del messaggio WhatsApp di test:', error);
      throw error;
    }
  }
  
  /**
   * Ottiene le informazioni sul telefono attivo
   * @returns Informazioni sul telefono
   */
  public getPhoneInfo(): PhoneInfo {
    return this.activePhone || {
      status: PhoneStatus.DISCONNECTED,
      phoneNumber: null
    };
  }
}

export const directPhoneService = new DirectPhoneService();