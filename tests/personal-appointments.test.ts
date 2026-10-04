import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getAssistantGreetingName } from '../client/src/lib/appointmentAssistant';
import ts from 'typescript';
import { createAssistantRecognition } from '../client/src/lib/assistantRecognition';
import {
  personalAppointmentSchema, personalAppointmentForCalendar,
  completePersonalAppointmentDraft,
  PERSONAL_APPOINTMENT_BACKGROUND, PERSONAL_APPOINTMENT_COLOR,
} from '../shared/personalAppointments';

const input = { title: 'Ritiro pacco', date: '2026-10-05', startTime: '10:15', endTime: '10:45' };

test('personal assistant opens with the work greeting followed by Dimmi pure', () => {
  const source = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  const start = source.indexOf('      const greetingName =');
  const end = source.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start);
  const openGreeting = new Function(
    'professionalEmail', 't', 'getAssistantGreetingName', 'setDraft', 'setInput', 'setMessages',
    'generation', 'offlineGreeting', 'speakOfflineAssistantGreeting', 'speechLocale', 'openRef', 'listenRef',
    'getCachedAssistantGreeting', 'greetingCacheKey', 'beginLive',
    source.slice(start, end),
  );
  const locale = JSON.parse(readFileSync('client/src/locales/it.json', 'utf8'));
  const t = (key: string, values?: { name: string } | string) => {
    const [section, item] = key.split('.');
    return locale[section][item].replace('{{name}}', typeof values === 'object' ? values.name : '');
  };
  for (const [email, expected] of [
    ['andrea@example.com', 'Ciao andrea. Dimmi pure.'],
    [undefined, 'Ciao. Dimmi pure.'],
  ]) {
    let messages: unknown;
    let listeningStarts = 0;
    openGreeting(email, t, getAssistantGreetingName, () => {}, () => {}, (value: unknown) => { messages = value; },
      { current: 1 }, { current: null }, (options: any) => { options.onComplete(); return { cancel() {} }; },
      'it-IT', { current: true }, { current: () => { listeningStarts++; } }, () => undefined, 'test-greeting', () => { listeningStarts++; });
    assert.deepEqual(messages, [{ role: 'assistant', content: expected }]);
    assert.equal(listeningStarts, 1);
  }
  const wrapper = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(wrapper, /<PersonalVoiceAppointmentAssistant professionalEmail=\{props\.professionalEmail\}/);
});

function voiceHarness(activeConversation = true, paidGreeting = false) {
  const source = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  const ast = ts.createSourceFile('assistant.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  // Regression coverage for the preserved legacy implementation, not Live latency.
  const names = new Set(['clearSpeechTimers', 'stopAudio', 'cancelRecognition', 'stop', 'legacySpeak', 'legacyListen']);
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name && names.has(node.name.text)) declarations.push(node.getText(ast));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(declarations.length, names.size);
  const engines: any[] = [];
  const players: any[] = [];
  const utterances: any[] = [];
  const submitted: string[] = [];
  const errors: string[] = [];
  const requests: string[] = [];
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let timerId = 0;
  let listening = false;
  let failStart = false;
  class Recognition {
    onstart: any; onend: any; onerror: any; onresult: any;
    constructor() { engines.push(this); }
    start() { if (failStart) throw new Error('start failed'); this.onstart?.(); }
    stop() { this.onend?.(); }
    abort() { this.onend?.(); }
  }
  class Audio {
    onended: any; onerror: any;
    constructor() { players.push(this); }
    async play() {}
    pause() {}
  }
  class Utterance {
    onend: any; onerror: any;
    constructor() { utterances.push(this); }
  }
  const env = {
    window: {
      SpeechRecognition: Recognition,
      speechSynthesis: { cancel() {}, speak() {}, getVoices: () => [] },
      setTimeout: (callback: () => void, delay: number) => {
        timers.set(++timerId, { callback, delay });
        return timerId;
      },
      clearTimeout: (id: number) => { timers.delete(id); },
    },
    Audio, SpeechSynthesisUtterance: Utterance,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    generation: { current: 0 }, speechSequence: { current: 0 }, openRef: { current: true },
    speechRequest: { current: null }, speechTimers: { current: [] }, recognitionTimer: { current: null },
    audio: { current: null }, audioUrl: { current: null }, utterance: { current: null },
    offlineGreeting: { current: null },
    liveSession: { current: null }, liveFields: { current: null },
    recognition: { current: null }, inFlight: { current: false }, pendingAutoListen: { current: false },
    listenRef: { current: () => {} }, submitRef: { current: (text: string) => submitted.push(text) },
    conversation: { current: { isActive: () => activeConversation, getId: () => activeConversation ? 'test-conversation' : null } },
    trial: { data: { unlimited: paidGreeting } },
    queryClient: { fetchQuery: async () => ({ unlimited: paidGreeting }) },
    AI_TRIAL_ACCESS_KEY: ['/api/ai/trial-access'],
    blocked: false, save: { isPending: false }, speechLocale: 'it-IT',
    setInput() {},
    createAssistantRecognition: (options: any) => createAssistantRecognition({
      ...options,
      setTimer: (callback, delay) => env.window.setTimeout(callback, delay),
      clearTimer: timer => env.window.clearTimeout(timer as number),
    }),
    setListening: (value: boolean) => { listening = value; },
    setError: (value: string) => { errors.push(value); }, setTrialBlocked() {},
    t: (key: string) => key, aiTrialMessageKey: () => null,
    apiRequest: async (_method: string, url: string) => {
      requests.push(url);
      return { blob: async () => new Blob(['audio']) };
    },
  };
  const code = ts.transpileModule(declarations.join('\n').replaceAll('legacySpeak', 'speak').replaceAll('legacyListen', 'listen'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const api = new Function('env', `const {${Object.keys(env).join(',')}} = env;\n${code}\nreturn {listen,speak,stop};`)(env);
  env.listenRef.current = api.listen;
  return {
    api, env, engines, players, utterances, submitted, errors, requests, timers,
    fireTimers: (delay: number) => {
      for (const [id, timer] of [...timers]) {
        if (timer.delay === delay && timers.delete(id)) timer.callback();
      }
    },
    listening: () => listening, failStart: (value: boolean) => { failStart = value; },
  };
}

test('personal dictation restarts after the spoken reply, accepts repeated answers and ignores old callbacks', async () => {
  const h = voiceHarness();
  h.api.listen();
  const first = h.engines[0];
  const lateEnd = first.onend;
  const duplicateResult = first.onresult;
  const result = { results: [[{ transcript: 'sì' }]] };
  first.onresult(result);
  h.fireTimers(3000);
  duplicateResult(result);
  assert.deepEqual(h.submitted, ['sì']);
  assert.equal(h.listening(), false);
  await h.api.speak('Vuoi confermare?');
  assert.equal(h.engines.length, 1, 'must not record the assistant speaking');
  h.players[0].onended();
  assert.equal(h.engines.length, 2);
  assert.equal(h.listening(), true);
  lateEnd();
  assert.equal(h.listening(), true, 'old recognition must not reset the new session');
  h.engines[1].onresult(result);
  h.fireTimers(3000);
  assert.deepEqual(h.submitted, ['sì', 'sì']);
});

test('personal microphone can retry after start failure and never starts overlapping sessions', () => {
  const h = voiceHarness();
  h.failStart(true);
  h.api.listen();
  assert.equal(h.env.recognition.current, null);
  assert.equal(h.listening(), false);
  h.failStart(false);
  h.api.listen();
  assert.equal(h.listening(), true);
  h.api.listen();
  assert.equal(h.engines.length, 2, 'a second tap stops, rather than starting another engine');
  h.api.listen();
  assert.equal(h.engines.length, 3);
  assert.equal(h.listening(), true);
});

test('device speech does not start a trial and close cancels automatic recording', async () => {
  const h = voiceHarness(false);
  await h.api.speak('Ciao. Dimmi pure.');
  assert.equal(h.players.length, 0);
  assert.equal(h.engines.length, 0);
  const lateCompletion = h.utterances[0].onend;
  h.env.openRef.current = false;
  h.api.stop();
  lateCompletion();
  assert.equal(h.engines.length, 0);
});

test('paid personal speech remains available for AI replies', async () => {
  const h = voiceHarness(false, true);
  await h.api.speak('Ciao. Dimmi pure.');
  assert.deepEqual(h.requests, ['/api/ai-appointment-assistant/speech']);
  assert.equal(h.players.length, 1);
  assert.equal(h.utterances.length, 0);
  h.players[0].onended();
  assert.equal(h.listening(), true);
});

test('silent Android device speech cannot indefinitely block dictation', async () => {
  const h = voiceHarness(false);
  await h.api.speak('Ciao. Dimmi pure.');
  assert.equal(h.listening(), false);
  h.fireTimers(5000);
  assert.equal(h.listening(), true);
  assert.ok(h.errors.includes('personalAppointments.speechError'));
  assert.equal(h.timers.size, 0);
});

test('device speech errors resume dictation and manual interruption cancels old timers', async () => {
  const h = voiceHarness(false);
  await h.api.speak('Ciao.');
  h.utterances[0].onerror();
  assert.equal(h.listening(), true);
  h.api.stop();
  await h.api.speak('Ciao di nuovo.');
  const lateEnd = h.utterances[1].onend;
  h.api.listen();
  lateEnd();
  h.fireTimers(5000);
  assert.equal(h.engines.length, 2);
  assert.equal(h.listening(), true);
});

test('early speech completion queues recording until the current interpretation has finished', async () => {
  const h = voiceHarness();
  h.env.inFlight.current = true;
  await h.api.speak('Quando?');
  h.players[0].onended();
  assert.equal(h.env.pendingAutoListen.current, true);
  assert.equal(h.engines.length, 0);
  h.env.inFlight.current = false;
  h.env.pendingAutoListen.current = false;
  h.env.listenRef.current();
  assert.equal(h.engines.length, 1);
  const source = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(source, /inFlight\.current = false;\s*if \(pendingAutoListen\.current\)/);
});
test('personal entries require no client, service or Google account', () => {
  const result = personalAppointmentForCalendar({ ...personalAppointmentSchema.parse(input), id: 21, userId: 3 });
  assert.equal(result.title, input.title);
  assert.equal(result.clientId, null);
  assert.equal(result.serviceId, null);
  assert.equal(result.importedFromGoogle, false);
});
test('personal titles and locations are trimmed and bounded', () => {
  const result = personalAppointmentSchema.parse({ ...input, title: '  Dentista  ', location: '  Via Roma  ' });
  assert.equal(result.title, 'Dentista');
  assert.equal(result.location, 'Via Roma');
  assert.equal(personalAppointmentSchema.safeParse({ ...input, title: 'x'.repeat(201) }).success, false);
  assert.equal(personalAppointmentSchema.safeParse({ ...input, notes: 'x'.repeat(5001) }).success, false);
});
test('personal voice entries need only title, day and start, with an automatic single slot', () => {
  const draft = { title: 'Dentista', date: '2026-10-28', startTime: '08:00' };
  const result = personalAppointmentSchema.parse(completePersonalAppointmentDraft(draft));
  assert.equal(result.endTime, '08:15');
  assert.equal(draft.startTime, '08:00');
  assert.equal('endTime' in draft, false, 'Never send the layout default back to the AI as a user-provided finish');
  assert.equal(completePersonalAppointmentDraft({ ...draft, startTime: '09:00' }).endTime, '09:15');
  assert.equal(completePersonalAppointmentDraft({ ...draft, durationMinutes: 60 }).endTime, '09:00');
  assert.equal(completePersonalAppointmentDraft({ ...draft, endTime: '10:00' }).endTime, '10:00');
  assert.equal(completePersonalAppointmentDraft({ ...draft, startTime: '23:50' }).endTime, '23:59');
  assert.equal(personalAppointmentSchema.safeParse(completePersonalAppointmentDraft({ ...draft, startTime: '23:50', durationMinutes: 60 })).success, false,
    'Do not silently shorten explicitly requested durations');
  const source = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  assert.doesNotMatch(source, /await say\(t\('personalAppointments\.askEnd'/);
});
test('personal entries reject empty titles, invalid dates and backwards or impossible times', () => {
  for (const invalid of [
    { title: '' }, { date: '2026-02-30' }, { startTime: '24:00' },
    { endTime: '10:15' }, { endTime: '09:00' },
  ]) {
    assert.equal(personalAppointmentSchema.safeParse({ ...input, ...invalid }).success, false);
  }
});
test('calendar personal IDs cannot collide with positive work appointment IDs', () => {
  const result = personalAppointmentForCalendar({ ...personalAppointmentSchema.parse(input), id: 21, userId: 3 });
  assert.equal(result.id, -21);
  assert.equal(result.personalAppointmentId, 21);
  assert.equal(result.isPersonalAppointment, true);
  assert.equal(result.importedFromGoogle, false);
  assert.equal(result.clientId, null);
  assert.equal(result.serviceId, null);
  assert.equal(result.service.duration, 30);
  assert.equal(result.service.price, 0);
  assert.equal(result.service.color, PERSONAL_APPOINTMENT_COLOR);
  assert.notEqual(PERSONAL_APPOINTMENT_BACKGROUND, '#f1f5f9');
});
test('personal persistence routes scope reads, updates and deletes to the signed-in owner', () => {
  const source = readFileSync('server/routes/personalAppointmentRoutes.ts', 'utf8');
  assert.equal((source.match(/eq\(personalAppointments\.userId, owner\(req\)\)/g) || []).length, 4);
  assert.match(source, /userId: owner\(req\)/);
  assert.match(source, /requireAuth/);
  assert.doesNotMatch(source, /googleapis|googleCalendar|sendMail|sendEmail|createClient|createService/);
});
test('one completed day-slot tap opens the form after pre-filling the time', () => {
  const source = readFileSync('client/src/components/DayViewWithTimeSlots.tsx', 'utf8');
  const handler = source.slice(source.indexOf('const handleSlotClick'), source.indexOf('// Gestisce la chiusura'));
  assert.match(handler, /touchMovedRef\.current/);
  assert.ok(handler.indexOf('setSelectedTime(slotTime)') < handler.indexOf('setIsAppointmentModalOpen(true)'));
  assert.doesNotMatch(handler, /secondTap/);
});
test('all supported languages include every personal-appointment label', () => {
  const languages = ['it','en','de','fr','es','nl','no','ro','ru','hi'];
  const keys = Object.keys(JSON.parse(readFileSync('client/src/locales/en.json', 'utf8')).personalAppointments).sort();
  for (const language of languages) {
    const values = JSON.parse(readFileSync(`client/src/locales/${language}.json`, 'utf8')).personalAppointments;
    assert.deepEqual(Object.keys(values).sort(), keys);
    assert.ok(Object.values(values).every(value => typeof value === 'string' && value.length > 0 && !value.includes('[TODO')));
  }
});
