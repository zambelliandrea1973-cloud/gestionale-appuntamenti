import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { completePersonalAppointmentDraft, personalAppointmentSchema } from '../shared/personalAppointments';
import { detectAssistantConfirmation } from '../client/src/lib/appointmentAssistant';
import { encodeLivePCM, decodeLivePCM, startLiveAppointmentSession } from '../client/src/lib/liveAppointmentSession';
import { liveAppointmentSetup, liveInterpretationSchema } from '../shared/liveAppointmentProtocol';

test('Live config uses the native audio model, blocking application tools, transcription and no unsupported thinking settings', () => {
  const { setup } = liveAppointmentSetup('personal', 'it-IT');
  assert.equal(setup.model, 'models/gemini-3.8-live');
  assert.deepEqual(setup.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(setup.tools[0].functionDeclarations[0].behavior, 'BLOCKING');
  assert.equal('thinkingConfig' in setup, false);
  assert.equal('proactiveAudio' in setup, false);
  assert.match(setup.systemInstruction.parts[0].text, /15 minuti/);
  assert.equal('confirmation' in setup.tools[0].functionDeclarations[0].parameters.properties, false);
});
test('Live extraction cannot provide approval, customer IDs, or arbitrary fields', () => {
  assert.equal(liveInterpretationSchema.safeParse({ title: 'Dentista', startTime: '09:00' }).success, true);
  for (const value of [{ confirmation: 'yes' }, { clientId: 1 }, { date: 'tomorrow' }, { startTime: '24:00' }, { durationMinutes: -5 }]) {
    assert.equal(liveInterpretationSchema.safeParse(value).success, false);
  }
});
test('PCM captures normalize sample rate and decode 24kHz provider frames without browser TTS', () => {
  const encoded = encodeLivePCM(new Float32Array([-1,-1,-1,1,1,1,0,0,0]), 48000);
  const output = decodeLivePCM(encoded);
  assert.equal(output.length, 3);
  assert.equal(output[0], -1);
  assert.ok(output[1] > 0.99);
  assert.equal(output[2], 0);
  assert.throws(() => decodeLivePCM(btoa('x')));
});

test('Personal explicit approval keeps the actual submit callback pending until the save finishes', async () => {
  const source = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  const ast = ts.createSourceFile('personal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler = '';
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'submit') handler = node.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(handler);
  const draft = { title: 'Dentista', date: '2026-10-28', startTime: '09:00', location: '', notes: '' };
  let finish!: () => void, started = false, settled = false, closed = false;
  const pendingSave = new Promise<void>(resolve => { finish = resolve; });
  const messages: string[] = [];
  const errors: string[] = [];
  const env = {
    open: true, blocked: false, inFlight: { current: false },
    liveSession: { current: { ready: () => true } }, liveFields: { current: {} },
    pendingAutoListen: { current: false }, cancelRecognition() {}, stopAudio() {},
    generation: { current: 1 }, setInput() {}, setError(text: string) { if (text) errors.push(text); },
    setProcessing() {}, setMessages() {}, setDraft() {},
    conversation: { current: { ensure: async () => null } }, setConversationActive() {},
    queryClient: { invalidateQueries() {} }, AI_TRIAL_ACCESS_KEY: ['synthetic'],
    draft, ready: personalAppointmentSchema.safeParse(completePersonalAppointmentDraft(draft)), locale: 'it',
    completePersonalAppointmentDraft, personalAppointmentSchema, detectAssistantConfirmation,
    say: async (text: string) => { messages.push(text); }, t: (key: string) => key, aiTrialMessageKey: () => null,
    setTrialBlocked() {}, listenRef: { current() {} },
    save: { isPending: false, mutateAsync: async (value: any) => {
      assert.equal(value.endTime, '09:15');
      started = true; await pendingSave; closed = true;
    } },
  };
  const code = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const submit = new Function('env', `const {${Object.keys(env).join(',')}}=env;${code};return submit;`)(env);
  const result = submit('sì').then(() => { settled = true; });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(started, true);
  assert.equal(settled, false, 'No generic Live fallback before the persistence result');
  finish();
  await result;
  assert.equal(closed, true);
  assert.deepEqual(messages, []);
  assert.deepEqual(errors, []);
});

test('real-time transport greets before capturing, returns tools on the same connection and stops all resources on close', async t => {
  const sockets: any[] = [], sources: any[] = [], errors: string[] = [], turns: any[] = [];
  let stopped = 0, listening = false, micNode: any;
  let finishSave!: () => void;
  const pendingSave = new Promise<void>(resolve => { finishSave = resolve; });
  class Socket {
    static OPEN = 1;
    readyState = 1; bufferedAmount = 0;
    onopen: any; onmessage: any; onclose: any; onerror: any;
    sent: any[] = [];
    constructor() { sockets.push(this); queueMicrotask(() => this.onopen?.()); }
    send(value: string) { this.sent.push(JSON.parse(value)); }
    close() { this.readyState = 3; }
    emit(value: object) { this.onmessage?.({ data: JSON.stringify(value) }); }
  }
  class Context {
    sampleRate = 48000; currentTime = 0; state = 'running'; destination = {};
    async resume() {}
    async close() {}
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createScriptProcessor() { micNode = { onaudioprocess: null, connect() {}, disconnect() {} }; return micNode; }
    // Some browser engines never settle this promise: opening must still work.
    audioWorklet = { addModule: () => new Promise<void>(() => {}) };
    createBuffer(_channels: number, length: number, rate: number) { return { duration: length / rate, copyToChannel() {} }; }
    createBufferSource() {
      const source = { buffer: null, onended: null as any, connect() {}, disconnect() {}, start() {}, stop() {} };
      sources.push(source); return source;
    }
  }
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const set = (key: string, value: unknown) => {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  };
  set('window', { AudioContext: Context, location: { href: 'http://localhost/calendar' }, navigator: {}, matchMedia: () => ({ matches: false }) });
  set('document', { hidden: false, referrer: '', addEventListener() {}, removeEventListener() {} });
  const track = { stop() { stopped++; }, addEventListener() {} };
  set('navigator', { userAgent: 'unit-test', mediaDevices: { getUserMedia: async () => ({ getTracks: () => [track], getAudioTracks: () => [track] }) } });
  set('WebSocket', Socket);
  set('AudioWorkletNode', class {});
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ticket: 'unit-capability', path: '/api/ai-appointment-assistant/live' }));
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as any)[key];
    }
  });
  let session: ReturnType<typeof startLiveAppointmentSession>;
  session = startLiveAppointmentSession({
    mode: 'personal', language: 'it-IT', greeting: 'Ciao. Dimmi pure.',
    onListening: value => { listening = value; }, onTranscript() {}, onActive() {},
    onError: code => errors.push(code),
    onTurn: async (text, fields) => {
      turns.push({ text, fields });
      if (text === 'sì') { await pendingSave; session.close(); }
      else session.respond('Confermi?');
    },
  });
  t.after(() => session.close());
  for (let i = 0; i < 15 && !sockets.length; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(sockets.length, 1);
  const socket = sockets[0];
  socket.emit({ type: 'ready' });
  const samples = new Float32Array(4096).fill(0.3);
  const capture = () => micNode.onaudioprocess({ inputBuffer: { getChannelData: () => samples } });
  capture();
  assert.equal(socket.sent.filter((message: any) => message.type === 'audio').length, 0, 'No capture of the opening greeting');
  socket.emit({ type: 'audio', data: btoa('\0\0\0\0') });
  socket.emit({ type: 'turnComplete' });
  assert.equal(listening, false);
  sources[0].onended();
  assert.equal(listening, true);
  capture(); capture();
  assert.ok(socket.sent.some((message: any) => message.type === 'audio'));
  socket.emit({ type: 'turn', id: 'turn-1', text: 'sì, alle nove', interpretation: { startTime: '09:00' } });
  await Promise.resolve();
  assert.deepEqual(turns, [{ text: 'sì, alle nove', fields: { startTime: '09:00' } }]);
  assert.deepEqual(socket.sent.find((message: any) => message.type === 'reply'), { type: 'reply', id: 'turn-1', text: 'Confermi?' });
  session.setMuted(true);
  assert.equal(listening, false);
  const count = socket.sent.length;
  capture();
  assert.equal(socket.sent.length, count);
  session.setMuted(false);
  socket.emit({ type: 'audio', data: btoa('\0\0') });
  const lateEnd = sources[1].onended;
  socket.emit({ type: 'turn', id: 'confirmed', text: 'sì', interpretation: {} });
  await Promise.resolve();
  assert.equal(socket.sent.filter((message: any) => message.type === 'reply' && message.id === 'confirmed').length, 0);
  finishSave();
  await Promise.resolve(); await Promise.resolve();
  lateEnd();
  assert.equal(listening, false);
  assert.equal(stopped, 1);
  assert.equal(socket.readyState, 3);
  assert.deepEqual(errors, []);
});