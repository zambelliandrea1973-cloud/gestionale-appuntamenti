/**
 * Identity problem correction script
 * This script contains functions to verify and fix 
 * identity confusion issues between users
 */

import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface UserIdentity {
  id: number;
  username: string;
  email: string;
  type?: string;
  role?: string;
}

/**
 * Check if the user is subject to identity confusion
 * @param userId ID of the user to verify
 * @param usernameToVerify Username to verify (optional)
 */
export async function verifyIdentity(userId: number, usernameToVerify?: string): Promise<boolean> {
  // Get the user from the database
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  // If there is no username to verify, simply return the user data
  if (!usernameToVerify) {
    return true;
  }
  
  // Check if there is a match
  return user?.username === usernameToVerify;
}

/**
 * Corrects identity for specific users that are subject to confusion
 * @param userId ID of the user
 * @param sessionType User type in the session
 */
export async function correctIdentityIfNeeded(userId: number, sessionType: string): Promise<UserIdentity | null> {
  // Check if the user is testpayment@example.com but should be zambelli.andrea.1973D
  if (userId === 18 && sessionType === 'customer') {
    console.log(`⚠️ Identity problem detected: User ID ${userId} (testpayment) might be confused with zambelli.andrea.1973D`);
    
    // Find the correct user for zambelli.andrea.1973D
    const [correctUser] = await db.select().from(users).where(eq(users.username, 'zambelli.andrea.1973D@gmail.com'));
    
    if (correctUser) {
      console.log(`✅ Identity fix: Found correct user zambelli.andrea.1973D with ID ${correctUser.id}`);
      return {
        id: correctUser.id, 
        username: correctUser.username,
        email: correctUser.email,
        type: 'customer',
        role: 'business'
      };
    }
  }
  
  // IMPORTANT: DO NOT correct ID 16 which is Elisa Faverio, not Zambelli
  // This is a fix for backup14, we maintain the correct identity
  if (userId === 16 && (sessionType === 'staff' || sessionType === 'customer')) {
    // Verify che sia davvero Elisa Faverio
    const [elisaUser] = await db.select().from(users).where(eq(users.id, 16));
    
    if (elisaUser && elisaUser.username === 'faverioelisa6@gmail.com') {
      console.log(`✅ Confirmed correct identity: ID 16 is Elisa Faverio`);
      // We do not make corrections, we leave the correct identity
      return null;
    }
  }
  
  // Account A: Aggiungiamo supporto per zambelli.andrea.1973A@gmail.com
  if (userId === 9 && sessionType === 'customer') {
    // Verify che sia davvero l'account A
    const [userA] = await db.select().from(users).where(eq(users.username, 'zambelli.andrea.1973A@gmail.com'));
    
    if (userA) {
      console.log(`🔄 Maintaining correct identity for account A with ID ${userA.id}`);
      return {
        id: userA.id,
        username: userA.username,
        email: userA.email,
        type: 'customer',
        role: userA.role || 'user'
      };
    }
  }
  
  // Account C: Aggiungiamo supporto per zambelli.andrea.1973C@gmail.com
  if (userId === 11 && sessionType === 'customer') {
    // Verify che sia davvero l'account C
    const [userC] = await db.select().from(users).where(eq(users.username, 'zambelli.andrea.1973C@gmail.com'));
    
    if (userC) {
      console.log(`🔄 Maintaining correct identity for account C with ID ${userC.id}`);
      return {
        id: userC.id,
        username: userC.username,
        email: userC.email,
        type: 'customer',
        role: userC.role || 'user'
      };
    }
  }
  
  return null;
}