// @ts-nocheck
import { logger } from '../utils/logger';
/**
 * ClientLoginService - Centralized service for managing client authentication
 * Provides advanced functionality, support for token-based authentication
 * e metodi alternativi per adattarsi a dispositivi mobili e PWA.
 */

import { storage } from "../storage";
import { comparePasswords, hashPassword } from "../auth";
import { tokenService } from "./tokenService";

class ClientLoginService {
  /**
   * Verify client credentials via different possible methods
   */
  async verifyCredentials(
    username: string,
    password?: string,
    token?: string,
    clientId?: number,
    bypassAuth = false
  ) {
    try {
      // Log completo per tracciare the attempts
      console.log("Verifying credentials:", {
        username,
        hasPassword: !!password,
        hasToken: !!token,
        clientId,
        bypassAuth
      });
      
      // Find the user based on the username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.warn(`User not found: ${username}`);
        return null;
      }
      
      // Verify that it is a user of type client
      if (user.type !== "client") {
        console.warn(`Invalid user type: ${user.type}`);
        return null;
      }
      
      // Get the client associated with the user
      const client = await storage.getClient(user.clientId);
      
      if (!client) {
        console.warn(`Client not found for user: ${username}`);
        return null;
      }
      
      // If bypassAuth is true and we have a valid token, skip password verification
      if (bypassAuth && token) {
        // Verify the token and clientId directly
        const isValid = await this.verifyToken(token, user.clientId);
        
        if (isValid) {
          console.log(`Token verified correctly for: ${username}`);
          return { ...user, client };
        } else {
          console.warn(`Invalid token for: ${username}`);
          return null;
        }
      }
      
      // If we have a password, verify it
      if (password) {
        const isPasswordValid = await comparePasswords(password, user.password);
        
        if (!isPasswordValid) {
          console.warn(`Password invalid per: ${username}`);
          return null;
        }
      }
      // If we have neither password nor token bypass, fail
      else if (!bypassAuth || !token) {
        console.warn("No authentication method provided");
        return null;
      }
      
      console.log(`Authentication completed successfully for: ${username}`);
      return { ...user, client };
    } catch (error: any) {
      console.error("Error verifying credentials:", error);
      return null;
    }
  }
  
  /**
   * Verify a token for a specific client
   */
  async verifyToken(token: string, clientId: number) {
    try {
      return await tokenService.verifyClientToken(token, clientId);
    } catch (error: any) {
      console.error(`Error verifying token for clientId ${clientId}:`, error);
      return false;
    }
  }
  
  /**
   * Special method for authentication via GET (without JSON body)
   * Useful for mobile browsers with issues in POST requests
   */
  async authenticateViaGet(
    username: string, 
    clientIdStr: string, 
    token: string,
    isPwa: boolean
  ) {
    try {
      // Convert clientId to number
      const clientId = parseInt(clientIdStr, 10);
      
      if (isNaN(clientId)) {
        console.warn("Invalid clientId:", clientIdStr);
        return null;
      }
      
      // Log dettagliato
      console.log("Autenticazione via GET:", {
        username,
        clientId,
        isPwa,
        tokenLength: token.length
      });
      
      // Find the user based on the username
      let user = await storage.getUserByUsername(username);
      
      // If we find the user, try to find them based on clientId
      if (!user && clientId) {
        console.log(`User '${username}' not found directly, attempting lookup by clientId: ${clientId}`);
        
        // Check if a user already linked to this clientId exists
        const existingUser = await storage.getUserByClientId(clientId);
        
        if (existingUser) {
          console.log(`Found existing user for clientId ${clientId}: ${existingUser.username}`);
          
          // If credentials seem valid (there is a token), use this user
          if (token && token.length > 10) {
            console.log(`Using existing user ${existingUser.username} for token login`);
            user = existingUser;
          }
        } else {
          // If we are in a mobile or PWA environment, we can automatically create a user
          // to improve application usability
          console.log(`Automatic user creation attempt for client ${clientId} with username ${username}`);
          
          try {
            // Verify that the client exists effettivamente
            const client = await storage.getClient(clientId);
            
            if (client) {
              // Generate a random password that will not be used anyway
              // since authentication will happen via token
              const randomPassword = Math.random().toString(36).substring(2, 15);
              const hashedPassword = await hashPassword(randomPassword);
              
              // Create l'user
              const newUser = await storage.createUser({
                username,
                password: hashedPassword,
                type: "client",
                clientId
              });
              
              if (newUser) {
                console.log(`User ${username} created automatically for client ID ${clientId}`);
                user = newUser;
              }
            }
          } catch (error: any) {
            console.error(`Error automatically creating user:`, error);
          }
        }
      }
      
      if (!user) {
        console.warn(`User not found via GET: ${username}`);
        return null;
      }
      
      // Verify that it is a user of type client
      if (user.type !== "client") {
        console.warn(`Invalid user type via GET: ${user.type}`);
        return null;
      }
      
      // Verify that the client ID matches
      if (user.clientId !== clientId) {
        console.warn(`ClientId mismatch: expected ${user.clientId}, received ${clientId}`);
        return null;
      }
      
      // Get the client associated with the user
      const client = await storage.getClient(user.clientId);
      
      if (!client) {
        console.warn(`Client not found for user via GET: ${username}`);
        return null;
      }
      
      // Verify the token
      const isValid = await this.verifyToken(token, clientId);
      
      if (isValid) {
        console.log(`Token verified correctly via GET for: ${username}`);
        
        // Log of successful access
        console.log(`Access successful for clientId: ${clientId}, type: ${isPwa ? 'PWA' : 'Browser'}`);
        // We no longer try to register access in the database because that function does not exist
        
        return { ...user, client };
      } else {
        console.warn(`Invalid token via GET for: ${username}`);
        return null;
      }
    } catch (error: any) {
      console.error("Error during GET authentication:", error);
      return null;
    }
  }
}

export const clientLoginService = new ClientLoginService();