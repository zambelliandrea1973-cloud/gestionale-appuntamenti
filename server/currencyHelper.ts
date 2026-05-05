import type { IStorage } from './storage';

export interface UserCurrency {
  currency: string;
  symbol: string;
}

/**
 * Retrieve the configured currency for a user.
 * If not found, returns EUR as default.
 */
export async function getCurrencyForUser(storage: { getCurrencySettings: (userId: number) => Promise<any> }, userId: number): Promise<UserCurrency> {
  try {
    const settings = await storage.getCurrencySettings(userId);
    
    if (settings) {
      return {
        currency: settings.currency,
        symbol: settings.symbol
      };
    }
    
    // Fallback to EUR if configured
    return {
      currency: 'EUR',
      symbol: '€'
    };
  } catch (error) {
    console.error(`Error retrieving currency for user ${userId}:`, error);
    return {
      currency: 'EUR',
      symbol: '€'
    };
  }
}

/**
 * Format a price with the user's currency
 */
export function formatPriceWithCurrency(amount: number, currency: UserCurrency): string {
  return `${currency.symbol}${amount.toFixed(2)}`;
}
