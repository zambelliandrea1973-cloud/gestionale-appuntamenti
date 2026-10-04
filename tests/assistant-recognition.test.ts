import assert from 'node:assert/strict';
import test from 'node:test';
import { createAssistantRecognition } from '../client/src/lib/assistantRecognition';

function harness() {
  const engines: any[] = [];
  const timers = new Map<number, { run: () => void; delay: number }>();
  const submissions: string[] = [];
  const previews: string[] = [];
  const errors: string[] = [];
  let id = 0;
  class Recognition {
    onstart: any; onend: any; onresult: any; onerror: any; onspeechstart: any;
    constructor() { engines.push(this); }
    start() { this.onstart?.(); }
    abort() {}
  }
  const session = createAssistantRecognition({
    Recognition, language: 'it-IT',
    onListening() {}, onTranscript: text => previews.push(text),
    onComplete: text => submissions.push(text), onError: error => errors.push(error),
    setTimer: (run, delay) => { timers.set(++id, { run, delay }); return id; },
    clearTimer: timer => { timers.delete(timer as number); },
  });
  const fire = (delay: number) => {
    for (const [key, timer] of [...timers]) if (timer.delay === delay && timers.delete(key)) timer.run();
  };
  const results = (...texts: string[]) => ({ results: texts.map(transcript => [{ transcript }]) });
  return { engines, session, submissions, previews, errors, fire, results, timers };
}

test('dictation submits the full phrase once, not the first final fragment', () => {
  const h = harness();
  h.engines[0].onresult(h.results('crea'));
  assert.deepEqual(h.submissions, []);
  h.engines[0].onspeechstart();
  h.engines[0].onresult(h.results('crea', 'per Silvia', 'il ventitré ottobre alle quindici'));
  assert.deepEqual(h.submissions, []);
  h.fire(3000);
  assert.deepEqual(h.submissions, ['crea per Silvia il ventitré ottobre alle quindici']);
  assert.equal(h.session.active(), false);
});

test('Android restart retains the previous fragment and ignores cumulative interim duplicates', () => {
  const h = harness();
  h.engines[0].onresult(h.results('dentista domani'));
  h.engines[0].onend();
  h.fire(200);
  const next = h.engines[1];
  next.onresult(h.results('alle quindici'));
  next.onresult(h.results('alle quindici', 'per un’ora'));
  h.fire(3000);
  assert.deepEqual(h.submissions, ['dentista domani alle quindici per un’ora']);
});

test('manual finish includes the latest transcript and cancellation never sends a partial turn', () => {
  const h = harness();
  h.engines[0].onresult(h.results('prima parte', 'seconda parte'));
  h.session.finish();
  h.fire(3000);
  assert.deepEqual(h.submissions, ['prima parte seconda parte']);
  const cancelled = harness();
  const stale = cancelled.engines[0].onresult;
  cancelled.engines[0].onresult(cancelled.results('non inviare'));
  cancelled.session.cancel();
  stale(cancelled.results('anche questa frase è vecchia'));
  cancelled.fire(3000);
  assert.deepEqual(cancelled.submissions, []);
  assert.equal(cancelled.timers.size, 0);
});

test('recognition permission failure is surfaced without submitting incomplete data', () => {
  const h = harness();
  h.engines[0].onerror({ error: 'not-allowed' });
  h.fire(3000);
  assert.deepEqual(h.errors, ['not-allowed']);
  assert.deepEqual(h.submissions, []);
  assert.equal(h.session.active(), false);
});