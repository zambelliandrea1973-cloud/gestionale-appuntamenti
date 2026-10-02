import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assistantRecognitionErrorKey,
  createAssistantRecognitionSession,
  selectAssistantVoice
} from '../client/src/lib/assistantVoice';

class FakeRecognition {
  static latest: FakeRecognition;
  lang = '';
  continuous = true;
  interimResults = true;
  onstart: ((event?: any) => void) | null = null;
  onend: ((event?: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  startError: Error | null = null;
  abortCount = 0;
  constructor() { FakeRecognition.latest = this; }
  start() { if (this.startError) throw this.startError; this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() { this.abortCount++; this.onerror?.({ error: 'aborted' }); this.onend?.(); }
}

function makeSession() {
  const events: string[] = [];
  const session = createAssistantRecognitionSession(FakeRecognition, 'it-IT', {
    onStart: () => events.push('start'),
    onEnd: () => events.push('end'),
    onResult: text => events.push(`result:${text}`),
    onError: error => events.push(`error:${error}`)
  });
  return { session, recognition: FakeRecognition.latest, events };
}

test('prefers a named female voice in the active language over generic vendor voices', () => {
  const voices = [
    { name: 'Google italiano', lang: 'it-IT' },
    { name: 'Microsoft ElsaNeural - Italian (Italy)', lang: 'it-IT' },
    { name: 'Samantha', lang: 'en-US' }
  ];
  assert.equal(selectAssistantVoice(voices, 'it-IT'), voices[1]);
  assert.equal(selectAssistantVoice(voices, 'fr-FR'), null);
  assert.equal(selectAssistantVoice([], 'it-IT'), null);
});

test('supports updated voice lists, accented female names and Norwegian locale aliases', () => {
  assert.equal(selectAssistantVoice([{ name: 'Amélie', lang: 'fr-FR' }], 'fr-FR')?.name, 'Amélie');
  assert.equal(selectAssistantVoice([{ name: 'Google norsk', lang: 'no-NO' }], 'nb-NO')?.lang, 'no-NO');
});

test('distinguishes speech failures and ignores intentional cancellation', () => {
  assert.equal(assistantRecognitionErrorKey('aborted'), null);
  assert.equal(assistantRecognitionErrorKey('network'), 'listenNetworkError');
  assert.equal(assistantRecognitionErrorKey('no-speech'), 'listenNoSpeech');
  assert.equal(assistantRecognitionErrorKey('not-allowed'), 'listenPermissionError');
  assert.equal(assistantRecognitionErrorKey('service-not-allowed'), 'listenPermissionError');
  assert.equal(assistantRecognitionErrorKey('audio-capture'), 'listenCaptureError');
  assert.equal(assistantRecognitionErrorKey('language-not-supported'), 'listenLanguageError');
  assert.equal(assistantRecognitionErrorKey('unexpected'), 'listenError');
});

test('cancelled sessions cannot emit late errors, transcripts or end events', () => {
  const { session, recognition, events } = makeSession();
  session.start();
  const lateError = recognition.onerror!;
  const lateResult = recognition.onresult!;
  const lateEnd = recognition.onend!;
  session.cancel();
  lateError({ error: 'network' });
  lateResult({ results: [[{ transcript: 'create appointment' }]] });
  lateEnd();
  assert.deepEqual(events, ['start']);
  assert.equal(recognition.abortCount, 1);
});

test('final transcript releases the microphone before interpretation and is delivered once', () => {
  const { session, recognition, events } = makeSession();
  session.start();
  const result = recognition.onresult!;
  result({ resultIndex: 1, results: [[{ transcript: 'old' }], [{ transcript: '  nuova richiesta  ' }]] });
  result({ results: [[{ transcript: 'duplicate' }]] });
  assert.deepEqual(events, ['start', 'end', 'result:nuova richiesta']);
  assert.equal(recognition.lang, 'it-IT');
  assert.equal(recognition.continuous, false);
  assert.equal(recognition.interimResults, false);
});

test('network failure is reported exactly once, without an aborted error', () => {
  const { session, recognition, events } = makeSession();
  session.start();
  recognition.onerror!({ error: 'network' });
  assert.deepEqual(events, ['start', 'end', 'error:network']);
});

test('manual stop is not confused with no speech or a microphone failure', () => {
  const { session, events } = makeSession();
  session.start();
  session.stop();
  assert.deepEqual(events, ['start', 'end']);
});

test('a synchronous start failure is caught and leaves no active session', () => {
  const { session, recognition, events } = makeSession();
  recognition.startError = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
  session.start();
  assert.deepEqual(events, ['end', 'error:NotAllowedError']);
});

test('ending with no result exposes no-speech, without retrying automatically', () => {
  const { session, recognition, events } = makeSession();
  session.start();
  recognition.onend!();
  assert.deepEqual(events, ['start', 'end', 'error:no-speech']);
});