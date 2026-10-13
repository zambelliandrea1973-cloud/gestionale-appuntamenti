import { z } from 'zod';
import { privateEventInput } from './privateAppointments';
import { personalAppointmentSchema } from './personalAppointments';

export const archivePreviewInput = z.object({
  profileId: z.number().int().positive(),
  password: z.string().min(1).max(1024),
  authorizePreview: z.literal(true),
}).strict();
export const archiveCommitInput = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  ids: z.array(z.number().int().positive()).min(1).max(500)
    .refine(ids => new Set(ids).size === ids.length),
  acknowledgeUnprotectedDestination: z.literal(true),
}).strict();

/** Reject rather than silently dropping semantics the local calendar cannot store. */
export function archiveTransferCandidate(data: unknown) {
  const event = privateEventInput.safeParse(data);
  if (!event.success) return { reason: 'Dati non validi: conserva questo impegno nell’archivio.', input: null };
  const value = event.data;
  let reason: string | null = null;
  if (value.allDay) reason = 'Gli eventi di giornata intera non sono supportati dagli impegni locali.';
  else if (value.startDate !== value.endDate) reason = 'Gli eventi su più giorni non sono supportati dagli impegni locali.';
  else if (value.recurrence !== 'none') reason = 'Le ricorrenze non sono supportate dagli impegni locali.';
  else if (value.reminderMinutes !== null) reason = 'Questo promemoria non può essere conservato negli impegni locali.';
  const parsed = personalAppointmentSchema.safeParse({
    title: value.title, date: value.startDate, startTime: value.startTime,
    endTime: value.endTime, location: value.location, notes: value.description,
  });
  if (!reason && !parsed.success) reason = 'L’impegno non è compatibile con il calendario locale.';
  return { reason, input: !reason && parsed.success ? parsed.data : null };
}

// No foreign key to the retired tables: startup must not recreate or alter the archive.
// Keep the receipt after destination deletion so retries cannot resurrect a removed copy.
export const archiveTransferSchemaSql = `
CREATE TABLE IF NOT EXISTS private_appointment_transfer_grants (
  token_hash varchar(64) PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id integer NOT NULL,
  session_hash varchar(64) NOT NULL,
  credential_hash varchar(64) NOT NULL,
  snapshot jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS private_appointment_transfer_receipts (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id integer NOT NULL,
  source_id integer NOT NULL,
  destination_id integer NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, profile_id, source_id)
);
`;