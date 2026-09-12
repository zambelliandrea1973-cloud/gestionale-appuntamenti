/** Parse Passport's stable `type:id` representation without accepting a
 * partially numeric ID (for example `staff:123abc`). */
export function parseSerializedPassportId(serialized: unknown): { type: string; id: number } | null {
  if (typeof serialized !== 'string') return null;
  const separator = serialized.indexOf(':');
  if (separator <= 0 || separator === serialized.length - 1) return null;
  const type = serialized.slice(0, separator);
  const idText = serialized.slice(separator + 1);
  if (!/^(?:staff|admin|customer|user|client)$/.test(type) || !/^[1-9]\d*$/.test(idText)) {
    return null;
  }
  const id = Number(idText);
  return Number.isSafeInteger(id) ? { type, id } : null;
}