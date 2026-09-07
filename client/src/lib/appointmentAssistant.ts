export interface AssistantClient {
  id: number;
  firstName: string;
  lastName?: string | null;
}

export interface AssistantService {
  id: number;
  name: string;
  duration?: number | null;
}

export function normalizeAssistantName(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it-IT')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getAssistantGreetingName(email: string | null | undefined): string {
  return (email || '')
    .split('@')[0]
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type AssistantConfirmation = 'yes' | 'no' | 'unknown';

export function detectAssistantConfirmation(
  value: string | null | undefined,
  language?: string
): AssistantConfirmation {
  const normalized = (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (!normalized) return 'unknown';

  const baseLanguage = (language || 'it').split('-')[0].toLowerCase();
  const patternsByLanguage: Record<string, { yes: string[]; no: string[] }> = {
    it: {
      yes: ['si', 'certo', 'va bene', 'crea', 'crealo', 'procedi', 'fallo', 'facciamolo', 'confermo'],
      no: ['no', 'non creare', 'non crearlo', 'non farlo', 'annulla', 'un altro', 'un altra', 'cambia']
    },
    en: {
      yes: ['yes', 'sure', 'okay', 'ok', 'create', 'create it', 'go ahead', 'do it', 'confirm'],
      no: ['no', 'do not', 'dont', 'cancel', 'another', 'change it']
    },
    de: {
      yes: ['ja', 'genau', 'gerne', 'okay', 'ok', 'erstellen', 'mach es', 'bestatige'],
      no: ['nein', 'nicht', 'abbrechen', 'einen anderen', 'eine andere']
    },
    fr: {
      yes: ['oui', 'd accord', 'bien sur', 'okay', 'ok', 'cree', 'fais le', 'confirme'],
      no: ['non', 'ne le fais pas', 'annule', 'un autre', 'une autre']
    },
    es: {
      yes: ['si', 'claro', 'vale', 'okay', 'ok', 'crea', 'hazlo', 'confirmo'],
      no: ['no', 'no lo hagas', 'cancela', 'otro', 'otra', 'cambia']
    },
    nl: {
      yes: ['ja', 'akkoord', 'prima', 'okay', 'ok', 'maak', 'doe het', 'bevestig'],
      no: ['nee', 'niet', 'annuleer', 'een andere', 'verander']
    },
    no: {
      yes: ['ja', 'greit', 'okay', 'ok', 'opprett', 'gjor det', 'bekreft'],
      no: ['nei', 'ikke', 'avbryt', 'en annen', 'endre']
    },
    ro: {
      yes: ['da', 'sigur', 'bine', 'okay', 'ok', 'creeaza', 'continua', 'confirm'],
      no: ['nu', 'nu crea', 'anuleaza', 'altul', 'alta', 'schimba']
    },
    ru: {
      yes: ['да', 'хорошо', 'создай', 'продолжай', 'подтверждаю'],
      no: ['нет', 'не создавай', 'отмена', 'другой', 'другая']
    },
    hi: {
      yes: ['हाँ', 'हा', 'ठीक है', 'बनाएं', 'बना दो', 'पुष्टि'],
      no: ['नहीं', 'मत बनाएं', 'रद्द', 'दूसरा', 'दूसरी']
    }
  };
  const patterns = patternsByLanguage[baseLanguage] || patternsByLanguage.it;

  const matchesPattern = (candidates: string[]) =>
    candidates.some(pattern => {
      const normalizedPattern = pattern
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
      return normalized === normalizedPattern ||
        normalized.startsWith(`${normalizedPattern} `) ||
        normalized.endsWith(` ${normalizedPattern}`) ||
        normalized.includes(` ${normalizedPattern} `);
    });

  if (matchesPattern(patterns.no)) return 'no';
  if (matchesPattern(patterns.yes)) return 'yes';

  return 'unknown';
}

export function findAssistantClient(
  clients: AssistantClient[],
  requestedName: string
): AssistantClient | undefined {
  const target = normalizeAssistantName(requestedName);
  if (!target) return undefined;

  return clients.find(client => {
    const fullName = normalizeAssistantName(`${client.firstName} ${client.lastName || ''}`);
    return fullName === target;
  });
}

export function findAssistantService(
  services: AssistantService[],
  requestedName: string
): AssistantService | undefined {
  const target = normalizeAssistantName(requestedName);
  if (!target) return undefined;

  return services.find(service => normalizeAssistantName(service.name) === target);
}

export function addMinutesToTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const total = (hours * 60 + minutes + durationMinutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function splitClientName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || fullName.trim(),
    lastName: parts.join(' ')
  };
}