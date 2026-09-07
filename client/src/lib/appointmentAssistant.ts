export interface AssistantClient {
  id: number;
  firstName: string;
  lastName?: string | null;
}

export interface AssistantService {
  id: number;
  name: string;
  duration?: number | null;
}

export function normalizeAssistantName(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it-IT')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getAssistantGreetingName(email: string | null | undefined): string {
  return (email || '')
    .split('@')[0]
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findAssistantClient(
  clients: AssistantClient[],
  requestedName: string
): AssistantClient | undefined {
  const target = normalizeAssistantName(requestedName);
  if (!target) return undefined;

  return clients.find(client => {
    const fullName = normalizeAssistantName(`${client.firstName} ${client.lastName || ''}`);
    return fullName === target;
  });
}

export function findAssistantService(
  services: AssistantService[],
  requestedName: string
): AssistantService | undefined {
  const target = normalizeAssistantName(requestedName);
  if (!target) return undefined;

  return services.find(service => normalizeAssistantName(service.name) === target);
}

export function addMinutesToTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const total = (hours * 60 + minutes + durationMinutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function splitClientName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || fullName.trim(),
    lastName: parts.join(' ')
  };
}