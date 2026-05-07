import { db } from '../db';
import { contactInfo } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Type per the information di contatto
export interface ContactInfo {
  email?: string;
  phone1?: string;
  phone2?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
}

/**
 * Service for managing contact information on PostgreSQL
 */
class ContactService {
  /**
   * Load contact information for the user (per multi-tenant)
   */
  async getContactInfo(userId?: number): Promise<ContactInfo> {
    try {
      if (!userId) {
        return {};
      }

      const contact = await db.query.contactInfo.findFirst({
        where: eq(contactInfo.userId, userId),
      });

      if (!contact) {
        return {};
      }

      return {
        email: contact.email || undefined,
        phone1: contact.phone1 || undefined,
        phone2: contact.phone2 || undefined,
        website: contact.website || undefined,
        facebook: contact.facebook || undefined,
        instagram: contact.instagram || undefined,
      };
    } catch (error) {
      console.error('Error retrieving contact information:', error);
      return {};
    }
  }

  /**
   * Save the contact information in the database
   */
  async saveContactInfo(userId: number, contactInfoData: ContactInfo): Promise<boolean> {
    try {
      if (!userId) {
        console.error('userId missing for saveContactInfo');
        return false;
      }

      const existing = await db.query.contactInfo.findFirst({
        where: eq(contactInfo.userId, userId),
      });

      if (existing) {
        await db.update(contactInfo)
          .set({ ...contactInfoData, updatedAt: new Date() })
          .where(eq(contactInfo.userId, userId));
      } else {
        await db.insert(contactInfo)
          .values({ userId, ...contactInfoData });
      }

      console.log('Contact information saved successfully for user', userId, contactInfoData);
      return true;
    } catch (error) {
      console.error('Error saving contact information:', error);
      return false;
    }
  }
}

// Export singleton instance
export const contactService = new ContactService();
