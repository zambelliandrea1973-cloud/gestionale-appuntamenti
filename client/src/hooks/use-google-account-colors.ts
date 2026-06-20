import { useQuery } from '@tanstack/react-query';

export interface SecondaryGoogleAccount {
  id: number;
  email: string;
  color: string;
  enabled: boolean;
  lastSyncAt: string | null;
}

export interface GoogleAccountsResponse {
  primary: { email: string | null; color: string; connected: boolean; lastSyncAt: string | null };
  secondary: SecondaryGoogleAccount[];
}

// Sfondo grigio usato per eventi importati da Google senza match servizio.
export const GOOGLE_IMPORTED_BG = 'rgba(148, 163, 184, 0.18)';
export const GOOGLE_IMPORTED_BG_SOLID = '#f1f5f9';
const DEFAULT_PRIMARY_COLOR = '#4a7c59';

/**
 * REGOLA DEFINITIVA colori eventi calendario:
 *
 * 1. Evento NATIVO del gestionale (importedFromGoogle = false):
 *    → chip solido con colore del servizio
 *
 * 2. Evento IMPORTATO da Google (importedFromGoogle = true):
 *    Step A: confronta googleEventTitle (o notes) con nomi servizi del gestionale
 *            → se match: chip solido colore servizio (identico a nativo)
 *    Step B: nessun match → sfondo grigio (#f1f5f9) + banda sinistra colorata
 *            con il colore dell'account Google di provenienza (primario/secondario)
 */
export function useGoogleAccountColors(services: any[] = []) {
  const { data } = useQuery<GoogleAccountsResponse>({
    queryKey: ['/api/google-auth/accounts'],
    staleTime: 5 * 60 * 1000,
  });

  const isImported = (apt: any): boolean =>
    !!apt && (apt.importedFromGoogle === true || apt.isImported === true);

  /** Colore della banda in base all'email dell'account di provenienza */
  const colorForSourceEmail = (sourceEmail?: string | null): string => {
    const primaryColor = data?.primary?.color || DEFAULT_PRIMARY_COLOR;
    if (!data) return primaryColor;
    if (sourceEmail) {
      const lc = sourceEmail.toLowerCase();
      const sec = data.secondary?.find((a) => a.email?.toLowerCase() === lc);
      if (sec) return sec.color;
      if (data.primary?.email && data.primary.email.toLowerCase() === lc) {
        return data.primary.color || DEFAULT_PRIMARY_COLOR;
      }
    }
    return primaryColor;
  };

  /**
   * Step A: cerca un servizio del gestionale il cui nome è contenuto
   * nel titolo dell'evento Google, o viceversa. Case-insensitive.
   * Restituisce il colore del servizio se trovato, null altrimenti.
   */
  const matchServiceColor = (apt: any): string | null => {
    if (!services || services.length === 0) return null;
    const title = (apt.googleEventTitle || apt.notes || '').toLowerCase().trim();
    if (!title) return null;
    for (const svc of services) {
      if (!svc.name || !svc.color) continue;
      const svcName = svc.name.toLowerCase().trim();
      if (svcName.length >= 3 && (title.includes(svcName) || svcName.includes(title))) {
        return svc.color;
      }
    }
    return null;
  };

  /**
   * Colori per un evento importato da Google:
   * - serviceColor presente → chip solido come nativo
   * - altrimenti → sfondo grigio + banda account Google
   * Ritorna null se NON è importato.
   */
  const getImportedColors = (
    apt: any
  ): { band: string; bg: string; bgSolid: string; isServiceMatch?: boolean } | null => {
    if (!isImported(apt)) return null;

    // Step A: match servizio
    const serviceColor = matchServiceColor(apt);
    if (serviceColor) {
      return {
        band: serviceColor,
        bg: serviceColor,
        bgSolid: serviceColor,
        isServiceMatch: true,
      };
    }

    // Step B: grigio + banda account Google
    const band = colorForSourceEmail(apt?.sourceGoogleEmail);
    return {
      band,
      bg: GOOGLE_IMPORTED_BG,
      bgSolid: GOOGLE_IMPORTED_BG_SOLID,
      isServiceMatch: false,
    };
  };

  return { accounts: data, isImported, colorForSourceEmail, getImportedColors, matchServiceColor };
}
