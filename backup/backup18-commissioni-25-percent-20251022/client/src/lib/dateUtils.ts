/**
 * Formatta una data nel formato locale desiderato
 * @param dateString Data in formato stringa
 * @param locale Locale da utilizzare per la formattazione
 * @returns Data formattata
 */
export function formatDate(dateString: string, locale: string = 'it-IT'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Formatta un orario nel formato HH:MM
 * @param dateString Data in formato stringa
 * @returns Orario formattato
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

/**
 * Formatta una data e ora completa
 * @param dateString Data in formato stringa
 * @param locale Locale da utilizzare per la formattazione
 * @returns Data e ora formattate
 */
export function formatDateTime(dateString: string, locale: string = 'it-IT'): string {
  const date = new Date(dateString);
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}