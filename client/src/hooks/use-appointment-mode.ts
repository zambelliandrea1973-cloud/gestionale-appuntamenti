import { useSyncExternalStore } from 'react';
import { useAuth } from './use-auth';
import { getPersistentUiPreferenceValue, setPersistentUiPreferenceValue } from '../lib/persistentUiPreferences';
export type AppointmentCreationMode = 'work' | 'personal';
const preference = 'appointment-creation-mode';
const fallbackModes = new Map<number, AppointmentCreationMode>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // localStorage changes in another tab must update both manual and AI controls.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};
function readMode(userId: number | undefined): AppointmentCreationMode {
  if (!userId) return 'work';
  try {
    const saved = getPersistentUiPreferenceValue(userId, preference);
    return saved === 'personal' ? 'personal' : 'work';
  } catch {
    return fallbackModes.get(userId) || 'work';
  }
}
export function useAppointmentMode() {
  const { user } = useAuth();
  const userId = user?.id;
  const current = useSyncExternalStore(subscribe, () => readMode(userId), () => 'work' as AppointmentCreationMode);
  return [current, (next: AppointmentCreationMode) => {
    if (!userId || (next !== 'work' && next !== 'personal')) return;
    fallbackModes.set(userId, next);
    try {
      setPersistentUiPreferenceValue(userId, preference, next);
    } catch (error) {
      console.warn('Appointment mode cannot be persisted: browser storage is unavailable.', error);
    }
    listeners.forEach(listener => listener());
  }] as const;
}