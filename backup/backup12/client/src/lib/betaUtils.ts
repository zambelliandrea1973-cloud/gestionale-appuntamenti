/**
 * Utility per gestire lo stato beta dell'applicazione
 */

/**
 * Verifica se l'utente ha un codice beta valido
 */
export function isBetaTester(): boolean {
  return localStorage.getItem('betaInviteStatus') === 'valid';
}

/**
 * Ottiene il codice beta dell'utente
 */
export function getBetaCode(): string | null {
  return localStorage.getItem('betaInviteCode');
}

/**
 * Ottiene l'email associata al codice beta
 */
export function getBetaEmail(): string | null {
  return localStorage.getItem('betaInviteEmail');
}

/**
 * Memorizza i dati di un invito beta valido
 */
export function storeBetaInvite(code: string, email: string): void {
  localStorage.setItem('betaInviteCode', code);
  localStorage.setItem('betaInviteEmail', email);
  localStorage.setItem('betaInviteStatus', 'valid');
}

/**
 * Rimuove i dati di un invito beta
 */
export function clearBetaInvite(): void {
  localStorage.removeItem('betaInviteCode');
  localStorage.removeItem('betaInviteEmail');
  localStorage.removeItem('betaInviteStatus');
  localStorage.removeItem('betaCodeUsed');
}

/**
 * Segna un codice beta come utilizzato
 */
export function markBetaCodeAsUsed(): void {
  localStorage.setItem('betaCodeUsed', 'true');
}

/**
 * Verifica se il codice beta è già stato utilizzato
 */
export function isBetaCodeUsed(): boolean {
  return localStorage.getItem('betaCodeUsed') === 'true';
}