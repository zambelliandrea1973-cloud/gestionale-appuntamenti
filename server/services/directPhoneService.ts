import { logger } from '../utils/logger';
/**
 * Service for direct management of phone numbers for SMS sending
 * This approach replaces QR code pairing
 */

import { db } from '../db';
import { eq } from 'drizzle-orm';
import { phones } from '../../shared/schema';
import { twilioClient } from './twilioService';

// Device states
enum PhoneStatus {
  DISCONNECTED = 'disconnected',
  VERIFICATION_PENDING = 'verification_pending',
  VERIFIED = 'verified',
  CONNECTED = 'connected'
}

// Interface for phone information
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
    console.log('Direct phone service initialized');
  }
  
  /**
   * Load the saved phone from the database
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
        
        console.log(`Phone number loaded from database: ${phone.phoneNumber}`);
      } else {
        this.activePhone = null;
        console.log('No active phone found in database');
      }
    } catch (error) {
      console.error('Error loading phone from database:', error);
      this.activePhone = null;
    }
  }
  
  /**
   * Register a new phone number
   * @param phoneNumber Phone number to register
   * @returns True if registration succeeded
   */
  public async registerPhone(phoneNumber: string): Promise<boolean> {
    try {
      // Check that the number is formatted correctly
      if (!phoneNumber.startsWith('+')) {
        throw new Error('Phone number must start with international prefix (+)');
      }
      
      // Generate a verification code (6 random digits)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      this.verificationCodes.set(phoneNumber, verificationCode);
      
      // In a real implementation, we send the SMS with the verification code
      // In this demo version, we simply simulate it
      console.log(`Verification code for ${phoneNumber}: ${verificationCode}`);
      
      // Immediate code delivery via email using the configured system
      logger.debug(`📧 Attempting to send verification code email for ${phoneNumber}: ${verificationCode}`);
      
      try {
        const nodemailer = await import('nodemailer');
        const fs = await import('fs/promises');
        
        // Read directly from the configured email settings
        const data = await fs.readFile('email_settings.json', 'utf8');
        const emailSettings = JSON.parse(data);
        
        const transporter = nodemailer.default.createTransport({
          service: 'gmail',
          auth: {
            user: emailSettings.emailAddress,
            pass: emailSettings.emailPassword
          }
        });

        await transporter.sendMail({
          from: emailSettings.emailAddress,
          to: emailSettings.emailAddress,
          subject: '🔐 WhatsApp Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #25d366; margin: 0;">📱 WhatsApp</h1>
                <h2 style="color: #333; margin: 10px 0;">Verification Code</h2>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 15px 0; color: #555;">Your verification code to set up WhatsApp is:</p>
                <div style="background: #25d366; color: white; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 3px; border-radius: 8px; margin: 15px 0;">
                  ${verificationCode}
                </div>
                <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;"><strong>Number:</strong> ${phoneNumber}</p>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">⏰ This code is valid for 10 minutes</p>
              </div>
            </div>
          `
        });
        
        logger.debug(`📧 WhatsApp verification email sent successfully for ${phoneNumber}`);
        
      } catch (emailError) {
        console.error('❌ Error sending WhatsApp verification email:', emailError);
        console.log(`⚠️ Backup code available in logs: ${verificationCode}`);
      }
      
      // First deactivate any existing phones
      await db.update(phones).set({ isActive: false }).where(eq(phones.isActive, true));
      
      // Then insert the new phone
      await db.insert(phones).values({
        phoneNumber,
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Update the status
      this.activePhone = {
        status: PhoneStatus.VERIFICATION_PENDING,
        phoneNumber,
        lastUpdated: new Date()
      };
      
      return true;
    } catch (error) {
      console.error('Error registering phone:', error);
      throw error;
    }
  }
  
  /**
   * Verify the code received via SMS
   * @param phoneNumber Phone number to verify
   * @param code Verification code
   * @returns True if verification succeeded
   */
  public async verifyPhone(phoneNumber: string, code: string): Promise<boolean> {
    try {
      const savedCode = this.verificationCodes.get(phoneNumber);
      
      if (!savedCode) {
        throw new Error('No verification code found for this number');
      }
      
      if (savedCode !== code) {
        throw new Error('Invalid verification code');
      }
      
      // Code is valid, update the database
      await db.update(phones)
        .set({ 
          isVerified: true,
          updatedAt: new Date()
        })
        .where(eq(phones.phoneNumber, phoneNumber));
      
      // Update the status
      this.activePhone = {
        status: PhoneStatus.VERIFIED,
        phoneNumber,
        lastUpdated: new Date()
      };
      
      // Remove the code from the map
      this.verificationCodes.delete(phoneNumber);
      
      return true;
    } catch (error) {
      console.error('Error verifying phone:', error);
      throw error;
    }
  }
  
  /**
   * Remove an active phone
   * @returns True if removal succeeded
   */
  public async disconnectPhone(): Promise<boolean> {
    try {
      await db.update(phones)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(phones.isActive, true));
      
      // Resetta the status
      this.activePhone = null;
      
      return true;
    } catch (error) {
      console.error('Error removing phone:', error);
      throw error;
    }
  }
  
  /**
   * Send a test WhatsApp to the active phone
   * @returns True if sending succeeded
   */
  public async sendTestSms(): Promise<{ success: boolean; whatsappLink?: string }> {
    try {
      if (!this.activePhone || !this.activePhone.phoneNumber) {
        throw new Error('No active phone configured');
      }
      
      const phoneNumber = this.activePhone.phoneNumber;
      
      const messageText = `Gestionale Appuntamenti: Dear patient, we confirm your appointment tomorrow at 10:00. Best regards.`;
      console.log(`Generating WhatsApp link for ${phoneNumber}...`);
      
      // Create a WhatsApp link
      const whatsappLink = encodeURI(`https://wa.me/${phoneNumber.replace('+', '')}?text=${messageText}`);
      
      console.log(`WhatsApp link generated: ${whatsappLink}`);
      console.log(`Test WhatsApp prepared for ${phoneNumber}`);
      
      // Notify that the user must use the link
      console.log('NOTE: To complete the send, open the WhatsApp link manually');
      
      return {
        success: true,
        whatsappLink: whatsappLink
      };
    } catch (error) {
      console.error('Error preparing test WhatsApp message:', error);
      throw error;
    }
  }
  
  /**
   * Get information about the active phone
   * @returns Phone information
   */
  public getPhoneInfo(): PhoneInfo {
    return this.activePhone || {
      status: PhoneStatus.DISCONNECTED,
      phoneNumber: null
    };
  }
}

export const directPhoneService = new DirectPhoneService();