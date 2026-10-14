import { z } from 'zod';

export const PERSONAL_APPOINTMENT_COLOR = '#64717a';
export const PERSONAL_APPOINTMENT_BACKGROUND = '#cbd1d5';
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Invalid date');
const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const personalAppointmentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: calendarDate,
  startTime: clockTime,
  endTime: clockTime,
  location: z.string().trim().max(500).default(''),
  notes: z.string().trim().max(5000).default(''),
}).refine(value => value.endTime > value.startTime, {
  path: ['endTime'], message: 'End time must be after start time',
});
export type PersonalAppointmentInput = z.infer<typeof personalAppointmentSchema>;
/** The voice form needs only a title, day and start; layout supplies one slot. */
export function completePersonalAppointmentDraft(
  draft: Partial<PersonalAppointmentInput> & { durationMinutes?: number },
) {
  if (!draft.startTime || draft.endTime || !clockTime.safeParse(draft.startTime).success) return draft;
  const [hours, minutes] = draft.startTime.split(':').map(Number);
  const duration = draft.durationMinutes ?? 15;
  if (!Number.isFinite(duration) || duration <= 0) return draft;
  // Personal entries currently stay within one calendar day.
  const end = draft.durationMinutes == null
    ? Math.min(hours * 60 + minutes + duration, 23 * 60 + 59)
    : hours * 60 + minutes + duration;
  return {
    ...draft,
    endTime: `${Math.floor(end / 60).toString().padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`,
  };
}
export type PersonalAppointmentRecord = PersonalAppointmentInput & { id: number; userId: number; profileId?: number | null; staffId?: number | null; staffName?: string; isPersonalBusy?: boolean };
/** Public availability is an explicit allowlist, never a spread of private data. */
export function publicPersonalBusyRecord(record: { id: number; date: string; startTime: string; endTime: string; staffId?: number | null; staffName?: string }) {
  return {
    id: record.id, date: record.date, startTime: record.startTime, endTime: record.endTime,
    staffId: record.staffId ?? 0, staffName: record.staffName?.trim() || (record.staffId ? 'Professionista' : 'Titolare'),
    userId: 0, title: 'Occupato', location: '', notes: '', isPersonalBusy: true,
  };
}
/** Zero/null work assignment represents the owner, not all staff. */
export function personalBusyConflictsWithStaff(staffId: number | null | undefined, busyStaffId: number | null | undefined) {
  return (staffId ?? 0) === (busyStaffId ?? 0);
}
export function isPersonalAppointment(value: any): boolean {
  return value?.isPersonalAppointment === true;
}
// Negative calendar IDs distinguish independent personal records from work IDs.
// Presentation-only labels do not create client/service records or relationships.
export function personalAppointmentForCalendar(record: PersonalAppointmentRecord) {
  if (record.isPersonalBusy) record = publicPersonalBusyRecord(record);
  const [sh, sm] = record.startTime.split(':').map(Number);
  const [eh, em] = record.endTime.split(':').map(Number);
  return {
    ...record, id: -record.id, personalAppointmentId: record.id,
    isPersonalAppointment: true, importedFromGoogle: false, status: 'scheduled',
    clientId: null, serviceId: null, staffId: record.staffId ?? null, roomId: null,
    ...(record.staffName ? { staff: { id: record.staffId ?? 0, firstName: record.staffName, lastName: '' } } : {}),
    client: { firstName: record.title, lastName: '' },
    service: { name: record.location || '', color: PERSONAL_APPOINTMENT_COLOR, price: 0, duration: eh * 60 + em - sh * 60 - sm },
    reminderType: null, reminderSent: false, reminderConfirmed: false,
  };
}
export const personalAppointmentsSchemaSql = `
CREATE TABLE IF NOT EXISTS personal_appointments (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamp DEFAULT now(),
  CONSTRAINT personal_appointments_time_order CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS personal_appointments_user_date_idx ON personal_appointments(user_id, date);
ALTER TABLE personal_appointments ADD COLUMN IF NOT EXISTS profile_id integer;
CREATE TABLE IF NOT EXISTS personal_google_outbox (
  appointment_id integer PRIMARY KEY, profile_id integer NOT NULL,
  event_data jsonb, google_calendar_id text, google_event_id text,
  sync_pending boolean NOT NULL DEFAULT true, deleted boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS personal_google_outbox_profile_idx ON personal_google_outbox(profile_id);
`;