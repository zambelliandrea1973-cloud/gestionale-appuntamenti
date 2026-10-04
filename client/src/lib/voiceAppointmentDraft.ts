export const VOICE_APPOINTMENT_DRAFT_EVENT = 'voice-appointment-draft-ready';
export const VOICE_APPOINTMENT_DRAFT_STORAGE_KEY = 'voice-appointment-draft';

export interface VoiceAppointmentFormDraft {
  appointmentKind?: 'work' | 'personal';
  title?: string;
  location?: string;
  endTime?: string;
  clientId: number;
  clientName: string;
  serviceId: number | null;
  serviceName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  staffId?: number | null;
  roomId?: number | null;
  notes?: string;
}