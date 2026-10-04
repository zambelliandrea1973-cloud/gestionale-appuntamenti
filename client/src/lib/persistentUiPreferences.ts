const PERSISTENT_UI_PREFIX = "persistent-ui-preference:";

function preferenceKey(userId: number, preference: string): string {
  return `${PERSISTENT_UI_PREFIX}${userId}:${preference}`;
}

export function getPersistentUiPreferenceValue(
  userId: number,
  preference: string
): string | null {
  return localStorage.getItem(preferenceKey(userId, preference));
}

export function setPersistentUiPreferenceValue(
  userId: number,
  preference: string,
  value: string
): void {
  localStorage.setItem(preferenceKey(userId, preference), value);
}

export function hasPersistentUiPreference(
  userId: number,
  preference: string
): boolean {
  try {
    return localStorage.getItem(preferenceKey(userId, preference)) === "1";
  } catch {
    return false;
  }
}

export function setPersistentUiPreference(
  userId: number,
  preference: string
): void {
  try {
    localStorage.setItem(preferenceKey(userId, preference), "1");
  } catch {}
}

export function isPersistentUiPreferenceKey(key: string): boolean {
  return key.startsWith(PERSISTENT_UI_PREFIX);
}

export function sessionUiPreferenceKey(
  userId: number,
  preference: string
): string {
  return `session-ui-preference:${userId}:${preference}`;
}