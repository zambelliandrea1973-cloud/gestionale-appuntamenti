/**
 * Hook per rilevare il fuso orario del dispositivo
 */
export function useTimezone(): string {
  // Rileva il fuso orario del PC usando Intl
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`🌍 Fuso orario rilevato: ${timeZone}`);
  return timeZone;
}
