import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { personalAppointmentForCalendar, type PersonalAppointmentRecord } from '../../../shared/personalAppointments';

// Keep the personal feed in the appointment query subtree: existing calendar
// delete/refresh actions then invalidate it as well, without changing work URLs.
export const PERSONAL_APPOINTMENTS_QUERY = ['/api/appointments', 'personal'] as const;
export const PERSONAL_APPOINTMENT_SAVED_EVENT = 'personal-appointment-saved';
export const PERSONAL_APPOINTMENT_DATE_KEY = 'personal-appointment-selected-date';
export function notifyPersonalAppointmentSaved(date: string, showDay = false) {
  const detail = { date, showDay };
  sessionStorage.setItem(PERSONAL_APPOINTMENT_DATE_KEY, JSON.stringify(detail));
  window.dispatchEvent(new CustomEvent(PERSONAL_APPOINTMENT_SAVED_EVENT, { detail }));
}
export function usePersonalCalendarAppointments(workAppointments: any[], startDate?: string, endDate = startDate) {
  const query = useQuery<PersonalAppointmentRecord[]>({
    queryKey: PERSONAL_APPOINTMENTS_QUERY,
    queryFn: async () => (await apiRequest('GET', '/api/personal-appointments')).json(),
  });
  const appointments = useMemo(() => [
    ...(Array.isArray(workAppointments) ? workAppointments : []),
    ...(query.data || []).filter(record => !startDate || (record.date >= startDate && record.date <= (endDate || startDate))).map(personalAppointmentForCalendar),
  ], [workAppointments, query.data, startDate, endDate]);
  return { appointments, error: query.error, isLoading: query.isLoading };
}