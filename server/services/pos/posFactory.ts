import type { IPosProvider } from './types';
import { SumUpProvider } from './sumupProvider';

export type SupportedPosProvider = 'sumup'; // aggiungere altri qui in futuro

export function createPosProvider(provider: SupportedPosProvider, apiKey: string): IPosProvider {
  switch (provider) {
    case 'sumup':
      return new SumUpProvider(apiKey);
    default:
      throw new Error(`POS provider non supportato: ${provider}`);
  }
}
