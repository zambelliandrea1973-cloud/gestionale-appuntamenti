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
      
      // Invio immediato del codice via email usando il sistema configurato
      console.log(`📧 Tentativo invio email codice di verifica per ${phoneNumber}: ${verificationCode}`);
      
      try {
        const nodemailer = await import('nodemailer');
        const fs = await import('fs/promises');
        
        // Leggiamo direttamente dalle impostazioni email configurate
        const data = await fs.readFile('email_settings.json', 'utf8');
        const emailSettings = JSON.parse(data);
        
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: emailSettings.emailAddress,
            pass: emailSettings.emailPassword
          }
        });

        await transporter.sendMail({
          from: emailSettings.emailAddress,
          to: emailSettings.emailAddress,
          subject: '🔐 Codice di verifica WhatsApp',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #25d366; margin: 0;">📱 WhatsApp</h1>
                <h2 style="color: #333; margin: 10px 0;">Codice di Verifica</h2>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 15px 0; color: #555;">Il tuo codice di verifica per configurare WhatsApp è:</p>
                <div style="background: #25d366; color: white; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 3px; border-radius: 8px; margin: 15px 0;">
                  ${verificationCode}
                </div>
                <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;"><strong>Numero:</strong> ${phoneNumber}</p>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">⏰ Questo codice è valido per 10 minuti</p>
              </div>
            </div>
          `
        });
        
        console.log(`📧 Email di verifica WhatsApp inviata con successo per ${phoneNumber}`);
        
      } catch (emailError) {
        console.error('❌ Errore invio email di verifica WhatsApp:', emailError);
        console.log(`⚠️ Codice di backup disponibile nei log: ${verificationCode}`);
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