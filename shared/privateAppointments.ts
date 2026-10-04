import { z } from 'zod';
import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';

export const privateDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => {
    const date = parseISO(value);
    return !Number.isNaN(date.getTime()) && format(date, 'yyyy-MM-dd') === value;
  }, 'Data non valida');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const privateEventFields = z.object({
  title: z.string().trim().min(1).max(200),
  startDate: privateDate,
  endDate: privateDate,
  startTime: time.default('00:00'),
  endTime: time.default('00:00'),
  allDay: z.boolean().default(false),
  location: z.string().max(500).default(''),
  description: z.string().max(5000).default(''),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  reminderMinutes: z.union([z.literal(0), z.literal(5), z.literal(15), z.literal(60), z.null()]).default(null),
});
export const privateEventInput = privateEventFields.extend({
  allowConflict: z.boolean().optional(),
}).strict().superRefine((event, ctx) => {
  if (event.endDate < event.startDate ||
      (!event.allDay && `${event.endDate}T${event.endTime}` <= `${event.startDate}T${event.startTime}`)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fine deve essere successiva all’inizio.', path: ['endDate'] });
  }
  if (differenceInCalendarDays(parseISO(event.endDate), parseISO(event.startDate)) > 366) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Durata massima: 366 giorni.', path: ['endDate'] });
  }
});
export type PrivateEvent = z.infer<typeof privateEventFields>;

/** Exclusive all-day ends are used only at the provider boundary. Local ends are inclusive. */
export function expandPrivateEvent(event: PrivateEvent, start: string, end: string): (PrivateEvent & { occurrenceDate: string })[] {
  const origin = parseISO(event.startDate);
  const duration = differenceInCalendarDays(parseISO(event.endDate), origin);
  const output: (PrivateEvent & { occurrenceDate: string })[] = [];
  const rangeStart = parseISO(start);
  let index = event.recurrence === 'daily'
    ? Math.max(0, differenceInCalendarDays(rangeStart, origin) - duration)
    : event.recurrence === 'weekly'
      ? Math.max(0, Math.floor((differenceInCalendarDays(rangeStart, origin) - duration) / 7))
      : event.recurrence === 'monthly'
        ? Math.max(0, (rangeStart.getFullYear() - origin.getFullYear()) * 12 + rangeStart.getMonth() - origin.getMonth() - Math.ceil(duration / 28) - 1)
        : 0;
  for (let guard = 0; guard < 1100; guard++, index++) {
    const date = event.recurrence === 'monthly' ? addMonths(origin, index)
      : addDays(origin, event.recurrence === 'weekly' ? index * 7 : event.recurrence === 'daily' ? index : 0);
    const occurrenceDate = format(date, 'yyyy-MM-dd');
    const occurrenceEnd = format(addDays(date, duration), 'yyyy-MM-dd');
    if (occurrenceDate > end) break;
    if (occurrenceEnd >= start) output.push({ ...event, startDate: occurrenceDate, endDate: occurrenceEnd, occurrenceDate });
    if (event.recurrence === 'none') break;
  }
  return output;
}

export function privateGoogleBody(event: PrivateEvent, timezone: string) {
  return {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.allDay ? { date: event.startDate }
      : { dateTime: `${event.startDate}T${event.startTime}:00`, timeZone: timezone },
    end: event.allDay ? { date: format(addDays(parseISO(event.endDate), 1), 'yyyy-MM-dd') }
      : { dateTime: `${event.endDate}T${event.endTime}:00`, timeZone: timezone },
    recurrence: event.recurrence === 'none' ? [] : [`RRULE:FREQ=${event.recurrence.toUpperCase()}`],
    reminders: { useDefault: false, overrides: event.reminderMinutes === null ? [] : [{ method: 'popup', minutes: event.reminderMinutes }] },
  };
}