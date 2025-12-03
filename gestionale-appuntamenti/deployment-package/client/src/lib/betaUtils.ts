/**
 * Utility per gestire lo stato beta dell'applicazione con separazione multi-tenant
 */

// Funzione per ottenere le chiavi localStorage specifiche per utente
function getBetaStorageKey(key: string, userId?: number): string {
  if (userId) {
    return `${key}_user_${userId}`;
  }
  return key; // Fallback per compatibilità
}

/**
 * Verifica se l'utente ha un codice beta valido
 */
export function isBetaTester(userId?: number): boolean {
  const storageKey = getBetaStorageKey('betaInviteStatus', userId);
  return localStorage.getItem(storageKey) === 'valid';
}

/**
 * Ottiene il codice beta dell'utente
 */
export function getBetaCode(userId?: number): string | null {
  const storageKey = getBetaStorageKey('betaInviteCode', userId);
  return localStorage.getItem(storageKey);
}

/**
 * Ottiene l'email associata al codice beta
 */
export function getBetaEmail(userId?: number): string | null {
  const storageKey = getBetaStorageKey('betaInviteEmail', userId);
  return localStorage.getItem(storageKey);
}

/**
 * Memorizza i dati di un invito beta valido
 */
export function storeBetaInvite(code: string, email: string, userId?: number): void {
  const codeKey = getBetaStorageKey('betaInviteCode', userId);
  const emailKey = getBetaStorageKey('betaInviteEmail', userId);
  const statusKey = getBetaStorageKey('betaInviteStatus', userId);
  
  localStorage.setItem(codeKey, code);
  localStorage.setItem(emailKey, email);
  localStorage.setItem(statusKey, 'valid');
  
  // Pulisci cache di altri utenti per evitare contaminazione
  if (userId) {
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if ((key.startsWith('betaInviteCode_user_') || 
           key.startsWith('betaInviteEmail_user_') || 
           key.startsWith('betaInviteStatus_user_')) && 
          !key.includes(`user_${userId}`)) {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Rimuove i dati di un invito beta
 */
export function clearBetaInvite(userId?: number): void {
  const codeKey = getBetaStorageKey('betaInviteCode', userId);
  const emailKey = getBetaStorageKey('betaInviteEmail', userId);
  const statusKey = getBetaStorageKey('betaInviteStatus', userId);
  const usedKey = getBetaStorageKey('betaCodeUsed', userId);
  
  localStorage.removeItem(codeKey);
  localStorage.removeItem(emailKey);
  localStorage.removeItem(statusKey);
  localStorage.removeItem(usedKey);
}

/**
 * Segna un codice beta come utilizzato
 */
export function markBetaCodeAsUsed(userId?: number): void {
  const storageKey = getBetaStorageKey('betaCodeUsed', userId);
  localStorage.setItem(storageKey, 'true');
}

/**
 * Verifica se il codice beta è già stato utilizzato
 */
export function isBetaCodeUsed(userId?: number): boolean {
  const storageKey = getBetaStorageKey('betaCodeUsed', userId);
  return localStorage.getItem(storageKey) === 'true';
}