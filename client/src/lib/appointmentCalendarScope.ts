import { recoverPersonalTitle, type LiveInterpretation } from '../../../shared/liveAppointmentProtocol';

export type CalendarScope = 'work' | 'personal' | 'uncertain';
export type ScopedInterpretation = LiveInterpretation & { calendarScope?: CalendarScope | null };
export type PersonalAssistantHandoff = {
  request: string;
  fields: { [K in 'title' | 'date' | 'startTime' | 'endTime' | 'durationMinutes' | 'location' | 'notes']?: NonNullable<LiveInterpretation[K]> };
};

/** Work evidence wins: a client's booking must never silently become private. */
export function classifyCalendarScope(text: string, fields: ScopedInterpretation = {}, continuingWork = false): CalendarScope {
  const value = text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const work = /\b(client[ei]|cliente|pazient[ei]|trattamento|servizio|prenotazione per|customer|client|patient)\b/.test(value);
  const personal = /\b(promemoria|memo|nota personale|impegno personale|personale|privato|ricordami|reminder|personal)\b/.test(value) ||
    /\b(andare|passare|vado|vai)\s+(?:in banca|alle poste|al supermercato)\b/.test(value) ||
    /\b(ritirare un pacco|fare la spesa|pagare le bollette)\b/.test(value);
  if (work) return 'work';
  if (personal) return 'personal';
  if (fields.clientName || fields.serviceName || fields.servicePrice != null) {
    // AI-extracted client/service fields cannot override an obvious personal errand.
    return fields.calendarScope === 'personal' ? 'uncertain' : 'work';
  }
  if (fields.calendarScope) return fields.calendarScope;
  if (continuingWork) return 'work';
  return /\b(appuntamento|impegno|segna|agenda|incontro|appointment|meeting)\b/.test(value) ? 'uncertain' : 'work';
}

/** Only this turn's personal context crosses the boundary, never a work draft. */
export function personalHandoff(text: string, fields: ScopedInterpretation = {}, now = new Date()): PersonalAssistantHandoff {
  // Do not reinterpret a work service as the personal title.
  fields = { ...fields, ...recoverPersonalTitle({ title: fields.title }, text) };
  const result: PersonalAssistantHandoff['fields'] = {};
  for (const key of ['title', 'date', 'startTime', 'endTime', 'durationMinutes', 'location', 'notes'] as const) {
    if (fields[key] != null) (result as Record<string, unknown>)[key] = fields[key];
  }
  if (!result.title) {
    if (/\bin banca\b/i.test(text)) result.title = 'Andare in banca';
    else if (/\balle poste\b/i.test(text)) result.title = 'Andare alle poste';
    else if (/\b(?:fare la spesa|al supermercato)\b/i.test(text)) result.title = 'Fare la spesa';
    else if (/\britirare un pacco\b/i.test(text)) result.title = 'Ritiro pacco';
    else if (/\bpagare le bollette\b/i.test(text)) result.title = 'Pagare le bollette';
    else {
      const purpose = text.match(/\b(?:promemoria|memo|ricordami|nota personale)\s*(?:per|di|:)?\s+(.+)/i);
      if (purpose) result.title = purpose[1].replace(/\s+(?:domani|oggi|alle\s+\d).*$/i, '').trim().slice(0, 200);
    }
  }
  if (!result.date && /\b(domani|oggi)\b/i.test(text)) {
    const romeDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(now);
    const day = new Date(`${romeDate}T12:00:00Z`);
    if (/\bdomani\b/i.test(text)) day.setUTCDate(day.getUTCDate() + 1);
    result.date = day.toISOString().slice(0, 10);
  }
  const time = text.match(/\balle\s+([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\b/i);
  if (!result.startTime && time) result.startTime = `${time[1].padStart(2, '0')}:${time[2] || '00'}`;
  return { request: text, fields: result };
}

export function canContinuePersonalHandoff(unlocked: boolean, profileId?: number, expectedProfileId?: number,
  operator?: { multi: boolean; selectedIdentityId?: number; unlockedIdentityId?: number; passwordAuthorized: boolean }) {
  const operatorReady = !operator || !operator.multi ||
    (operator.passwordAuthorized && operator.selectedIdentityId != null && operator.selectedIdentityId === operator.unlockedIdentityId);
  return operatorReady && unlocked && profileId != null && expectedProfileId === profileId;
}
