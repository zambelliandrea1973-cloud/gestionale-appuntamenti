import { randomBytes } from 'crypto';
import { storage } from '../storage';
import { InsertBetaInvitation, InsertBetaFeedback } from '../../shared/schema';

/**
 * Service for managing beta testers
 */
export class BetaService {
  /**
   * Generate a unique invitation code
   */
  static generateInvitationCode(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Create a new invitation for beta testers
   */
  static async createInvitation(email: string, notes?: string, maxUses: number = 1, expiryDays: number = 30): Promise<{success: boolean, code?: string, message?: string}> {
    try {
      console.log('Creating beta invitation for:', { email, maxUses, expiryDays });
      
      // Parameter validation
      if (!email || email.trim() === '') {
        console.error('Error: Email missing when creating invitation');
        return {
          success: false,
          message: 'Email required to create invitation'
        };
      }
      
      if (maxUses < 1) {
        console.error('Error: Invalid number of uses:', maxUses);
        return {
          success: false,
          message: 'The maximum number of uses must be at least 1'
        };
      }
      
      // Generate the invitation code
      const invitationCode = this.generateInvitationCode();
      
      // Set the invitation expiration based on the specified days
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expiryDays);
      
      console.log('Preparing invitation data:', { 
        email, 
        invitationCode,
        expiryDays,
        expirationDate: expirationDate.toISOString()
      });
      
      // Create the invitation
      const invitation: InsertBetaInvitation = {
        email,
        invitationCode,
        expiresAt: expirationDate,
        isUsed: false,
        notes,
        usedById: null,
        usedCount: 0,
        maxUses: maxUses
      };
      
      const newInvitation = await storage.createBetaInvitation(invitation);
      console.log('Invitation created successfully:', { id: newInvitation.id, code: newInvitation.invitationCode });
      
      return {
        success: true,
        code: newInvitation.invitationCode
      };
    } catch (error) {
      console.error('Error creating beta invitation:', error);
      return {
        success: false,
        message: 'Error creating beta invitation: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Verify the validity of an invitation code
   */
  static async verifyInvitationCode(code: string): Promise<{valid: boolean, message?: string, invitation?: any}> {
    try {
      const invitation = await storage.getBetaInvitation(code);
      
      if (!invitation) {
        return {
          valid: false,
          message: 'Invitation code not found'
        };
      }
      
      if (invitation.isUsed) {
        return {
          valid: false,
          message: 'This invitation code has already been used'
        };
      }
      
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return {
          valid: false,
          message: 'This invitation code has expired'
        };
      }
      
      return {
        valid: true,
        invitation
      };
    } catch (error) {
      console.error('Error verifying invitation code:', error);
      return {
        valid: false,
        message: 'Error verifying invitation code'
      };
    }
  }

  /**
   * Mark an invitation code as used
   */
  static async markInvitationAsUsed(code: string, userId: number): Promise<boolean> {
    try {
      const updatedInvitation = await storage.markBetaInvitationAsUsed(code, userId);
      return !!updatedInvitation;
    } catch (error) {
      console.error('Error marking invitation code as used:', error);
      return false;
    }
  }

  /**
   * Send feedback from a beta tester
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
      console.error('Error sending feedback:', error);
      return {
        success: false,
        message: 'Error sending feedback'
      };
    }
  }

  /**
   * Get all feedback with details of the user
   */
  static async getAllFeedbacks() {
    try {
      return await storage.getAllBetaFeedback();
    } catch (error) {
      console.error('Error retrieving feedback:', error);
      return [];
    }
  }

  /**
   * Update the status of a feedback entry
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
      console.error('Error updating feedback status:', error);
      return false;
    }
  }
}