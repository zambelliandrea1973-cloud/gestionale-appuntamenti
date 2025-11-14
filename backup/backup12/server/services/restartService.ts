/**
 * Servizio per gestire il riavvio dell'applicazione
 */
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Token di riavvio validi
const restartTokens: { [token: string]: number } = {};

// Tempo di validità del token (5 minuti)
const TOKEN_VALIDITY = 5 * 60 * 1000;

/**
 * Genera un token di riavvio
 * @returns token di riavvio generato
 */
export function generateRestartToken(): string {
  // Genera un token UUID v4
  const token = uuidv4();
  
  // Memorizza il token con timestamp corrente
  restartTokens[token] = Date.now();
  
  // Pulisci i token scaduti
  cleanExpiredTokens();
  
  return token;
}

/**
 * Verifica se un token di riavvio è valido
 * @param token Token da verificare
 * @returns true se il token è valido, false altrimenti
 */
export function isValidRestartToken(token: string): boolean {
  // Verifica che il token esista e non sia scaduto
  const timestamp = restartTokens[token];
  
  if (!timestamp) {
    return false;
  }
  
  const isValid = Date.now() - timestamp <= TOKEN_VALIDITY;
  
  // Se il token è scaduto, rimuovilo
  if (!isValid) {
    delete restartTokens[token];
  }
  
  return isValid;
}

/**
 * Elimina i token scaduti
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
 * Esegue il riavvio dell'applicazione
 * @param token Token di autorizzazione
 * @returns Promise che si risolve quando il riavvio è stato avviato
 */
export async function restartApplication(token: string): Promise<{ success: boolean, message: string }> {
  // Verifica il token
  if (!isValidRestartToken(token)) {
    return { 
      success: false, 
      message: "Token di riavvio non valido o scaduto" 
    };
  }
  
  // Rimuovi il token utilizzato
  delete restartTokens[token];
  
  try {
    // Esegui il comando di riavvio in base all'ambiente
    if (process.env.REPLIT_ENVIRONMENT) {
      // In ambiente Replit, invia un segnale HUP al processo Node
      process.kill(process.pid, 'SIGHUP');
      return { 
        success: true, 
        message: "Riavvio avviato. L'applicazione sarà nuovamente disponibile tra pochi secondi."
      };
    } else {
      // Su altri ambienti, esegui pm2 reload o restart
      return new Promise((resolve) => {
        exec('pm2 reload all 2>/dev/null || pm2 restart all 2>/dev/null || pkill -HUP node', (error) => {
          if (error) {
            console.error('Errore durante il riavvio:', error);
            // Fallback al processo Node
            try {
              process.kill(process.pid, 'SIGHUP');
              resolve({
                success: true,
                message: "Riavvio avviato utilizzando il fallback. L'applicazione sarà nuovamente disponibile tra pochi secondi."
              });
            } catch (e) {
              resolve({
                success: false,
                message: "Impossibile riavviare l'applicazione: " + e
              });
            }
          } else {
            resolve({
              success: true,
              message: "Riavvio avviato. L'applicazione sarà nuovamente disponibile tra pochi secondi."
            });
          }
        });
      });
    }
  } catch (error) {
    console.error('Errore durante il riavvio:', error);
    return {
      success: false,
      message: `Errore durante il riavvio: ${error}`
    };
  }
}