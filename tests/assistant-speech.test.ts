import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { ApiRequestError } from '../client/src/lib/apiError';

function runService(code: string, dedicatedKey = true) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { mock } from 'node:test';
    import { synthesizeAssistantSpeechStream, assistantSpeechConfig } from './server/services/assistantSpeechService.ts';
    const wav = Buffer.alloc(48);
    wav.write('RIFF'); wav.writeUInt32LE(40, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(4, 40);
    const payload = data => ({ candidates: [{ content: { parts: [{
      inlineData: { mimeType: 'audio/wav', data: data.toString('base64') }
    }] } }] });
    ${code}
  `], {
    cwd: process.cwd(), encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      ...(dedicatedKey ? { GEMINI_APPOINTMENTS_API_KEY: 'unit-test-dedicated-key' } : {})
    }
  });
  assert.equal(result.status, 0, result.stderr);
}

test('Gemini speech uses only the dedicated credential, exact text, documented WAV contract, and cache', () => {
  runService(`
    let calls = 0;
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls++;
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['x-goog-api-key'], process.env.GEMINI_APPOINTMENTS_API_KEY);
      const body = JSON.parse(options.body);
      assert.equal(body.contents[0].parts[0].text, 'Appuntamento confermato.');
      assert.match(body.contents[0].parts[0].speech_metadata.style, /it-IT/);
      assert.deepEqual(body.generationConfig.responseModalities, ['AUDIO']);
      assert.equal(body.generationConfig.speechConfig.voiceConfig.voice, 'Aoede');
      assert.equal(body.generationConfig.responseFormat.audio.mimeType, 'AUDIO_WAV');
      return new Response(JSON.stringify(payload(wav)), { headers: { 'Content-Type': 'application/json' } });
    });
    for (const cached of [false, true]) {
      const audio = await synthesizeAssistantSpeechStream('Appuntamento confermato.', 'it-IT');
      assert.equal(audio.contentType, 'audio/wav');
      assert.equal(audio.contentLength, wav.length);
      assert.equal(audio.cached, cached);
      const chunks = [];
      for await (const chunk of audio.stream) chunks.push(chunk);
      assert.deepEqual(Buffer.concat(chunks), wav);
    }
    assert.equal(calls, 1);
    assert.equal(process.env.GEMINI_API_KEY, undefined);
    assert.equal(process.env.OPENAI_API_KEY, undefined);
  `);
});

test('Gemini speech rejects missing credentials without using legacy Gemini or OpenAI', () => {
  runService(`
    mock.method(globalThis, 'fetch', () => assert.fail('No provider should be called'));
    await assert.rejects(synthesizeAssistantSpeechStream('Ciao', 'it-IT'), /GEMINI_APPOINTMENTS_API_KEY/);
  `, false);
});

test('Gemini speech fails safely on provider errors and does not cache failed generations', () => {
  runService(`
    let calls = 0;
    mock.method(globalThis, 'fetch', async () => {
      calls++;
      return new Response('Sensitive upstream error must never be returned', { status: 429 });
    });
    for (let i = 0; i < 2; i++) {
      await assert.rejects(synthesizeAssistantSpeechStream('Ciao', 'it-IT'), {
        message: 'Gemini speech request failed (HTTP 429)'
      });
    }
    assert.equal(calls, 2);
  `);
});

test('Gemini speech rejects empty, invalid, or mismatched audio instead of playing it', () => {
  runService(`
    for (const body of [{}, payload(Buffer.from('not wave audio')), {
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/l16', data: wav.toString('base64') } }] } }]
    }]) {
      mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body)));
      await assert.rejects(synthesizeAssistantSpeechStream('Ciao', 'it-IT'), /Gemini speech returned/);
    }
  `);
});

test('Gemini speech respects cancellation and limits upstream waiting', () => {
  runService(`
    const cancelled = new AbortController();
    cancelled.abort();
    mock.method(globalThis, 'fetch', () => assert.fail('Cancelled request must not reach Gemini'));
    await assert.rejects(synthesizeAssistantSpeechStream('Ciao', 'it-IT', cancelled.signal), { name: 'AbortError' });
    mock.method(globalThis, 'setTimeout', callback => {
      queueMicrotask(callback);
      return 0;
    });
    mock.method(globalThis, 'fetch', async (_url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')), { once: true });
    }));
    await assert.rejects(synthesizeAssistantSpeechStream('Ciao', 'it-IT'), { name: 'AbortError' });
  `);
});

function createSpeechHarness(fetchResponse: () => Promise<Response>, rejectPlayback = false, activeConversation = true) {
  const source = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  const start = source.indexOf('  const speak =');
  const end = source.indexOf('  const addAssistantMessage =', start);
  const compiled = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const utterances: any[] = [];
  const audioInstances: any[] = [];
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let timerId = 0;
  let streams = 0;
  const ref = () => ({ current: null as any });
  const sequence = { current: 0 };
  const request = ref();
  const audio = ref();
  const audioUrl = ref();
  const utterance = ref();
  const win = {
    setTimeout(callback: () => void, delay: number) {
      const id = ++timerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id: number) { timers.delete(id); },
    speechSynthesis: {
      getVoices: () => [{ name: 'Alice local', lang: 'it-IT', localService: true }],
      cancel() {},
      speak(value: any) { utterances.push(value); }
    },
    MediaSource: class {}
  };
  class Audio {
    onended: any; onerror: any;
    constructor(public src: string) { audioInstances.push(this); }
    async play() { if (rejectPlayback) throw new Error('Playback unavailable'); }
    pause() {}
  }
  class MediaSource {
    static isTypeSupported() { return true; }
    constructor() { streams++; }
  }
  const stopSpeech = () => {
    sequence.current++;
    request.current?.abort();
  };
  const speak = new Function('window', 'SpeechSynthesisUtterance', 'Audio', 'MediaSource',
    'URL', 'fetch', 'stopSpeech', 'speechSequenceRef', 'speechRequestRef', 'speechAudioRef',
    'speechAudioUrlRef', 'speechUtteranceRef', 'speechLocale',
    'aiBlockedRef', 'trialConversationRef', 'trialAccess', 'handleTrialFailure', 'ApiRequestError',
    `${compiled}; return speak;`)(
    win, class { constructor(public text: string) {} }, Audio, MediaSource,
    { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    fetchResponse, stopSpeech, sequence, request, audio, audioUrl, utterance, 'it-IT',
    { current: false }, { current: { isActive: () => activeConversation, getId: () => 'test-conversation-token' } },
    { unlimited: false }, () => null, ApiRequestError
  );
  return { speak, utterances, audioInstances, timers, stopSpeech, streams: () => streams };
}

test('Gemini WAV uses buffered audio even when the browser supports MP3 streaming, then resumes listening once', async () => {
  const h = createSpeechHarness(async () => new Response('test audio', { headers: { 'Content-Type': 'audio/wav' } }));
  let completions = 0;
  await h.speak('Ciao', () => completions++);
  assert.equal(h.streams(), 0);
  assert.equal(h.audioInstances.length, 1);
  assert.equal(h.utterances.length, 0);
  assert.equal(h.timers.size, 0);
  h.audioInstances[0].onended();
  h.audioInstances[0].onended();
  assert.equal(completions, 1);
});

test('connection and provider failures automatically speak the same text with the device voice once', async () => {
  for (const response of [
    async () => { throw new TypeError('Network unavailable'); },
    async () => new Response('', { status: 503 })
  ]) {
    const h = createSpeechHarness(response);
    let completions = 0;
    await h.speak('Appuntamento confermato.', () => completions++);
    assert.equal(h.utterances.length, 1);
    assert.equal(h.utterances[0].text, 'Appuntamento confermato.');
    assert.equal(h.utterances[0].lang, 'it-IT');
    h.utterances[0].onend();
    h.utterances[0].onerror();
    assert.equal(completions, 1);
    assert.equal(h.timers.size, 0);
  }
});

test('opening a trial assistant or speaking its greeting does not spend Gemini audio or a conversation', async () => {
  const h = createSpeechHarness(async () => { assert.fail('No paid audio before the first user message'); }, false, false);
  await h.speak('Come posso aiutarti?');
  assert.equal(h.utterances.length, 1);
  assert.equal(h.audioInstances.length, 0);
  assert.equal(h.timers.size, 0);
});

test('playback rejection and stalled connections use device speech; cancelling does not restart it', async () => {
  const rejected = createSpeechHarness(async () => new Response('test', { headers: { 'Content-Type': 'audio/wav' } }), true);
  await rejected.speak('Ciao');
  assert.equal(rejected.utterances.length, 1);
  const stalled = createSpeechHarness(() => new Promise(() => {}));
  void stalled.speak('Ciao');
  const timeout = [...stalled.timers.values()].find(timer => timer.delay === 22_000);
  assert.ok(timeout);
  timeout.callback();
  await Promise.resolve();
  assert.equal(stalled.utterances.length, 1);
  const cancelled = createSpeechHarness(() => new Promise(() => {}));
  void cancelled.speak('Ciao');
  cancelled.stopSpeech();
  assert.equal(cancelled.timers.size, 0);
  await Promise.resolve();
  assert.equal(cancelled.utterances.length, 0);
});