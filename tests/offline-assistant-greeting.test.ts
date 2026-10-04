import assert from 'node:assert/strict';
import test from 'node:test';
import { getCachedAssistantGreeting, prepareAssistantGreeting, speakOfflineAssistantGreeting } from '../client/src/lib/offlineAssistantGreeting';

function harness(voices: any[], extra: Record<string, unknown> = {}) {
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const spoken: any[] = [];
  let completed = 0, cancelled = 0, id = 0;
  class Utterance { constructor(public text: string) {} }
  const synthesis: any = {
    getVoices: () => voices, speak: (message: any) => spoken.push(message),
    cancel: () => { cancelled++; }, addEventListener() {}, removeEventListener() {},
  };
  const session = speakOfflineAssistantGreeting({
    text: 'Ciao Voice. Dimmi pure.', language: 'it-IT', synthesis, Utterance: Utterance as any,
    onComplete: () => { completed++; },
    setTimer: (callback, delay) => { timers.set(++id, { callback, delay }); return id; },
    clearTimer: timer => { timers.delete(timer as number); },
    ...extra,
  });
  return {
    session, spoken, timers, completed: () => completed, cancelled: () => cancelled,
    fire: (delay: number) => {
      for (const [key, timer] of [...timers]) if (timer.delay === delay && timers.delete(key)) timer.callback();
    },
  };
}
const localVoice = { name: 'Alice', lang: 'it-IT', localService: true };

test('greeting uses an installed local female voice and starts listening only after speech ends', () => {
  const h = harness([{ name: 'Remote female', lang: 'it-IT', localService: false },
    { name: 'Mario', lang: 'it-IT', localService: true }, localVoice]);
  assert.equal(h.spoken.length, 1);
  assert.equal(h.spoken[0].voice, localVoice);
  assert.equal(h.completed(), 0);
  h.spoken[0].onstart();
  h.spoken[0].onend();
  assert.equal(h.completed(), 1);
  assert.equal(h.timers.size, 0);
});

test('remote-only or missing voices fall back to the written greeting in 600ms', () => {
  const h = harness([{ name: 'Cloud', lang: 'it-IT', localService: false }]);
  assert.equal(h.spoken.length, 0);
  h.fire(600);
  assert.equal(h.completed(), 1);
  assert.equal(h.timers.size, 0);
});

test('stalled local voice releases the microphone after 800ms and cannot complete twice', () => {
  const h = harness([localVoice]);
  const lateEnd = h.spoken[0].onend;
  h.fire(800);
  assert.equal(h.completed(), 1);
  assert.equal(h.cancelled(), 1);
  lateEnd();
  assert.equal(h.completed(), 1);
});

test('closing during the greeting cancels speech and ignores all late events', () => {
  const h = harness([localVoice]);
  const lateEnd = h.spoken[0].onend, lateStart = h.spoken[0].onstart;
  h.session.cancel();
  lateStart(); lateEnd();
  h.fire(800);
  assert.equal(h.completed(), 0);
  assert.equal(h.timers.size, 0);
});

test('a started local voice with a missing end event also has a bounded recovery', () => {
  const h = harness([localVoice]);
  h.spoken[0].onstart();
  for (const timer of [...h.timers.values()]) timer.callback();
  assert.equal(h.completed(), 1);
  assert.equal(h.timers.size, 0);
});

test('prepared greetings are shared once and remain separated by identity and language', async () => {
  let requests = 0;
  const blob = new Blob(['prepared welcome']);
  const loader = async () => { requests++; return blob; };
  await Promise.all([
    prepareAssistantGreeting('unit-account-it', loader),
    prepareAssistantGreeting('unit-account-it', loader),
  ]);
  assert.equal(requests, 1);
  assert.equal(getCachedAssistantGreeting('unit-account-it'), blob);
  assert.equal(getCachedAssistantGreeting('unit-another-account-it'), undefined);
  assert.equal(getCachedAssistantGreeting('unit-account-en'), undefined);
});

test('cached greeting plays immediately without waiting for device voices or a network request', async () => {
  const players: any[] = [];
  class Audio {
    onended: any; onerror: any;
    constructor() { players.push(this); }
    async play() {}
    pause() {}
  }
  const h = harness([], { audioBlob: new Blob(['cached audio']), Audio });
  assert.equal(players.length, 1);
  assert.equal(h.spoken.length, 0);
  assert.equal(h.completed(), 0);
  await Promise.resolve();
  players[0].onended();
  assert.equal(h.completed(), 1);
  assert.equal(h.timers.size, 0);
});

test('blocked cached playback falls back to the local voice instead of delaying indefinitely', async () => {
  class Audio {
    onended: any; onerror: any;
    async play() { throw new Error('autoplay blocked'); }
    pause() {}
  }
  const h = harness([localVoice], { audioBlob: new Blob(['cached audio']), Audio });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.spoken.length, 1);
  h.spoken[0].onend();
  assert.equal(h.completed(), 1);
  assert.equal(h.timers.size, 0);
});