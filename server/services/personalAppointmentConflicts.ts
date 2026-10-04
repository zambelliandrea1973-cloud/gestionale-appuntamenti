import { sql } from 'drizzle-orm';
import { db } from '../db';
import { PrivateError, type PrivateProfile } from './privateAppointmentAccess';
import type { PersonalAppointmentInput } from '../../shared/personalAppointments';

/** Only resource/time information may cross the private/work boundary. */
export async function assertWorkOutsidePersonal(userId: number, value: {
  date?: string; startTime?: string; endTime?: string; staffId?: number | null; status?: string; importedFromGoogle?: boolean;
}, executor: any = db) {
  if (value.importedFromGoogle || ['cancelled', 'canceled'].includes(value.status || '') ||
    !value.date || !value.startTime || !value.endTime) return;
  let matches: any[];
  try { matches = await executor.execute(sql`SELECT p.id FROM personal_appointments p
    LEFT JOIN private_appointment_profiles pr ON pr.id=p.profile_id AND pr.user_id=p.user_id
    WHERE p.user_id=${userId} AND p.date=${value.date}
    AND p.start_time<${value.endTime}::time AND p.end_time>${value.startTime}::time
    AND COALESCE(pr.identity_id,0)=${Number(value.staffId) || 0} LIMIT 1`); }
  catch { throw new PrivateError(503, 'Non riesco a verificare la disponibilità. Riprova senza salvare sovrapposizioni.', 'AVAILABILITY_UNAVAILABLE'); }
  if (matches.length) throw new PrivateError(409, 'Il professionista è occupato in questo orario. Scegli un altro orario.', 'PERSONAL_TIME_CONFLICT');
}
export async function assertPersonalOutsideWork(profile: PrivateProfile, value: PersonalAppointmentInput, ignoreId?: number, executor: any = db) {
  const work = await executor.execute(sql`SELECT id FROM appointments WHERE user_id=${profile.user_id}
    AND date=${value.date} AND COALESCE(status,'scheduled') NOT IN ('cancelled','canceled')
    AND COALESCE(staff_id,0)=${profile.identity_id}
    AND start_time<${value.endTime}::time AND end_time>${value.startTime}::time LIMIT 1`);
  const personal = await executor.execute(sql`SELECT id FROM personal_appointments
    WHERE user_id=${profile.user_id}
    AND (profile_id=${profile.id} OR (${profile.identity_id}=0 AND profile_id IS NULL))
    AND date=${value.date} AND start_time<${value.endTime}::time AND end_time>${value.startTime}::time
    AND id<>${ignoreId || 0} LIMIT 1`);
  if (work.length || personal.length)
    throw new PrivateError(409, 'L’orario si sovrappone a un impegno già presente. Scegli un altro orario.', 'PERSONAL_TIME_CONFLICT');
}