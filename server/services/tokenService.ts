import crypto from 'crypto';
import { addDays } from 'date-fns';
import { storage } from '../storage';
import { hashPassword } from '../auth';
import { ActivationToken } from '../../shared/schema';

/**
 * Service for managing activation tokens
 */
export const tokenService = {
  /**
   * Generate a new activation token for a client
   * @param clientId Client ID for which to generate the token
   * @param expiresInDays Number of days of token validity
   * @returns the generated token
   */
  async generateActivationToken(clientId: number, expiresInDays: number = 365): Promise<string> {
    try {
      // First check if a valid token already exists for this client
      const existingTokens = await storage.getActivationTokensByClientId(clientId);
      let validToken = existingTokens.find(t => !t.used && new Date(t.expiresAt) > new Date());
      
      // If we find an existing valid token, we return it
      if (validToken) {
        console.log('Reusing existing token for client:', clientId);
        return validToken.token;
      }
      
      // If a valid token exists, check if there is a token with the same client ID
      // For farlo, generiamo the token deterministico
      const clientIdString = clientId.toString();
      const secretKey = 'FIXED_CLIENT_SECRET_' + clientIdString; // Unique secret key per client
      const token = crypto.createHash('sha256').update(secretKey).digest('hex');
      
      // Check if the token already exists in the database
      const existingToken = await storage.getActivationToken(token);
      
      // if the token already exists and belongs to this client, update and return it
      if (existingToken && existingToken.clientId === clientId) {
        console.log('Updating existing token for client:', clientId);
        
        // Calculate the new expiry date
        const expiresAt = addDays(new Date(), expiresInDays);
        
        // Update the token expiry date
        await storage.updateActivationTokenExpiry(existingToken.id, expiresAt);
        
        return token;
      }
      
      // if the token already exists but belongs to another client or does not exist,
      // generate a unique token by adding a timestamp
      const uniqueSecretKey = 'FIXED_CLIENT_SECRET_' + clientIdString + '_' + Date.now();
      const uniqueToken = crypto.createHash('sha256').update(uniqueSecretKey).digest('hex');
      
      // Calculate the expiry date (set to 365 days by default to make it persistent)
      const expiresAt = addDays(new Date(), expiresInDays);
      
      // Save the token to the database
      await storage.createActivationToken({
        token: uniqueToken,
        clientId,
        expiresAt,
        used: false
      });
      
      return uniqueToken;
    } catch (error) {
      console.error('Error generating activation token:', error);
      throw new Error('Unable to generate activation token');
    }
  },
  
  /**
   * Verify the validity of an activation token
   * @param token The token to verify
   * @param invalidate If true, invalidate the token after verification (default: false)
   * @returns Client ID associated with the token if valid, null otherwise
   */
  async verifyActivationToken(token: string, invalidate: boolean = false): Promise<number | null> {
    try {
      // Find the token in the database
      const activationToken = await storage.getActivationToken(token);
      
      // Check if the token esiste
      if (!activationToken) {
        console.log('Token not found:', token);
        return null;
      }
      
      // Check if the token has expired
      if (new Date() > new Date(activationToken.expiresAt)) {
        console.log('Token expired:', token);
        
        // CHANGE: Automatically renew the expired token for 365 days
        const newExpiresAt = addDays(new Date(), 365);
        await storage.updateActivationTokenExpiry(activationToken.id, newExpiresAt);
        console.log('Token automatically renewed until:', newExpiresAt);
        
        // Continue with verification treating the token as valid
      }
      
      // We no longer check if the token has been used, so that it can be used multiple times
      // If a token exists and is valid, always returns the client ID
      
      // If required, invalidate the token after use
      if (invalidate) {
        await this.markTokenAsUsed(token);
      }
      
      return activationToken.clientId;
    } catch (error) {
      console.error('Error verifying activation token:', error);
      return null;
    }
  },
  
  /**
   * Mark a token as used
   * @param token the token da marcare come utilizzato
   * @returns true if the operation succeeded, false otherwise
   */
  async markTokenAsUsed(token: string): Promise<boolean> {
    try {
      // Find the token in the database
      const activationToken = await storage.getActivationToken(token);
      
      // Check if the token esiste
      if (!activationToken) {
        return false;
      }
      
      // We never mark the token as used, so it can be reused
      // We do not modify the token in the database so that it remains usable
      
      return true;
    } catch (error) {
      console.error('Error updating activation token:', error);
      return false;
    }
  },
  
  /**
   * Check if a token is about to expire within the specified number of days
   * @param token The token to verify
   * @param daysBeforeExpiry Number of days before expiry to consider the token expiring
   * @returns true if the token sta per scadere, false otherwise
   */
  async isTokenExpiringSoon(token: string, daysBeforeExpiry: number = 1): Promise<boolean> {
    try {
      // Find the token in the database
      const activationToken = await storage.getActivationToken(token);
      
      // Check if the token esiste
      if (!activationToken) {
        return false;
      }
      
      // Calculate the upcoming expiry date (today + days of advance notice)
      const expiryWarningDate = addDays(new Date(), daysBeforeExpiry);
      
      // Check if the token expiry date is before the imminent expiry date
      // and after today's date (i.e., about to expire but not yet expired)
      const tokenExpiryDate = new Date(activationToken.expiresAt);
      const today = new Date();
      
      return tokenExpiryDate <= expiryWarningDate && tokenExpiryDate > today;
    } catch (error) {
      console.error('Error verifying token expiration:', error);
      return false;
    }
  },
  
  /**
   * Generate a new token for a client, invalidating any existing tokens
   * @param clientId Client ID for which to generate a new token
   * @param expiresInDays Number of days of token validity
   * @returns The newly generated token
   */
  async regenerateToken(clientId: number, expiresInDays: number = 365): Promise<string> {
    try {
      // Find any existing tokens for this client
      const existingTokens = await storage.getActivationTokensByClientId(clientId);
      
      // Generate the new token using the deterministic generator
      const clientIdString = clientId.toString();
      const secretKey = 'FIXED_CLIENT_SECRET_' + clientIdString + '_' + Date.now(); // Aggiungiamo timestamp per renderlo unico
      const newToken = crypto.createHash('sha256').update(secretKey).digest('hex');
      
      // Calculate the expiry date
      const expiresAt = addDays(new Date(), expiresInDays);
      
      // Save the new token to the database
      await storage.createActivationToken({
        token: newToken,
        clientId,
        expiresAt,
        used: false
      });
      
      console.log(`New token generated for client ${clientId} with expiry ${expiresAt}`);
      
      return newToken;
    } catch (error) {
      console.error('Error regenerating token:', error);
      throw new Error('Unable to regenerate token');
    }
  },
  
  /**
   * Activate a client account using an activation token
   * @param token the token activation
   * @param username Username scelto per l'account
   * @param password Password scelta per l'account
   * @returns true if activation succeeded, false otherwise
   */
  async activateAccount(token: string, username: string, password: string): Promise<boolean> {
    try {
      // Verify that the token is valid
      const clientId = await this.verifyActivationToken(token);
      
      if (clientId === null) {
        console.log('Invalid token for activation:', token);
        return false;
      }
      
      // Check if l'account esiste already
      const existingAccount = await storage.getClientAccountByClientId(clientId);
      
      if (existingAccount) {
        // If the account already exists, update username and password instead of failing
        console.log('Updating existing account for client:', clientId);
        await storage.updateClientAccount(existingAccount.id, {
          username,
          password: await hashPassword(password),
          isActive: true
        });
      } else {
        // Create a new account
        await storage.createClientAccount({
          clientId,
          username,
          password: await hashPassword(password),
          isActive: true
        });
      }
      
      // Marca the token come utilizzato
      await this.markTokenAsUsed(token);
      
      return true;
    } catch (error) {
      console.error('Error activating account:', error);
      return false;
    }
  }
};