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

test('Brave cumulative results repeat prefixes but submit the professional phrase only once', () => {
  const h = harness();
  const emit = (...parts: string[]) => h.engines[0].onresult(h.results(...parts));
  emit('Crea');
  emit('Crea', 'Crea un appuntamento per Silvia', 'Crea un appuntamento per Silvia Busnari');
  emit('Crea', 'Crea un appuntamento per Silvia', 'Crea un appuntamento per Silvia Busnari',
    'Crea un appuntamento per Silvia Busnari per il dentista',
    'Crea un appuntamento per Silvia Busnari per il dentista alle 8:00');
  assert.deepEqual(h.submissions, []);
  assert.equal(h.previews.at(-1), 'Crea un appuntamento per Silvia Busnari per il dentista alle 8:00');
  h.fire(3000);
  assert.deepEqual(h.submissions, ['Crea un appuntamento per Silvia Busnari per il dentista alle 8:00']);
});

test('Brave repeated and extending date results do not produce per per il per il', () => {
  const h = harness();
  h.engines[0].onresult(h.results('per', 'per il', 'per il', 'per il 28', 'per il 28 ottobre', 'per il 28 ottobre'));
  h.fire(3000);
  assert.deepEqual(h.submissions, ['per il 28 ottobre']);
});

test('cumulative replay after native restart and overlapping fragments do not duplicate the turn', () => {
  const h = harness();
  h.engines[0].onresult(h.results('Dentista il 28 ottobre'));
  h.engines[0].onend();
  h.fire(200);
  h.engines[1].onresult(h.results('Dentista'));
  assert.equal(h.previews.at(-1), 'Dentista il 28 ottobre');
  h.engines[1].onresult(h.results('Dentista il 28 ottobre alle otto'));
  h.engines[1].onend();
  h.fire(200);
  h.engines[2].onresult(h.results('alle otto per un’ora'));
  h.fire(3000);
  assert.deepEqual(h.submissions, ['Dentista il 28 ottobre alle otto per un’ora']);
});

test('intentional repetitions inside a phrase are preserved, not globally deduplicated', () => {
  const h = harness();
  h.engines[0].onresult(h.results('no no, voglio un altro giorno'));
  h.fire(3000);
  assert.deepEqual(h.submissions, ['no no, voglio un altro giorno']);
});

test('duplicate native results do not keep postponing the end of a silent turn', () => {
  const h = harness();
  h.engines[0].onresult(h.results('Dentista alle otto'));
  const quietTimer = [...h.timers.keys()];
  h.engines[0].onresult(h.results('Dentista alle otto', 'Dentista alle otto'));
  assert.deepEqual([...h.timers.keys()], quietTimer);
  assert.deepEqual(h.previews, ['Dentista alle otto']);
  h.fire(3000);
  assert.deepEqual(h.submissions, ['Dentista alle otto']);
});