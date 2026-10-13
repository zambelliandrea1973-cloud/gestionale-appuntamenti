import { detectAssistantConfirmation } from './appointmentAssistant';
import { personalAppointmentSchema } from '../../../shared/personalAppointments';
import { appointmentOperationText } from './appointmentOperationMessages';

export type AppointmentAction = 'delete' | 'move';
export type OperationFields = {
  action?: 'create' | AppointmentAction | null;
  searchTitle?: string | null;
  originalDate?: string | null;
  originalStartTime?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
};
export type ExistingAppointment = {
  id: number; title?: string; date: string; startTime: string; endTime: string;
  location?: string; notes?: string; client?: { firstName?: string; lastName?: string };
  service?: { name?: string }; clientId?: number; serviceId?: number;
  staffId?: number | null; roomId?: number | null; status?: string;
  reminderType?: string | null; isPersonalAppointment?: boolean; isPersonalBusy?: boolean;
};
export type OperationState = {
  action: AppointmentAction; candidates: ExistingAppointment[]; selected?: ExistingAppointment;
  changes: OperationFields; phase: 'search' | 'choose' | 'details' | 'confirm'; scope: string;
};
const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function detectAppointmentAction(text: string, fields?: OperationFields): AppointmentAction | undefined {
  if (/\b(?:elimin|cancell|annull|rimuov|disdic|delete|remove|cancel|supprim|borra|elimina|losch)\w*\b/i.test(normalize(text))) return 'delete';
  if (/\b(?:spost|posticip|anticip|riprogramm|rimand|modific|move|reschedul|verschieb|deplac|mueve|reprogram)\w*\b/i.test(normalize(text))) return 'move';
  return fields?.action === 'delete' || fields?.action === 'move' ? fields.action : undefined;
}
const stopWords = new Set(('ciao mi me tu puoi potresti per favore vorrei voglio devo quello quella questo questa il lo la i gli le un una uno di del della dell dei delle da dal dalla al alla alle con che e ed gia stato stata fatto fatta appuntamento appuntamenti impegno evento personale esistente esistenti quando oggi domani dopodomani lunedi martedi mercoledi giovedi venerdi sabato domenica alle ore ora grazie the a an my please appointment appointments event for of on at to from tomorrow today can you could would like it is has been because hello quello dei nuovo nuova elimina eliminare elimini cancellare cancella cancelli rimuovi rimuovere disdici disdire sposta spostare sposti posticipa anticipa rimanda riprogramma delete remove cancel move reschedule spostato cancellato stato non').split(' '));
export function appointmentLabel(record: ExistingAppointment, fallback = 'Appuntamento') {
  // Keep the internal fallback stable for matching, snapshots and mutation payloads.
  return record.title || [record.client?.firstName, record.client?.lastName, record.service?.name].filter(Boolean).join(' · ') || fallback;
}
export function matchExistingAppointments(records: ExistingAppointment[], text: string, fields: OperationFields, action: AppointmentAction) {
  const words = normalize(fields.searchTitle || text).split(' ').filter(word => word.length > 1 && !stopWords.has(word) && !/^\d+$/.test(word) && (!!fields.searchTitle || !detectAppointmentAction(word)));
  const date = fields.originalDate || (action === 'delete' ? fields.date : null);
  const time = fields.originalStartTime || (action === 'delete' ? fields.startTime : null);
  if (!words.length && !date && !time) return [];
  return records.filter(record => Number.isSafeInteger(record.id) && record.id > 0 && !record.isPersonalBusy && !record.isPersonalAppointment &&
    (!date || record.date.slice(0, 10) === date) && (!time || record.startTime.slice(0, 5) === time) &&
    words.every(word => normalize(appointmentLabel(record)).includes(word)));
}
export function appointmentSnapshot(record: ExistingAppointment) {
  return JSON.stringify([record.id, appointmentLabel(record), record.date.slice(0, 10), record.startTime.slice(0, 5),
    record.endTime.slice(0, 5), record.notes || '', record.location || '', record.clientId, record.serviceId,
    record.staffId || null, record.roomId || null, record.status]);
}
export function movedAppointment(record: ExistingAppointment, changes: OperationFields) {
  const startTime = changes.startTime || record.startTime.slice(0, 5);
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const duration = changes.durationMinutes ?? minutes(record.endTime) - minutes(record.startTime);
  const end = minutes(startTime) + duration;
  const endTime = changes.endTime || (changes.startTime || changes.durationMinutes
    ? `${Math.floor(end / 60).toString().padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`
    : record.endTime.slice(0, 5));
  return personalAppointmentSchema.parse({
    title: appointmentLabel(record), date: changes.date || record.date.slice(0, 10), startTime, endTime,
    notes: record.notes || '', location: record.location || '',
  });
}
type Dependencies = {
  scope: () => string; enabled: () => boolean; language: () => string;
  load: () => Promise<ExistingAppointment[]>; read: (id: number) => Promise<ExistingAppointment>;
  write: (action: AppointmentAction, record: ExistingAppointment, changes: ReturnType<typeof movedAppointment> | undefined) => Promise<void>;
  state: (value: OperationState | null) => void; say: (text: string) => Promise<void>;
  changed: (record: ExistingAppointment, date: string) => Promise<void>;
};
export function createAppointmentOperations(deps: Dependencies) {
  const t = (key: Parameters<typeof appointmentOperationText>[1], values?: Record<string, string | number>) =>
    appointmentOperationText(deps.language(), key, values);
  let current: OperationState | null = null;
  let epoch = 0;
  let busy = false;
  const publish = (value: OperationState | null) => { current = value; deps.state(value); };
  const valid = (scope: string, version: number) => deps.enabled() && deps.scope() === scope && epoch === version;
  const reset = () => { epoch++; publish(null); };
  const describe = (record: ExistingAppointment) => `${appointmentLabel(record, t('appointment'))} · ${record.date.slice(0, 10)} · ${record.startTime.slice(0, 5)}–${record.endTime.slice(0, 5)}`;
  async function preview() {
    if (!current?.selected) return;
    if (current.action === 'move' && !current.changes.date && !current.changes.startTime && !current.changes.endTime && !current.changes.durationMinutes) {
      publish({ ...current, phase: 'details' });
      await deps.say(t('askDestination', { appointment: describe(current.selected) }));
      return;
    }
    let destination: ReturnType<typeof movedAppointment> | undefined;
    if (current.action === 'move') {
      try { destination = movedAppointment(current.selected, current.changes); }
      catch {
        publish({ ...current, phase: 'details' });
        await deps.say(t('invalidDestination'));
        return;
      }
    }
    publish({ ...current, phase: 'confirm' });
    await deps.say(current.action === 'delete'
      ? t('askDelete', { appointment: describe(current.selected) })
      : t('askMove', { appointment: describe(current.selected), date: destination!.date, start: destination!.startTime, end: destination!.endTime }));
  }
  async function choose(id: number) {
    if (!current || !deps.enabled() || current.scope !== deps.scope()) return;
    const selected = current.candidates.find(record => record.id === id);
    if (!selected) return;
    publish({ ...current, selected });
    await preview();
  }
  async function confirm() {
    if (busy || !current?.selected || current.phase !== 'confirm' || !deps.enabled() || current.scope !== deps.scope()) return;
    busy = true;
    const pending = current;
    const scope = pending.scope, version = epoch;
    try {
      const fetched = await deps.read(pending.selected!.id);
      if (fetched.id !== pending.selected!.id) throw new Error(t('selectionMismatch'));
      const latest = { ...pending.selected!, ...fetched, client: fetched.client || pending.selected!.client, service: fetched.service || pending.selected!.service };
      if (!valid(scope, version)) return;
      if (appointmentSnapshot(latest) !== appointmentSnapshot(pending.selected!)) {
        publish({ ...pending, selected: latest, candidates: [latest] });
        await deps.say(t('recordChanged'));
        await preview();
        return;
      }
      const destination = pending.action === 'move' ? movedAppointment(latest, pending.changes) : undefined;
      await deps.write(pending.action, latest, destination);
      if (!valid(scope, version)) return;
      publish(null);
      await deps.changed(latest, destination?.date || latest.date);
      if (!valid(scope, version)) return;
      await deps.say(t(pending.action === 'delete' ? 'deleted' : 'moved'));
    } finally { busy = false; }
  }
  async function handle(text: string, fields: OperationFields = {}) {
    if (busy) return true;
    if (current && (current.scope !== deps.scope() || !deps.enabled())) reset();
    const action = detectAppointmentAction(text, fields);
    if (!current && !action) return false;
    if (!deps.enabled()) throw new Error(t('unlockProfile'));
    if (current && fields.action === 'create' && /\b(?:nuovo|nuova|crea\w*|aggiung\w*|prenot\w*|fiss\w*|segn\w*|create|book|new)\b/i.test(text)) {
      reset();
      return false;
    }
    const updatedDestination = current?.action === 'move' && ['date', 'startTime', 'endTime', 'durationMinutes'].some(key =>
      fields[key as keyof OperationFields] != null && fields[key as keyof OperationFields] !== current!.changes[key as keyof OperationFields]);
    const hasTargetCriteria = Boolean(fields.searchTitle || fields.originalDate || fields.originalStartTime ||
      (current?.action === 'delete' && (fields.date || fields.startTime)));
    const updatedTarget = current && hasTargetCriteria && (!current.selected ||
      !matchExistingAppointments([current.selected], text, fields, action || current.action).length);
    if (current && ((detectAssistantConfirmation(text, deps.language()) === 'no' && !updatedDestination && !updatedTarget) ||
      /^(?:annulla(?: l.operazione)?|lascia perdere|cancel)$/i.test(text.trim()))) {
      reset(); await deps.say(t('cancelled')); return true;
    }
    if (current && !updatedTarget && (!action || action === current.action)) {
      if (!current.selected) {
        const number = text.match(/^(?:il |la |numero |scelgo |scegli |quello |quella )?(\d+)[.!]?$/i);
        const ordinal = normalize(text).match(/\b(primo|prima|secondo|seconda|terzo|terza)\b/);
        const index = number ? Number(number[1]) - 1 : ordinal ? ['primo', 'secondo', 'terzo'].findIndex(word => word.slice(0, -1) === ordinal[1].slice(0, -1)) : -1;
        if (index >= 0 && current.candidates[index]) { await choose(current.candidates[index].id); return true; }
        if (detectAssistantConfirmation(text, deps.language()) === 'yes') {
          await deps.say(t('selectFirst'));
          return true;
        }
      } else {
        const updates = Object.fromEntries(['date', 'startTime', 'endTime', 'durationMinutes'].filter(key => fields[key as keyof OperationFields] != null).map(key => [key, fields[key as keyof OperationFields]]));
        if (current.action === 'move' && Object.keys(updates).some(key => (current!.changes as any)[key] !== updates[key])) {
          publish({ ...current, changes: { ...current.changes, ...updates } });
          await preview(); return true;
        }
        if (current.phase === 'confirm' && detectAssistantConfirmation(text, deps.language()) === 'yes') { await confirm(); return true; }
        await preview(); return true;
      }
    }
    const scope = deps.scope(), version = ++epoch;
    const nextAction = action || current!.action;
    const candidateIds = current && !current.selected && current.candidates.length && !fields.searchTitle &&
      !detectAppointmentAction(text) ? new Set(current.candidates.map(record => record.id)) : undefined;
    const changes = nextAction === 'move' ? {
      ...(current?.action === nextAction ? current.changes : {}),
      ...Object.fromEntries(['date', 'startTime', 'endTime', 'durationMinutes'].filter(key => fields[key as keyof OperationFields] != null).map(key => [key, fields[key as keyof OperationFields]])),
    } : {};
    publish({ action: nextAction, candidates: [], changes, phase: 'search', scope });
    const records = await deps.load();
    if (!valid(scope, version)) return true;
    const candidates = matchExistingAppointments(candidateIds ? records.filter(record => candidateIds.has(record.id)) : records, text, fields, nextAction);
    publish({ action: nextAction, candidates, changes, phase: 'choose', scope });
    if (!candidates.length) await deps.say(t('notFound'));
    else if (candidates.length === 1) await choose(candidates[0].id);
    else await deps.say(t('multipleFound', { count: candidates.length }));
    return true;
  }
  return { handle, choose, confirm, reset };
}
