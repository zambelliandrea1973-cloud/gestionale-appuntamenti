import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { personalRequest } from '@/components/personal-space/api';
import { usePersonalSpace } from '@/components/personal-space/PersonalSpaceProvider';
import { personalAppointmentForCalendar, type PersonalAppointmentRecord } from '../../../shared/personalAppointments';

// Keep the personal feed in the appointment query subtree: existing calendar
// delete/refresh actions then invalidate it as well, without changing work URLs.
export const PERSONAL_APPOINTMENTS_QUERY = ['/api/appointments', 'personal'] as const;
export const personalAppointmentsQueryKey = (profileId?: number) => [...PERSONAL_APPOINTMENTS_QUERY, profileId ?? 'locked'] as const;
export const PERSONAL_APPOINTMENT_SAVED_EVENT = 'personal-appointment-saved';
export const PERSONAL_APPOINTMENT_DATE_KEY = 'personal-appointment-selected-date';
export function notifyPersonalAppointmentSaved(date: string, showDay = false) {
  const detail = { date, showDay };
  sessionStorage.setItem(PERSONAL_APPOINTMENT_DATE_KEY, JSON.stringify(detail));
  window.dispatchEvent(new CustomEvent(PERSONAL_APPOINTMENT_SAVED_EVENT, { detail }));
}
export function usePersonalCalendarAppointments(workAppointments: any[], startDate?: string, endDate = startDate) {
  const space = usePersonalSpace();
  const profileId = space.access?.profile.id;
  const own = useQuery<PersonalAppointmentRecord[]>({
    queryKey: personalAppointmentsQueryKey(profileId),
    queryFn: () => personalRequest<PersonalAppointmentRecord[]>(''),
    enabled: space.unlocked,
    staleTime: 0,
  });
  const busy = useQuery<any[]>({
    queryKey: ['/api/personal-appointments/busy', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      const response = await fetch(`/api/personal-appointments/busy${params.size ? `?${params}` : ''}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Impegni occupati non disponibili');
      return response.json();
    },
    staleTime: 30_000,
  });
  const appointments = useMemo(() => [
    ...(Array.isArray(workAppointments) ? workAppointments : []),
    ...(busy.data || []).filter((row: any) =>
      (!startDate || (row.date >= startDate && row.date <= (endDate || startDate))) &&
      !(space.unlocked ? own.data || [] : []).some(record => record.id === row.id)
    ).map(row => personalAppointmentForCalendar({ ...row, userId: 0,
      isPersonalBusy: true, title: 'Occupato', location: '', notes: '' })),
    ...(space.unlocked ? own.data || [] : []).filter(record => !startDate || (record.date >= startDate && record.date <= (endDate || startDate))).map(personalAppointmentForCalendar),
  ], [workAppointments, own.data, busy.data, startDate, endDate, space.unlocked]);
  return { appointments, error: own.error || busy.error, isLoading: own.isLoading || busy.isLoading };
}