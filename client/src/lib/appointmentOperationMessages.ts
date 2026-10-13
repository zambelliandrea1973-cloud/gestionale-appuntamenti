import i18n from './i18n';
import it from '../locales/it.json';

export type AppointmentOperationMessage = keyof typeof it.existingAppointmentOperations;

/** Use the assistant's current language, including after a language switch. */
export function appointmentOperationText(
  language: string,
  key: AppointmentOperationMessage,
  values: Record<string, string | number> = {},
): string {
  return i18n.getFixedT(language)(`existingAppointmentOperations.${key}`, values);
}
