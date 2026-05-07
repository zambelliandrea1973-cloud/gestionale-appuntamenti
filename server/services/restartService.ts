/**
 * Service for managing application restart
 */
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Token restart validi
const restartTokens: { [token: string]: number } = {};

// Token validity time (5 minutes)
const TOKEN_VALIDITY = 5 * 60 * 1000;

/**
 * Generate a token restart
 * @returns generated restart token
 */
export function generateRestartToken(): string {
  // Generate a token UUID v4
  const token = uuidv4();
  
  // Store the token with current timestamp
  restartTokens[token] = Date.now();
  
  // Clean up expired tokens
  cleanExpiredTokens();
  
  return token;
}

/**
 * Check if a restart token is valid
 * @param token Token to verify
 * @returns true if the token is valid, false otherwise
 */
export function isValidRestartToken(token: string): boolean {
  // Verify that the token exists and has not expired
  const timestamp = restartTokens[token];
  
  if (!timestamp) {
    return false;
  }
  
  const isValid = Date.now() - timestamp <= TOKEN_VALIDITY;
  
  // if the token has expired, remove it
  if (!isValid) {
    delete restartTokens[token];
  }
  
  return isValid;
}

/**
 * Delete expired tokens
 */
function cleanExpiredTokens(): void {
  const now = Date.now();
  
  Object.entries(restartTokens).forEach(([token, timestamp]) => {
    if (now - timestamp > TOKEN_VALIDITY) {
      delete restartTokens[token];
    }
  });
}

/**
 * Execute the application restart
 * @param token Authorization token
 * @returns Promise that resolves when the restart has been initiated
 */
export async function restartApplication(token: string): Promise<{ success: boolean, message: string }> {
  // Verify the token
  if (!isValidRestartToken(token)) {
    return { 
      success: false, 
      message: "Invalid or expired restart token" 
    };
  }
  
  // Remove the used token
  delete restartTokens[token];
  
  try {
    // Execute the restart command based on the environment
    if (process.env.REPLIT_ENVIRONMENT) {
      // In Replit environment, send a HUP signal to the Node process
      process.kill(process.pid, 'SIGHUP');
      return { 
        success: true, 
        message: "Restart initiated. The application will be available again in a few seconds."
      };
    } else {
      // On other environments, run pm2 reload or restart
      return new Promise((resolve) => {
        exec('pm2 reload all 2>/dev/null || pm2 restart all 2>/dev/null || pkill -HUP node', (error) => {
          if (error) {
            console.error('Error during restart:', error);
            // Fallback to Node process
            try {
              process.kill(process.pid, 'SIGHUP');
              resolve({
                success: true,
                message: "Restart initiated using fallback. The application will be available again in a few seconds."
              });
            } catch (e) {
              resolve({
                success: false,
                message: "Unable to restart application: " + e
              });
            }
          } else {
            resolve({
              success: true,
              message: "Restart initiated. The application will be available again in a few seconds."
            });
          }
        });
      });
    }
  } catch (error) {
    console.error('Error during restart:', error);
    return {
      success: false,
      message: `Error during restart: ${error}`
    };
  }
}