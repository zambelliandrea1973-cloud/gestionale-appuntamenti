import { z } from 'zod';

export const LIVE_APPOINTMENT_MODEL = 'gemini-3.8-live';
export const LIVE_SESSION_MS = 10 * 60_000;
export const LIVE_SOCKET_PATH = '/api/ai-appointment-assistant/live';

export const calendarScopeInstruction = `Classifica semanticamente OGNI richiesta con calendarScope: work per prenotazioni professionali di clienti/pazienti o servizi dello studio; personal per memo, note, promemoria e commissioni personali anche se chiamati "appuntamento"; uncertain quando la destinazione non è chiara. "Crea un appuntamento per domani per andare in banca" è personal, title="Andare in banca", date=domani, senza cliente, servizio o prezzo. "Prenota un trattamento per la cliente Anna" è work. Un nome, banca o dentista da solo non prova che sia privato: un cliente o un servizio professionale esplicito non può diventare personal. In caso di segnali contrastanti usa uncertain. Non scegliere un profilo privato, non autorizzare accessi o salvataggi. Ricava title dal motivo espresso anche in modalità work quando calendarScope è personal o uncertain.`;

export const liveInterpretationSchema = z.object({
  calendarScope: z.enum(['work', 'personal', 'uncertain']).nullable().optional(),
  action: z.enum(['create', 'delete', 'move']).nullable().optional(),
  searchTitle: z.string().max(200).nullable().optional(),
  originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  originalStartTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
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

/** Recover a stated purpose, not a guessed activity or an approval. */
export function recoverPersonalTitle(fields: LiveInterpretation, text: string): LiveInterpretation {
  if (fields.title?.trim()) return fields;
  if (fields.serviceName?.trim() && text.toLocaleLowerCase().includes(fields.serviceName.trim().toLocaleLowerCase())) {
    return { ...fields, title: fields.serviceName.trim() };
  }
  const purpose = text.match(/\b(?:appuntamento|visita|incontro|impegno)\s+(?:per|con|dal|dalla|al|alla)\s+(?:(?:il|lo|la|un|una)\s+)?([^.!?]+)/i)
    || text.match(/\bandare\s+(?:dal|dalla|al|alla)\s+([^.!?]+)/i);
  if (!purpose) return fields;
  const title = purpose[1].split(/\s+(?:(?:per\s+)?(?:il|giorno)\s+\d|alle\s+\d|(?:domani|dopodomani|oggi|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)(?=\s|$)|per\s+\d+\s+(?:minuti|ore))/i)[0].trim().replace(/[,;:]$/, '');
  if (!title || title.length > 120 || !new RegExp('^\\p{L}', 'u').test(title) ||
      /^(?:oggi|domani|dopodomani|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|ore|le)(?:\s|$)/i.test(title)) return fields;
  return { ...fields, title: title[0].toLocaleUpperCase() + title.slice(1) };
}

export function liveAppointmentSetup(mode: 'work' | 'personal', language: string) {
  const properties: Record<string, object> = {};
  for (const name of Object.keys(liveInterpretationSchema.shape)) {
    if (mode === 'personal' && ['clientName', 'serviceName', 'servicePrice'].includes(name)) continue;
    properties[name] = ['durationMinutes', 'servicePrice'].includes(name)
      ? { type: 'NUMBER', nullable: true }
      : { type: 'STRING', nullable: true };
  }
  properties.title = {
    type: 'STRING', nullable: true,
    description: 'In modalità personal, oppure in modalità work se calendarScope è personal o uncertain: titolo breve ricavato dall’attività o dal motivo già detto. Appuntamento per il dentista → Dentista; andare in banca → Andare in banca; andare al cinema → Cinema; ritirare un pacco → Ritiro pacco. Non serve un titolo formale. Ometti solo se il motivo manca davvero. Non trasformare un servizio professionale in un impegno privato.',
  };
  properties.calendarScope = {
    type: 'STRING', nullable: true, enum: ['work', 'personal', 'uncertain'],
    description: calendarScopeInstruction,
  };
  properties.action = { type: 'STRING', nullable: true, enum: ['create', 'delete', 'move'],
    description: 'Operazione richiesta: create nuovo appuntamento, delete eliminazione/disdetta esistente, move spostamento/riprogrammazione esistente. Non trattare elimina/sposta come creazione.' };
  properties.searchTitle = { type: 'STRING', nullable: true, description: 'Solo nome/titolo/cliente dell’appuntamento da cercare, senza verbi né nuova data. Esempio: mi elimini quello del dentista → Dentista.' };
  properties.originalDate = { type: 'STRING', nullable: true, description: 'Data dell’appuntamento ESISTENTE da identificare, solo se espressamente indicata. Non confonderla con la nuova data dello spostamento.' };
  properties.originalStartTime = { type: 'STRING', nullable: true, description: 'Ora ORIGINALE da cercare, solo se indicata. startTime invece è la nuova ora per move.' };
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
${calendarScopeInstruction}
Per OGNI richiesta dell'utente, anche una correzione o un sì/no, chiama prima appointment_turn. Estrai SOLO i campi realmente comunicati o corretti nel turno, senza inventare dati e senza copiare campi non modificati. Risolvi date relative e orari. Non prendere decisioni di salvataggio.
Riconosci anche eliminazione/disdetta e spostamento di appuntamenti esistenti: action=delete o move, searchTitle=nome/titolo/cliente da cercare. Non chiedere quando CREARE un evento se l'utente vuole eliminarlo. Per move, originalDate/originalStartTime identificano il vecchio appuntamento; date/startTime/endTime/durationMinutes sono SOLO la destinazione nuova. Se mancano, lascia null: il gestionale cercherà l'esistente e chiederà quale spostare e dove. Non inventare identificativi né scegliere al posto dell'utente. Il gestionale mostra candidati e richiede conferma prima di eliminare o spostare.
Interpreta l'intenzione anche attraverso sinonimi e parafrasi: "fissa/prenota/segna/metti in agenda" → create; "annulla/disdici/non ci vado più/non serve più/è saltato" → delete; "rimanda/posticipa/anticipa/mettilo un altro giorno/facciamolo più tardi" → move. Se il soggetto o la nuova data/ora sono ambigui, non indovinare: ometti i campi incerti per consentire al gestionale di chiedere chiarimenti.
Il gestionale ti restituirà il messaggio e i controlli da seguire: pronuncialo fedelmente e attendi l'utente. Se il gestionale segnala errore, comunicalo senza fingere che l'azione sia riuscita.
Non creare direttamente clienti, servizi o appuntamenti. Non dichiarare mai un salvataggio senza risposta del gestionale.
${mode === 'personal' ? 'Per gli impegni personali, ricava SEMPRE title dal motivo o dall’attività menzionata: «Ho bisogno di fare un appuntamento per il dentista per il 22 alle ore 12» → title="Dentista", data del prossimo 22, startTime="12:00". Questo non è inventare: è riassumere il motivo espresso. Non mettere Dentista in serviceName e non chiedere come chiamare l’impegno se il motivo è già noto. Non chiedere clienti, trattamenti, prezzi o durata obbligatoria: giorno e ora iniziale bastano; il gestionale usa 15 minuti se la durata non è indicata.' : 'Nomi clienti, servizi, durate, disponibilità e conferme vengono verificati dal gestionale.'}
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