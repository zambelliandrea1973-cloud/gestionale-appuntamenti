interface BrowserVoice {
  name: string;
  lang: string;
}

export function selectAssistantVoice<T extends BrowserVoice>(voices: T[], locale: string): T | null {
  const language = (value: string) => {
    const prefix = value.toLowerCase().split(/[-_]/)[0];
    return prefix === 'no' ? 'nb' : prefix;
  };
  const matching = voices.filter(voice => language(voice.lang) === language(locale));
  const normalizedName = (voice: T) => voice.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Browser voices expose no gender field. Prefer known female names, including
  // vendor suffixes such as ElsaNeural, but never choose another language.
  const female = /female|woman|femmina|elsa|isabella|alice|federica|paola|samantha|victoria|zira|aria|jenny|sara|helena|amelie|audrey|katja|sabina|luciana|denise|hortense|hedda|hazel|susan|natasha|svetlana|colette|fleur/i;
  return matching.find(voice => female.test(normalizedName(voice)))
    || matching.find(voice => /natural|enhanced|premium/i.test(voice.name))
    || matching.find(voice => voice.lang.toLowerCase() === locale.toLowerCase())
    || matching[0]
    || null;
}

export function assistantRecognitionErrorKey(error: string): string | null {
  switch (error) {
    case 'aborted': return null;
    case 'no-speech': return 'listenNoSpeech';
    case 'network': return 'listenNetworkError';
    case 'not-allowed':
    case 'service-not-allowed':
    case 'NotAllowedError': return 'listenPermissionError';
    case 'audio-capture':
    case 'NotFoundError':
    case 'NotReadableError': return 'listenCaptureError';
    case 'language-not-supported': return 'listenLanguageError';
    default: return 'listenError';
  }
}

export interface AssistantRecognitionSession {
  start(): void;
  stop(): void;
  cancel(): void;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: ((event: any) => void) | null;
  onend: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: any) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function createAssistantRecognitionSession(
  Recognition: new () => RecognitionLike,
  locale: string,
  handlers: { onStart(): void; onEnd(): void; onResult(text: string): void; onError(error: string): void }
): AssistantRecognitionSession {
  const recognition = new Recognition();
  let active = true;
  let manuallyStopped = false;
  const detach = () => {
    recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null;
  };
  const finish = () => {
    if (!active) return;
    active = false;
    detach();
    try { recognition.abort(); } catch { /* Already ended. */ }
    handlers.onEnd();
  };
  recognition.lang = locale;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => { if (active) handlers.onStart(); };
  recognition.onend = () => {
    if (!active) return;
    finish();
    if (!manuallyStopped) handlers.onError('no-speech');
  };
  recognition.onerror = event => {
    if (!active) return;
    const error = event.error || 'unknown';
    finish();
    if (error !== 'aborted') handlers.onError(error);
  };
  recognition.onresult = event => {
    if (!active) return;
    const text = event.results?.[event.resultIndex || 0]?.[0]?.transcript?.trim();
    finish();
    if (text) handlers.onResult(text);
    else if (!manuallyStopped) handlers.onError('no-speech');
  };
  return {
    start() {
      if (!active) return;
      try { recognition.start(); }
      catch (error) {
        finish();
        handlers.onError(error instanceof Error ? error.name : 'unknown');
      }
    },
    stop() {
      if (!active) return;
      manuallyStopped = true;
      try { recognition.stop(); } catch { finish(); }
    },
    cancel() {
      if (!active) return;
      active = false;
      detach();
      try { recognition.abort(); } catch { /* Already ended. */ }
    }
  };
}