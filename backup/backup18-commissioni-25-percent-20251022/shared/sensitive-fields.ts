/**
 * Definisce i campi considerati sensibili per ogni tabella
 * Questi campi verranno crittografati prima di essere salvati nel database
 * e decrittografati quando vengono recuperati
 */

export const sensitiveFields = {
  clients: [
    'phone',
    'email',
    'address',
    'birthday',
    'notes',
    'medicalNotes',
    'allergies'
  ],
  appointments: [
    'notes'
  ],
  consents: [
    'signature'
  ],
  invoices: [
    'notes'
  ],
  payments: [
    'reference',
    'notes'
  ],
  users: [
    'email'
  ],
  clientNotes: [
    'content'
  ],
  notifications: [
    'message'
  ]
} as const;

/**
 * Determina se un campo è sensibile
 * @param tableName Nome della tabella
 * @param fieldName Nome del campo
 * @returns true se il campo è sensibile
 */
export function isSensitiveField(tableName: string, fieldName: string): boolean {
  if (!sensitiveFields[tableName as keyof typeof sensitiveFields]) {
    return false;
  }
  
  return sensitiveFields[tableName as keyof typeof sensitiveFields].includes(fieldName as any);
}