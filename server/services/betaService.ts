import { randomBytes } from 'crypto';
import { storage } from '../storage';
import { InsertBetaInvitation, InsertBetaFeedback } from '@shared/schema';

/**
 * Servizio per la gestione dei beta tester
 */
export class BetaService {
  /**
   * Genera un codice di invito univoco
   */
  static generateInvitationCode(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Crea un nuovo invito per beta tester
   */
  static async createInvitation(email: string, notes?: string, maxUses: number = 1, expiryDays: number = 30): Promise<{success: boolean, code?: string, message?: string}> {
    try {
      // Genera il codice di invito
      const invitationCode = this.generateInvitationCode();
      
      // Imposta la scadenza dell'invito in base ai giorni specificati
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expiryDays);
      
      // Crea l'invito
      const invitation: InsertBetaInvitation = {
        email,
        invitationCode,
        expiresAt: expirationDate,
        isUsed: false,
        notes,
        usedById: null
      };
      
      const newInvitation = await storage.createBetaInvitation(invitation);
      
      return {
        success: true,
        code: newInvitation.invitationCode
      };
    } catch (error) {
      console.error('Errore durante la creazione dell\'invito beta:', error);
      return {
        success: false,
        message: 'Errore durante la creazione dell\'invito beta: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Verifica la validità di un codice di invito
   */
  static async verifyInvitationCode(code: string): Promise<{valid: boolean, message?: string, invitation?: any}> {
    try {
      const invitation = await storage.getBetaInvitation(code);
      
      if (!invitation) {
        return {
          valid: false,
          message: 'Codice di invito non trovato'
        };
      }
      
      if (invitation.isUsed) {
        return {
          valid: false,
          message: 'Questo codice di invito è già stato utilizzato'
        };
      }
      
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return {
          valid: false,
          message: 'Questo codice di invito è scaduto'
        };
      }
      
      return {
        valid: true,
        invitation
      };
    } catch (error) {
      console.error('Errore durante la verifica del codice di invito:', error);
      return {
        valid: false,
        message: 'Errore durante la verifica del codice di invito'
      };
    }
  }

  /**
   * Segna un codice di invito come utilizzato
   */
  static async markInvitationAsUsed(code: string, userId: number): Promise<boolean> {
    try {
      const updatedInvitation = await storage.markBetaInvitationAsUsed(code, userId);
      return !!updatedInvitation;
    } catch (error) {
      console.error('Errore durante il contrassegno del codice di invito come utilizzato:', error);
      return false;
    }
  }

  /**
   * Invia feedback da parte di un beta tester
   */
  static async submitFeedback(userId: number, feedback: {
    feedbackType: string;
    content: string;
    rating?: number;
    screenshot?: string;
  }): Promise<{success: boolean, message?: string}> {
    try {
      const feedbackData: InsertBetaFeedback = {
        userId,
        feedbackType: feedback.feedbackType,
        content: feedback.content,
        rating: feedback.rating,
        screenshot: feedback.screenshot,
        status: 'pending'
      };
      
      await storage.createBetaFeedback(feedbackData);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Errore durante l\'invio del feedback:', error);
      return {
        success: false,
        message: 'Errore durante l\'invio del feedback'
      };
    }
  }

  /**
   * Ottiene tutti i feedback con i dettagli dell'utente
   */
  static async getAllFeedbacks() {
    try {
      return await storage.getAllBetaFeedback();
    } catch (error) {
      console.error('Errore durante il recupero dei feedback:', error);
      return [];
    }
  }

  /**
   * Aggiorna lo stato di un feedback
   */
  static async updateFeedbackStatus(id: number, status: string, reviewedBy: number): Promise<boolean> {
    try {
      const feedback = await storage.updateBetaFeedback(id, {
        status,
        reviewedBy,
        reviewedAt: new Date()
      });
      return !!feedback;
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dello stato del feedback:', error);
      return false;
    }
  }
}