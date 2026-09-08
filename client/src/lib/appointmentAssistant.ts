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

export interface AssistantServiceSuggestion {
  service: AssistantService;
  score: number;
}

export interface AssistantClientSuggestion {
  client: AssistantClient;
  score: number;
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

  const targetTokens = target.split(' ').filter(Boolean);
  const exactMatch = clients.find(client => {
    const fullName = normalizeAssistantName(`${client.firstName} ${client.lastName || ''}`);
    return fullName === target;
  });
  if (exactMatch) return exactMatch;

  // Voice recognition and Gemini can occasionally invert first/last name
  // ("Zambelli Andrea") even though the catalog stores "Andrea Zambelli".
  // Match the same complete set of name parts without using loose partial
  // matches that could select the wrong client.
  const reorderedMatch = clients.find(client => {
    const fullName = normalizeAssistantName(`${client.firstName} ${client.lastName || ''}`);
    const clientTokens = fullName.split(' ').filter(Boolean);
    if (clientTokens.length !== targetTokens.length) return false;
    const remaining = [...clientTokens];
    return targetTokens.every(token => {
      const index = remaining.indexOf(token);
      if (index < 0) return false;
      remaining.splice(index, 1);
      return true;
    });
  });
  if (reorderedMatch) return reorderedMatch;

  // If speech recognition captured only part of a name, accept it only when
  // it identifies one unique client. This avoids attaching an appointment to
  // the wrong person when multiple clients share a first name.
  const partialMatches = clients.filter(client => {
    const fullName = normalizeAssistantName(`${client.firstName} ${client.lastName || ''}`);
    const clientTokens = fullName.split(' ').filter(Boolean);
    return targetTokens.every(token => clientTokens.includes(token));
  });
  return partialMatches.length === 1 ? partialMatches[0] : undefined;
}

export function findAssistantClientSuggestion(
  clients: AssistantClient[],
  requestedName: string
): AssistantClientSuggestion | undefined {
  const requested = normalizeAssistantName(requestedName);
  const requestedTokens = requested.split(' ').filter(Boolean);
  if (requestedTokens.length < 2) return undefined;

  const ranked = clients
    .map(client => {
      const fullName = normalizeAssistantName(`${client.firstName} ${client.lastName || ''}`);
      const clientTokens = fullName.split(' ').filter(Boolean);
      if (clientTokens.length !== requestedTokens.length) {
        return { client, score: 0 };
      }

      const fullNameScore = stringSimilarity(
        requested.replace(/\s/g, ''),
        fullName.replace(/\s/g, '')
      );
      const tokenScore = requestedTokens.reduce((total, requestedToken) => {
        const bestTokenScore = Math.max(
          ...clientTokens.map(clientToken => stringSimilarity(requestedToken, clientToken))
        );
        return total + bestTokenScore;
      }, 0) / requestedTokens.length;

      return { client, score: Math.max(fullNameScore, tokenScore) };
    })
    .filter(result => result.score >= 0.82)
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  if (!best) return undefined;
  const second = ranked[1];
  if (second && best.score - second.score < 0.06) return undefined;
  return best;
}

export function findAssistantService(
  services: AssistantService[],
  requestedName: string
): AssistantService | undefined {
  const target = normalizeAssistantName(requestedName);
  if (!target) return undefined;

  return services.find(service => normalizeAssistantName(service.name) === target);
}

export function findAssistantServicePrefixMatches(
  services: AssistantService[],
  requestedName: string
): AssistantService[] {
  const target = normalizeAssistantName(requestedName);
  if (!target) return [];

  const matches = services.filter(service =>
    normalizeAssistantName(service.name) === target ||
    normalizeAssistantName(service.name).startsWith(`${target} `)
  );
  return matches.length > 1 ? matches : [];
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + cost
      );
      diagonal = above;
    }
  }

  return previous[right.length];
}

function stringSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function serviceSimilarity(requestedName: string, serviceName: string): number {
  const requested = normalizeAssistantName(requestedName);
  const service = normalizeAssistantName(serviceName);
  if (!requested || !service || requested.length < 4 || service.length < 4) return 0;

  const requestedCompact = requested.replace(/\s/g, '');
  const serviceCompact = service.replace(/\s/g, '');
  const characterScore = stringSimilarity(requestedCompact, serviceCompact);

  const requestedTokens = requested.split(' ').filter(Boolean);
  const serviceTokens = service.split(' ').filter(Boolean);
  const tokenScore = requestedTokens.reduce((total, requestedToken) => {
    const bestTokenScore = Math.max(
      ...serviceTokens.map(serviceToken => stringSimilarity(requestedToken, serviceToken))
    );
    return total + bestTokenScore;
  }, 0) / requestedTokens.length;

  const containmentScore = requestedCompact.includes(serviceCompact) || serviceCompact.includes(requestedCompact)
    ? 0.86
    : 0;

  return Math.max(characterScore, tokenScore, containmentScore);
}

/**
 * Finds a safe, human-confirmed suggestion for a service that was misspelled
 * or transcribed imperfectly. It intentionally returns no result for weak
 * matches so an unrelated service is never silently proposed.
 */
export function findAssistantServiceSuggestion(
  services: AssistantService[],
  requestedName: string
): AssistantServiceSuggestion | undefined {
  const ranked = services
    .map(service => ({ service, score: serviceSimilarity(requestedName, service.name) }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  if (!best) return undefined;

  const requestedTokens = normalizeAssistantName(requestedName).split(' ').filter(Boolean);
  const bestTokens = normalizeAssistantName(best.service.name).split(' ').filter(Boolean);
  if (
    requestedTokens.length > 1 &&
    bestTokens.length > 1 &&
    requestedTokens[0] === bestTokens[0]
  ) {
    const qualifierSimilarity = Math.max(
      ...requestedTokens.slice(1).flatMap(requestedToken =>
        bestTokens.slice(1).map(serviceToken => stringSimilarity(requestedToken, serviceToken))
      )
    );
    if (qualifierSimilarity < 0.58) return undefined;
  }

  // Clear spelling/transcription matches can be suggested directly. For
  // looser phonetic cases (for example "biorisonanza" vs "bio bicom"), only
  // suggest when the best candidate is noticeably stronger than the rest.
  const secondBestScore = ranked[1]?.score || 0;
  const isClearMatch = best.score >= 0.58;
  const isDistinctPhoneticMatch = best.score >= 0.34 && best.score - secondBestScore >= 0.08;
  return isClearMatch || isDistinctPhoneticMatch ? best : undefined;
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