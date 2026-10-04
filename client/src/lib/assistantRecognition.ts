type Timer = unknown;

/** Merge browser fragments without repeating cumulative prefixes or overlaps. */
export function mergeRecognitionTranscript(left: string, right: string): string {
  const a = left.trim().split(/\s+/).filter(Boolean);
  const b = right.trim().split(/\s+/).filter(Boolean);
  const key = (word: string) => word.normalize('NFKC').toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
  if (!a.length) return b.join(' ');
  if (!b.length) return a.join(' ');
  if (b.length >= a.length && a.every((word, index) => key(word) === key(b[index]))) {
    return b.join(' ');
  }
  if (a.length >= b.length && b.every((word, index) => key(word) === key(a[index]))) {
    return a.join(' ');
  }
  for (let overlap = Math.min(a.length, b.length); overlap > 0; overlap--) {
    if (b.slice(0, overlap).every((word, index) => key(word) === key(a[a.length - overlap + index]))) {
      return [...a, ...b.slice(overlap)].join(' ');
    }
  }
  return [...a, ...b].join(' ');
}
export interface AssistantRecognitionSession {
  active: () => boolean;
  finish: () => void;
  cancel: () => void;
  stop: () => void;
}

interface RecognitionOptions {
  Recognition: new () => any;
  language: string;
  onListening: (value: boolean) => void;
  onTranscript: (text: string) => void;
  onComplete: (text: string) => void;
  onError: (reason: string) => void;
  silenceMs?: number;
  setTimer?: (callback: () => void, delay: number) => Timer;
  clearTimer?: (timer: Timer) => void;
}

/** One spoken turn, possibly spanning multiple Android recognition runs. */
export function createAssistantRecognition(options: RecognitionOptions): AssistantRecognitionSession {
  const schedule = options.setTimer ?? ((callback, delay) => globalThis.setTimeout(callback, delay));
  const clear = options.clearTimer ?? (timer => globalThis.clearTimeout(timer as ReturnType<typeof setTimeout>));
  let engine: any = null;
  let closed = false;
  let previous = '';
  let current = '';
  let quietTimer: Timer = null;
  let restartTimer: Timer = null;
  let startTimer: Timer = null;
  let restarts = 0;
  const text = () => mergeRecognitionTranscript(previous, current);
  const clearTimers = () => {
    for (const timer of [quietTimer, restartTimer, startTimer]) if (timer !== null) clear(timer);
    quietTimer = restartTimer = startTimer = null;
  };
  const detach = () => {
    if (!engine) return;
    engine.onstart = engine.onend = engine.onerror = engine.onresult = null;
    engine.onspeechstart = engine.onspeechend = null;
    try { engine.abort(); } catch { /* The browser may already have ended it. */ }
    engine = null;
  };
  const cancel = () => {
    if (closed) return;
    closed = true;
    clearTimers();
    detach();
    options.onListening(false);
  };
  const finish = () => {
    if (closed) return;
    const transcript = text();
    cancel();
    if (transcript) options.onComplete(transcript);
  };
  const fail = (reason: string) => {
    if (closed) return;
    cancel();
    options.onError(reason);
  };
  const waitForSilence = () => {
    if (quietTimer !== null) clear(quietTimer);
    quietTimer = schedule(finish, options.silenceMs ?? 3000);
  };
  const start = () => {
    if (closed) return;
    try {
      const next = new options.Recognition();
      engine = next;
      const valid = () => !closed && engine === next;
      next.lang = options.language;
      next.continuous = true;
      next.interimResults = true;
      next.onstart = () => {
        if (!valid()) return;
        if (startTimer !== null) clear(startTimer);
        startTimer = null;
        options.onListening(true);
      };
      next.onspeechstart = () => {
        if (!valid()) return;
        if (quietTimer !== null) clear(quietTimer);
        quietTimer = null;
      };
      next.onspeechend = () => { if (valid() && text()) waitForSilence(); };
      next.onresult = (event: any) => {
        if (!valid()) return;
        const before = text();
        const fragments: string[] = [];
        // Results are cumulative within one run. Rebuild, rather than append
        // the same index again when an interim result becomes final.
        for (let index = 0; index < event.results.length; index++) {
          const fragment = event.results[index]?.[0]?.transcript?.trim();
          if (fragment) fragments.push(fragment);
        }
        current = fragments.reduce(mergeRecognitionTranscript, '');
        const transcript = text();
        if (transcript) {
          if (transcript !== before) options.onTranscript(transcript);
          if (transcript !== before || quietTimer === null) waitForSilence();
        }
      };
      next.onend = () => {
        if (!valid()) return;
        if (startTimer !== null) clear(startTimer);
        startTimer = null;
        previous = text();
        current = '';
        engine = null;
        if (!previous) { fail('no-speech'); return; }
        if (quietTimer === null) waitForSilence();
        // Android may end after a short pause despite continuous=true.
        // Continue the same turn while waiting for the full silence interval.
        if (restarts++ < 3) restartTimer = schedule(start, 200);
      };
      next.onerror = (event: { error?: string }) => {
        if (!valid()) return;
        if (event.error === 'no-speech' && text()) {
          if (quietTimer === null) waitForSilence();
          return;
        }
        fail(event.error || 'recognition-error');
      };
      startTimer = schedule(() => { if (valid()) fail('start-timeout'); }, 7000);
      next.start();
    } catch { fail('start-failed'); }
  };
  start();
  return { active: () => !closed, finish, cancel, stop: cancel };
}