// @ts-nocheck
/**
 * Service for managing licenses
 * 
 * This service manages:
 * - Verify the license status (trial, base, pro)
 * - Generation of activation codes
 * - License activation
 * - Verify trial period expiration
 */

import * as crypto from 'crypto';
import { db } from '../db';
import { eq, lt, and } from 'drizzle-orm';
import { licenses, users } from '../../shared/schema';
import { SQL } from 'drizzle-orm';

// Enumeration of license types
export enum LicenseType {
  TRIAL = 'trial',
  BASE = 'base',
  PRO = 'pro',
  BUSINESS = 'business',
  STAFF_FREE = 'staff_free', // Free 10-year license for staff
  PASSEPARTOUT = 'passepartout'  // Full access to all features without limitations
}

// Duration in days of the periods
const LICENSE_DURATIONS = {
  [LicenseType.TRIAL]: 40, // 40-day trial
  [LicenseType.BASE]: 365, // Base 1-year subscription
  [LicenseType.PRO]: 365, // Pro 1-year subscription
  [LicenseType.BUSINESS]: 365, // Business 1-year subscription
  [LicenseType.STAFF_FREE]: 365 * 10, // 10-year license for staff
  [LicenseType.PASSEPARTOUT]: null, // Permanent passepartout subscription without expiration
};

export interface LicenseInfo {
  type: LicenseType;
  expiresAt: Date | null;
  isActive: boolean;
  daysLeft: number | null;
}

const licenseCache = new Map<number, { info: LicenseInfo; expiry: number }>();
const LICENSE_CACHE_TTL = 60_000;

class LicenseService {
  /**
   * Generate a code activation for a license
   */
  async generateActivationCode(licenseType: LicenseType): Promise<string> {
    // Generate a unique 16-character code
    const randomBytes = crypto.randomBytes(8);
    const activationCode = randomBytes.toString('hex').toUpperCase();
    
    // Calculate the expiry date (if applicable)
    let expiresAt = null;
    if (LICENSE_DURATIONS[licenseType] !== null) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + LICENSE_DURATIONS[licenseType]);
    }
    
    // Insert the code into the database
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
   * Activate a license with an activation code
   */
  async activateLicense(activationCode: string): Promise<{ success: boolean, message: string }> {
    // Normalize the code (remove spaces and convert to uppercase)
    const normalizedCode = activationCode.replace(/\s/g, '').toUpperCase();
    
    // Find the license in the database
    const [license] = await db.select().from(licenses).where(eq(licenses.code, normalizedCode));
    
    if (!license) {
      return { success: false, message: 'Invalid activation code' };
    }
    
    // Passepartout codes are always usable, even if already activated
    if (license.type !== LicenseType.PASSEPARTOUT && license.isActive) {
      return { success: false, message: 'This code has already been activated' };
    }
    
    // If it is already active or is a passepartout, update the status
    if (!license.isActive) {
      await db.update(licenses)
        .set({ 
          isActive: true,
          activatedAt: new Date(),
        })
        .where(eq(licenses.code, normalizedCode));
    }
    
    // Set this license as the current one
    await this.setCurrentLicense(normalizedCode);
    
    licenseCache.clear();
    
    return { 
      success: true, 
      message: `License ${license.type} activated successfully` 
    };
  }
  
  /**
   * Set a license as the current one in the system
   */
  async setCurrentLicense(activationCode: string): Promise<void> {
    // In a real implementation, you should have a table or a configuration key
    // that stores the current license ID. For simplicity, we use a temporary JSON file.
    const normalizedCode = activationCode.replace(/\s/g, '').toUpperCase();
    
    // Find the license in the database
    const [license] = await db.select().from(licenses).where(eq(licenses.code, normalizedCode));
    
    if (!license) {
      throw new Error('License not found');
    }
    
    // Here we set this license as the current one
    // For now, set an environment variable or a global configuration
    process.env.CURRENT_LICENSE_CODE = normalizedCode;
    process.env.CURRENT_LICENSE_TYPE = license.type;
  }
  
  /**
   * Get information about the current license
   * If userId is provided, look for licenses specific to that user
   */
  clearLicenseCache(userId?: number) {
    if (userId) {
      licenseCache.delete(userId);
    } else {
      licenseCache.clear();
    }
  }

  async getCurrentLicenseInfo(userId?: number): Promise<LicenseInfo> {
    if (userId) {
      const cached = licenseCache.get(userId);
      if (cached && Date.now() < cached.expiry) {
        return cached.info;
      }

      try {
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
          const daysLeft = this.calculateDaysLeft(userLicense.expiresAt);
          const info: LicenseInfo = {
            type: userLicense.type as LicenseType,
            expiresAt: userLicense.expiresAt,
            isActive: true,
            daysLeft
          };
          licenseCache.set(userId, { info, expiry: Date.now() + LICENSE_CACHE_TTL });
          return info;
        }
      } catch (error) {
        console.error('Error retrieving user license:', error);
      }
    }
    
    // Proceed with the normal method if there is a userId or if licenses were found
    // Try to load the current license
    const currentLicenseCode = process.env.CURRENT_LICENSE_CODE;
    
    // If there is a current license, we consider the user to be in trial
    if (!currentLicenseCode) {
      // Check if a trial license exists
      const [trialLicense] = await db.select()
        .from(licenses)
        .where(eq(licenses.type, LicenseType.TRIAL));
      
      // If it exists, create a new trial license
      if (!trialLicense) {
        // Create a new trial license
        const trialCode = await this.generateActivationCode(LicenseType.TRIAL);
        // Immediately activate the trial license
        await this.activateLicense(trialCode);
        // Reload the license
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
        // Use the existing trial license
        const daysLeft = this.calculateDaysLeft(trialLicense.expiresAt);
        return {
          type: LicenseType.TRIAL,
          expiresAt: trialLicense.expiresAt,
          isActive: trialLicense.isActive === true,
          daysLeft
        };
      }
    }
    
    // Load the license from the database
    const [license] = await db.select()
      .from(licenses)
      .where(eq(licenses.code, currentLicenseCode as string));
    
    if (!license) {
      // Fallback to TRIAL if the license does not exist
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
   * Check if the current license has expired
   */
  async isCurrentLicenseExpired(): Promise<boolean> {
    const licenseInfo = await this.getCurrentLicenseInfo();
    
    if (!licenseInfo.expiresAt) {
      return false;
    }
    
    return licenseInfo.expiresAt < new Date();
  }
  
  /**
   * Check if the user has access to PRO features
   */
  async hasProAccess(): Promise<boolean> {
    // Get the current user from the request (if available)
    if (global.currentRequest && global.currentRequest.user) {
      // If the user is of type staff or admin, they automatically have PRO access
      if (global.currentRequest.user.type === 'staff' || global.currentRequest.user.type === 'admin') {
        return true;
      }
    }
    
    // If it is staff or admin, verify the license type
    const licenseInfo = await this.getCurrentLicenseInfo();
    
    // Verify that the license is active and not expired
    const isActive = licenseInfo.isActive && (licenseInfo.expiresAt === null || licenseInfo.expiresAt > new Date());
    
    // Access allowed for PRO, BUSINESS, STAFF_FREE and PASSEPARTOUT licenses
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
   * Check if the user has access to BUSINESS features
   */
  async hasBusinessAccess(): Promise<boolean> {
    // Get the current user from the request (if available)
    if (global.currentRequest && global.currentRequest.user) {
      // If the user is of type staff or admin, they automatically have BUSINESS access
      if (global.currentRequest.user.type === 'staff' || global.currentRequest.user.type === 'admin') {
        return true;
      }
    }
    
    // If it is staff or admin, verify the license type
    const licenseInfo = await this.getCurrentLicenseInfo();
    
    // Verify that the license is active and not expired
    const isActive = licenseInfo.isActive && (licenseInfo.expiresAt === null || licenseInfo.expiresAt > new Date());
    
    // Access allowed for BUSINESS and PASSEPARTOUT licenses
    if (isActive && (
        licenseInfo.type === LicenseType.BUSINESS || 
        licenseInfo.type === LicenseType.PASSEPARTOUT
      )) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate the remaining days before expiration
   */
  private calculateDaysLeft(expiresAt: Date | null): number | null {
    if (!expiresAt) return null;
    
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
  
  /**
   * Get the application title based on the license type
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
   * Create a trial license for a user
   */
  async createTrialLicense(userId: number, expiresAt: Date): Promise<void> {
    try {
      // Generate a unique code for the trial license
      const randomBytes = crypto.randomBytes(8);
      const trialCode = `TRIAL-${randomBytes.toString('hex').toUpperCase()}`;
      
      // Check if the user is an administrator
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      // If the user is an administrator, create a permanent passepartout license
      if (user && user.role === 'admin') {
        await db.insert(licenses).values({
          code: '0103 1973 2009 1979', // Codice fisso per amministratori
          type: LicenseType.PASSEPARTOUT,
          isActive: true,
          createdAt: new Date(),
          expiresAt: null, // No expiration
          activatedAt: new Date(),
          userId
        });
        
        console.log(`Permanent PASSEPARTOUT license created for administrator ${userId}`);
        
        // Set this license as the current one for user
        process.env.CURRENT_LICENSE_CODE = '0103 1973 2009 1979';
        process.env.CURRENT_LICENSE_TYPE = LicenseType.PASSEPARTOUT;
      } else {
        // For regular users, create a trial license with expiry
        await db.insert(licenses).values({
          code: trialCode,
          type: LicenseType.TRIAL,
          isActive: true,
          createdAt: new Date(),
          expiresAt,
          activatedAt: new Date(),
          userId // Associamo the license to the user
        });
        
        console.log(`Trial license created with code ${trialCode} for user ${userId}, expiry: ${expiresAt.toISOString()}`);
        
        // Set this license as the current one for user
        process.env.CURRENT_LICENSE_CODE = trialCode;
        process.env.CURRENT_LICENSE_TYPE = LicenseType.TRIAL;
      }
    } catch (error) {
      console.error('Error creating trial license:', error);
      throw error;
    }
  }

  /**
   * Generate a 10-year license for a staff member
   * Only the administrator can generate these special licenses
   */
  async generateStaffLicense(userId: number, licenseType: LicenseType, expiresAt: Date): Promise<string> {
    try {
      // Generate a unique code with STAFF- prefix
      const randomBytes = crypto.randomBytes(6);
      const staffCode = `STAFF-${randomBytes.toString('hex').toUpperCase()}`;
      
      // Insert the license into the database
      await db.insert(licenses).values({
        code: staffCode,
        type: licenseType,
        isActive: true,
        createdAt: new Date(),
        expiresAt, // 10-year expiry
        activatedAt: new Date(),
        userId
      });
      
      console.log(`10-year staff license created with code ${staffCode} for user ${userId}, expiry: ${expiresAt.toISOString()}`);
      
      return staffCode;
    } catch (error) {
      console.error('Error creating staff license:', error);
      throw error;
    }
  }

  /**
   * Extends the trial period by 40 days
   * Only administrators can use this function
   */
  async extendTrial(userId: number): Promise<{ success: boolean, message: string, newExpiresAt?: Date }> {
    try {
      // Find the most recent license of the user (any type)
      const [userLicense] = await db.select()
        .from(licenses)
        .where(eq(licenses.userId, userId))
        .orderBy(licenses.createdAt, 'desc')
        .limit(1);

      if (!userLicense) {
        return {
          success: false,
          message: 'No license found for this user'
        };
      }

      // Calculate the new expiry date: 40 days ADDED to the current expiry or today if already expired
      // This allows cumulative extensions (each click actually adds 40 days)
      const now = new Date();
      const currentExpiry = userLicense.expiresAt ? new Date(userLicense.expiresAt) : now;
      
      // Use the most recent date between existing expiry and today as base
      const baseDate = currentExpiry > now ? currentExpiry : now;
      
      // Add 40 days to the base
      const newExpiresAt = new Date(baseDate);
      newExpiresAt.setDate(newExpiresAt.getDate() + 40);

      // Update the license
      await db.update(licenses)
        .set({
          expiresAt: newExpiresAt,
          isActive: true // Reactivate even if it was disabled
        })
        .where(eq(licenses.id, userLicense.id));

      console.log(`✅ Trial extended for user ${userId}: new expiry ${newExpiresAt.toISOString()}`);

      return {
        success: true,
        message: `Trial extended by 40 days. New expiry: ${newExpiresAt.toLocaleDateString()}`,
        newExpiresAt
      };
    } catch (error) {
      console.error('Error extending trial:', error);
      return {
        success: false,
        message: 'Error extending trial'
      };
    }
  }

  /**
   * Revoke an existing license
   */
  async revokeLicense(licenseId: number): Promise<void> {
    try {
      // Deactivate the license without deleting it from the database (to maintain history)
      await db.update(licenses)
        .set({ 
          isActive: false
        })
        .where(eq(licenses.id, licenseId));
      
      console.log(`license ${licenseId} revoked`);
    } catch (error) {
      console.error('Error revoking license:', error);
      throw error;
    }
  }
}

export const licenseService = new LicenseService();