import { db } from '../db';
import { contactInfo } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Tipo per le informazioni di contatto
export interface ContactInfo {
  email?: string;
  phone1?: string;
  phone2?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
}

/**
 * Servizio per la gestione delle informazioni di contatto su PostgreSQL
 */
class ContactService {
  /**
   * Carica le informazioni di contatto dall'utente (per multi-tenant)
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
      console.error('Errore recupero informazioni contatto:', error);
      return {};
    }
  }

  /**
   * Salva le informazioni di contatto nel database
   */
  async saveContactInfo(userId: number, contactInfoData: ContactInfo): Promise<boolean> {
    try {
      if (!userId) {
        console.error('userId mancante per saveContactInfo');
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

      console.log('Informazioni di contatto salvate con successo per utente', userId, contactInfoData);
      return true;
    } catch (error) {
      console.error('Errore salvataggio informazioni contatto:', error);
      return false;
    }
  }
}

// Esporta istanza singleton
export const contactService = new ContactService();
