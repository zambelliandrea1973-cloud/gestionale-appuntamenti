import { storage } from "../storage";
import { hashPassword } from "../auth";
import { db } from "../db";
import { users } from "../../shared/schema";
import { count, eq } from "drizzle-orm";
import { addDays } from "date-fns";

/**
 * Service for application initialization
 * Handles creating a default administrator account if one does not already exist.
 */
export class InitialSetupService {
  /**
   * Check if users exist in the system
   */
  async hasAnyUsers(): Promise<boolean> {
    try {
      const [result] = await db.select({ count: count() }).from(users);
      return result.count > 0;
    } catch (error) {
      // Fallback to JSON storage when the database is not available
      console.log('Database not available, checking users from JSON storage');
      const fs = await import('fs');
      const path = await import('path');
      const storageFile = path.join(process.cwd(), 'storage_data.json');
      
      if (fs.existsSync(storageFile)) {
        const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
        const userCount = data.users ? data.users.length : 0;
        console.log(`Found ${userCount} users in JSON storage`);
        return userCount > 0;
      }
      
      return false;
    }
  }

  /**
   * Check if a default administrator exists
   */
  async hasDefaultAdmin(): Promise<boolean> {
    const user = await storage.getUserByUsername('admin@gestoreprofessionisti.it');
    return !!user;
  }

  /**
   * Create the default administrator account
   */
  async createDefaultAdmin(email: string, password: string): Promise<void> {
    console.log('Creating initial administrator account...');
    
    try {
      // If the account already exists, do nothing
      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        console.log(`Administrator account ${email} already exists`);
        return;
      }
      
      // Creo l'account amministratore
      const hashedPassword = await hashPassword(password);
      
      // Free trial expiry date (40 days)
      // Free trial expiry date (40 days) - da implementare in licenseService
      
      const admin = await storage.createUser({
        username: email,
        email: email,
        password: hashedPassword,
        role: 'admin',
        type: 'staff'
      });
      
      console.log(`Account amministratore created successfully: ${email}`);
    } catch (error) {
      console.error('Error creating administrator account:', error);
      throw error;
    }
  }

  /**
   * Performs application initialization
   */
  async initialize(): Promise<void> {
    try {
      // Check if there are users in the system
      const hasUsers = await this.hasAnyUsers();
      
      // If there are users, create the default administrator account
      if (!hasUsers) {
        console.log('No user found in the system. Creating default administrator account...');
        await this.createDefaultAdmin('zambelli.andrea.1973@gmail.com', 'gironiCO73%');
      } else {
        console.log('Users already present in the system. No default account created.');
      }
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }
}

// Export a singleton instance of the service
export default new InitialSetupService();