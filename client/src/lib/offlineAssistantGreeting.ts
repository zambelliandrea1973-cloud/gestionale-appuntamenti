type Timer = unknown;
const preparedGreetings = new Map<string, { audio?: Blob; pending?: Promise<void> }>();
export function getCachedAssistantGreeting(key: string) {
  return preparedGreetings.get(key)?.audio;
}
export function prepareAssistantGreeting(key: string, loader: () => Promise<Blob | null>) {
  const existing = preparedGreetings.get(key);
  if (existing) return existing.pending ?? Promise.resolve();
  const entry: { audio?: Blob; pending?: Promise<void> } = {};
  preparedGreetings.set(key, entry);
  while (preparedGreetings.size > 12) preparedGreetings.delete(preparedGreetings.keys().next().value!);
  entry.pending = Promise.resolve().then(loader).then(audio => {
    if (audio) entry.audio = audio;
    else preparedGreetings.delete(key);
  }).catch(() => { preparedGreetings.delete(key); });
  return entry.pending;
}
interface GreetingOptions {
  text: string;
  language: string;
  onComplete: () => void;
  synthesis?: SpeechSynthesis | null;
  Utterance?: typeof SpeechSynthesisUtterance;
  audioBlob?: Blob;
  Audio?: new (url: string) => HTMLAudioElement;
  setTimer?: (callback: () => void, delay: number) => Timer;
  clearTimer?: (timer: Timer) => void;
}

/** A local-only greeting: no network, billing or indefinite microphone delay. */
export function speakOfflineAssistantGreeting(options: GreetingOptions) {
  const synthesis = options.synthesis !== undefined ? options.synthesis
    : typeof window === 'undefined' ? null : window.speechSynthesis;
  const Utterance = options.Utterance ?? globalThis.SpeechSynthesisUtterance;
  const schedule = options.setTimer ?? ((callback, delay) => globalThis.setTimeout(callback, delay));
  const clear = options.clearTimer ?? (timer => globalThis.clearTimeout(timer as ReturnType<typeof setTimeout>));
  const timers = new Set<Timer>();
  let closed = false;
  let message: SpeechSynthesisUtterance | null = null;
  let player: HTMLAudioElement | null = null;
  let audioUrl: string | null = null;
  const stopPlayer = () => {
    if (player) {
      player.onended = player.onerror = null;
      player.pause();
      player = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  };
  const cleanup = () => {
    for (const timer of timers) clear(timer);
    timers.clear();
    synthesis?.removeEventListener?.('voiceschanged', trySpeak);
    if (message) message.onstart = message.onend = message.onerror = null;
    stopPlayer();
  };
  const cancel = () => {
    if (closed) return;
    closed = true;
    cleanup();
    if (message) synthesis?.cancel();
  };
  const finish = (interrupt = false) => {
    if (closed) return;
    closed = true;
    cleanup();
    if (interrupt && message) synthesis?.cancel();
    options.onComplete();
  };
  function trySpeak() {
    if (closed || message || !synthesis || !Utterance) return;
    const prefix = options.language.split('-')[0].toLowerCase();
    const voices = synthesis.getVoices().filter(voice =>
      voice.localService && voice.lang.toLowerCase().split('-')[0] === prefix);
    const voice = voices.find(voice =>
      /female|woman|femmina|elsa|isabella|alice|federica|paola|samantha|victoria|zira|aria|jenny|sara|helena|amelie|audrey|katja|sabina|luciana/i.test(voice.name)
    ) || voices.find(voice => voice.lang === options.language) || voices[0];
    if (!voice) return;
    for (const timer of timers) clear(timer);
    timers.clear();
    message = new Utterance(options.text);
    message.voice = voice;
    message.lang = options.language;
    message.rate = 0.94;
    message.pitch = 1.08;
    const startTimer = schedule(() => finish(true), 800);
    timers.add(startTimer);
    message.onstart = () => {
      if (closed) return;
      clear(startTimer);
      timers.delete(startTimer);
      timers.add(schedule(() => finish(true), Math.min(10000, Math.max(2000, options.text.length * 110))));
    };
    message.onend = () => finish();
    message.onerror = () => finish(true);
    try { synthesis.speak(message); } catch { finish(true); }
  }
  const startLocal = () => {
    if (closed) return;
    stopPlayer();
    for (const timer of timers) clear(timer);
    timers.clear();
    if (!synthesis || !Utterance) { finish(); return; }
    synthesis.addEventListener?.('voiceschanged', trySpeak);
    timers.add(schedule(() => finish(true), 600));
    try { trySpeak(); } catch { finish(true); }
  };
  const Audio = options.Audio ?? globalThis.Audio;
  if (options.audioBlob && Audio) {
    try {
      audioUrl = URL.createObjectURL(options.audioBlob);
      const cachedPlayer = new Audio(audioUrl);
      player = cachedPlayer;
      const valid = () => !closed && player === cachedPlayer;
      cachedPlayer.onended = () => { if (valid()) finish(); };
      cachedPlayer.onerror = () => { if (valid()) startLocal(); };
      const startTimer = schedule(() => { if (valid()) startLocal(); }, 1000);
      timers.add(startTimer);
      void cachedPlayer.play().then(() => {
        if (!valid()) return;
        clear(startTimer);
        timers.delete(startTimer);
        timers.add(schedule(() => { if (valid()) finish(); },
          Math.min(10000, Math.max(2000, options.text.length * 110))));
      }).catch(() => { if (valid()) startLocal(); });
    } catch { startLocal(); }
  } else {
    startLocal();
  }
  return { cancel };
}