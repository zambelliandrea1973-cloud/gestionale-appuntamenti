import { getPersistentUiPreferenceValue, setPersistentUiPreferenceValue } from './persistentUiPreferences';

const preference = 'private-appointment-creation-mode';
const accountId = (account?: number | string) => {
  const id = Number(account);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export function readPrivateAppointmentMode(account?: number | string): 'work' | 'free' {
  const id = accountId(account);
  if (!id) return 'work';
  try {
    const saved = getPersistentUiPreferenceValue(id, preference);
    if (saved === 'free' || saved === 'work') return saved;
    return getPersistentUiPreferenceValue(id, 'appointment-creation-mode') === 'personal' ? 'free' : 'work';
  } catch (error) {
    console.warn('Impossibile leggere la preferenza di inserimento appuntamenti.', error);
    return 'work';
  }
}

export function persistPrivateAppointmentMode(account: number | string | undefined, mode: 'work' | 'free') {
  const id = accountId(account);
  if (!id) return;
  try { setPersistentUiPreferenceValue(id, preference, mode); }
  catch (error) { console.warn('Impossibile conservare la preferenza di inserimento appuntamenti.', error); }
}

// The profile-protected form/voice flows intercept the calendar controls.
// Native forms still edit work records and must not independently switch to the
// earlier personal-record implementation on the basis of a stale preference.
export function resetNativeAppointmentMode(account?: number | string) {
  const id = accountId(account);
  if (!id) return;
  try {
    setPersistentUiPreferenceValue(id, 'appointment-creation-mode', 'work');
    window.dispatchEvent(new Event('storage'));
  } catch (error) { console.warn('Impossibile aggiornare la modalità dei moduli di lavoro.', error); }
}