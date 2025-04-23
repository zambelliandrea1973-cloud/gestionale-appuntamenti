/**
 * Servizio per gestire il riavvio dell'applicazione
 */
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Tokens validi per il riavvio (per sicurezza)
let restartTokens: { [key: string]: { timestamp: number, used: boolean } } = {};

// Pulizia periodica dei token scaduti (dopo 5 minuti)
setInterval(() => {
  const now = Date.now();
  restartTokens = Object.fromEntries(
    Object.entries(restartTokens).filter(([_, data]) => now - data.timestamp < 5 * 60 * 1000)
  );
}, 60 * 1000); // Controlla ogni minuto

/**
 * Genera un token di riavvio
 * @returns token di riavvio
 */
export function generateRestartToken(): string {
  const token = uuidv4();
  restartTokens[token] = { timestamp: Date.now(), used: false };
  return token;
}

/**
 * Verifica se un token di riavvio è valido
 * @param token Token da verificare
 * @returns true se il token è valido, false altrimenti
 */
export function isValidRestartToken(token: string): boolean {
  const tokenData = restartTokens[token];
  if (!tokenData) return false;
  
  // Token già utilizzato
  if (tokenData.used) return false;
  
  // Token scaduto (5 minuti)
  const now = Date.now();
  if (now - tokenData.timestamp > 5 * 60 * 1000) {
    delete restartTokens[token];
    return false;
  }
  
  return true;
}

/**
 * Esegue il riavvio dell'applicazione
 * @param token Token di autorizzazione
 * @returns Promise che si risolve quando il riavvio è stato avviato
 */
export async function restartApplication(token: string): Promise<{ success: boolean, message: string }> {
  // Verifica il token
  if (!isValidRestartToken(token)) {
    return { success: false, message: 'Token di riavvio non valido o scaduto' };
  }
  
  // Segna il token come utilizzato
  restartTokens[token].used = true;
  
  // Log del riavvio
  console.log(`[${new Date().toISOString()}] Riavvio dell'applicazione richiesto`);
  
  try {
    // Esegui il riavvio dell'applicazione dopo un breve ritardo
    setTimeout(() => {
      console.log(`[${new Date().toISOString()}] Esecuzione riavvio...`);
      
      // Opzione 1: usando process.exit() - Replit dovrebbe riavviare automaticamente
      process.exit(0);
      
      // Opzione 2: usando comando kill (decommentare se l'opzione 1 non funziona)
      // exec('kill 1', (error) => {
      //   if (error) {
      //     console.error(`Errore durante il riavvio: ${error.message}`);
      //   }
      // });
    }, 2000); // Attende 2 secondi per permettere l'invio della risposta HTTP
    
    return { success: true, message: 'Riavvio avviato, l\'applicazione sarà disponibile tra pochi secondi' };
  } catch (error) {
    console.error('Errore durante il riavvio:', error);
    return { success: false, message: `Errore durante il riavvio: ${error}` };
  }
}