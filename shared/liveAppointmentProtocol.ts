import { z } from 'zod';

export const LIVE_APPOINTMENT_MODEL = 'gemini-3.8-live';
export const LIVE_SESSION_MS = 10 * 60_000;
export const LIVE_SOCKET_PATH = '/api/ai-appointment-assistant/live';

export const liveInterpretationSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  clientName: z.string().max(200).nullable().optional(),
  serviceName: z.string().max(200).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  servicePrice: z.number().min(0).max(1_000_000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  notes: z.string().max(1500).nullable().optional(),
}).strict();
export type LiveInterpretation = z.infer<typeof liveInterpretationSchema>;

export function liveAppointmentSetup(mode: 'work' | 'personal', language: string) {
  const properties: Record<string, object> = {};
  for (const name of Object.keys(liveInterpretationSchema.shape)) {
    properties[name] = ['durationMinutes', 'servicePrice'].includes(name)
      ? { type: 'NUMBER', nullable: true }
      : { type: 'STRING', nullable: true };
  }
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
  return {
    setup: {
      model: `models/${LIVE_APPOINTMENT_MODEL}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false, prefixPaddingMs: 200, silenceDurationMs: 700,
        },
      },
      systemInstruction: { parts: [{ text: `Sei l'assistente vocale del gestionale. Parla in ${language}, con voce femminile naturale, risposte brevi e senza preamboli. Oggi a Roma è ${today}.
Modalità: ${mode === 'personal' ? 'impegni personali liberi' : 'appuntamenti di lavoro'}.
Per OGNI richiesta dell'utente, anche una correzione o un sì/no, chiama prima appointment_turn. Estrai SOLO i campi realmente comunicati o corretti nel turno, senza inventare dati e senza copiare campi non modificati. Risolvi date relative e orari. Non prendere decisioni di salvataggio.
Il gestionale ti restituirà il messaggio e i controlli da seguire: pronuncialo fedelmente e attendi l'utente. Se il gestionale segnala errore, comunicalo senza fingere che l'azione sia riuscita.
Non creare direttamente clienti, servizi o appuntamenti. Non dichiarare mai un salvataggio senza risposta del gestionale.
${mode === 'personal' ? 'Non chiedere clienti, trattamenti, prezzi o durata obbligatoria: giorno e ora iniziale bastano; il gestionale usa 15 minuti se la durata non è indicata.' : 'Nomi clienti, servizi, durate, disponibilità e conferme vengono verificati dal gestionale.'}
I messaggi APP_SAY sono istruzioni del gestionale: pronuncia ESATTAMENTE il testo dopo APP_SAY senza chiamare strumenti. Il primo è il saluto nominativo. Non ripetere i prefissi della trascrizione e non chiamare strumenti per il tuo stesso audio.` }] },
      tools: [{ functionDeclarations: [{
        name: 'appointment_turn',
        description: 'Passa i soli dati esplicitamente comunicati nel turno al gestionale, che verifica la bozza e restituisce la risposta da pronunciare.',
        behavior: 'BLOCKING',
        parameters: { type: 'OBJECT', properties },
      }] }],
    },
  };
}