import { apiRequest } from './queryClient';

interface GreetingOptions { mode: 'work' | 'personal'; language: string; greeting: string }
type Entry = { frames: string[]; expires: number; preparing: boolean };
const greetings = new Map<string, Entry>();
const keyFor = ({ language, greeting }: GreetingOptions) => JSON.stringify([language, greeting]);
const ttl = 10 * 60_000;

export function getPreparedLiveGreeting(options: GreetingOptions): string[] | null {
  const entry = greetings.get(keyFor(options));
  return entry && !entry.preparing && entry.expires > Date.now() && entry.frames.length ? entry.frames.slice() : null;
}
export function storeLiveGreeting(options: GreetingOptions, frames: string[]) {
  if (!frames.length || frames.reduce((size, frame) => size + frame.length, 0) > 1024 * 1024) return;
  greetings.set(keyFor(options), { frames: frames.slice(), preparing: false, expires: Date.now() + ttl });
  while (greetings.size > 4) greetings.delete(Array.from(greetings.keys())[0]);
}

/** Prepare only Gemini's exact greeting. No microphone, playback, trial reservation or persisted audio. */
export function prepareLiveGreeting(options: GreetingOptions) {
  const key = keyFor(options), existing = greetings.get(key);
  if (existing && existing.expires > Date.now()) return;
  const entry: Entry = { frames: [], expires: Date.now() + 15_000, preparing: true };
  greetings.set(key, entry);
  while (greetings.size > 4) greetings.delete(Array.from(greetings.keys())[0]);
  const abort = new AbortController();
  let socket: WebSocket | null = null, size = 0, done = false;
  const finish = (success = false) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    abort.abort();
    if (socket) { socket.onmessage = socket.onclose = socket.onerror = socket.onopen = null; socket.close(); }
    if (greetings.get(key) !== entry) return;
    if (success && entry.frames.length) {
      entry.preparing = false; entry.expires = Date.now() + ttl;
    } else greetings.delete(key);
  };
  const timer = setTimeout(() => finish(), 15_000);
  void (async () => {
    try {
      const response = await apiRequest('POST', '/api/ai-appointment-assistant/live-session', {
        ...options, greetingOnly: true,
      }, { signal: abort.signal });
      const result = await response.json();
      if (done) return;
      const url = new URL(result.path, window.location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(url);
      socket.onopen = () => {
        if (!done) socket!.send(JSON.stringify({ type: 'start', ticket: result.ticket }));
      };
      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'audio' && typeof message.data === 'string') {
            size += message.data.length;
            if (size > 1024 * 1024) { finish(); return; }
            entry.frames.push(message.data);
          }
          if (message.type === 'turnComplete') finish(true);
          if (message.type === 'error') finish();
        } catch { finish(); }
      };
      socket.onclose = socket.onerror = () => finish();
    } catch { finish(); }
  })();
}