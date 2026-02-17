import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface CurrencySettings {
  currency: string;
  symbol: string;
}

export function useCurrency() {
  const queryClient = useQueryClient();

  // Carica le impostazioni valuta correnti
  const { data: currencySettings, isLoading } = useQuery<CurrencySettings>({
    queryKey: ['/api/currency-settings'],
    staleTime: 1000 * 60 * 5, // Cache per 5 minuti
  });

  // Mutation per salvare la valuta
  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ currency, symbol }: { currency: string; symbol: string }) => {
      return await apiRequest('POST', '/api/currency-settings', { currency, symbol });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/currency-settings'] });
    }
  });

  // Funzione per formattare i prezzi (centesimi → valuta formattata)
  const formatPrice = (priceInCents: number | undefined | null): string => {
    if (priceInCents === undefined || priceInCents === null) return `${currencySettings?.symbol || '€'} 0.00`;
    
    const price = priceInCents / 100;
    return `${currencySettings?.symbol || '€'} ${price.toFixed(2)}`;
  };

  // Funzione per formattare solo il numero (senza simbolo)
  const formatAmount = (amountInCents: number | undefined | null): string => {
    if (amountInCents === undefined || amountInCents === null) return '0.00';
    
    const amount = amountInCents / 100;
    return amount.toFixed(2);
  };

  return {
    currency: currencySettings?.currency || 'EUR',
    symbol: currencySettings?.symbol || '€',
    isLoading,
    formatPrice,
    formatAmount,
    updateCurrency: updateCurrencyMutation.mutate,
    isUpdating: updateCurrencyMutation.isPending,
  };
}

// Lista delle valute supportate
export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'CHF', symbol: 'CHF', name: 'Franco Svizzero' },
  { code: 'USD', symbol: '$', name: 'Dollaro USA' },
  { code: 'GBP', symbol: '£', name: 'Sterlina Britannica' },
  { code: 'RUB', symbol: '₽', name: 'Rublo Russo' },
  { code: 'JPY', symbol: '¥', name: 'Yen Giapponese' },
  { code: 'CNY', symbol: '¥', name: 'Yuan Cinese' },
  { code: 'AUD', symbol: 'A$', name: 'Dollaro Australiano' },
  { code: 'CAD', symbol: 'C$', name: 'Dollaro Canadese' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasiliano' },
] as const;
