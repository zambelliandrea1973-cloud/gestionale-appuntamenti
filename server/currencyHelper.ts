import type { IStorage } from './storage';

export interface UserCurrency {
  currency: string;
  symbol: string;
}

/**
 * Recupera la valuta configurata per un utente.
 * Se non trovata, ritorna EUR come default.
 */
export async function getCurrencyForUser(storage: IStorage, userId: number): Promise<UserCurrency> {
  try {
    const settings = await storage.getCurrencySettings(userId);
    
    if (settings) {
      return {
        currency: settings.currency,
        symbol: settings.symbol
      };
    }
    
    // Fallback a EUR se non configurato
    return {
      currency: 'EUR',
      symbol: '€'
    };
  } catch (error) {
    console.error(`Errore nel recupero valuta per utente ${userId}:`, error);
    return {
      currency: 'EUR',
      symbol: '€'
    };
  }
}

/**
 * Formatta un prezzo con la valuta dell'utente
 */
export function formatPriceWithCurrency(amount: number, currency: UserCurrency): string {
  return `${currency.symbol}${amount.toFixed(2)}`;
}
