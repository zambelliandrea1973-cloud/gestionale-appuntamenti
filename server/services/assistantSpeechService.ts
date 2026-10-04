import { Readable } from 'node:stream';

const ASSISTANT_VOICE = 'Aoede' as const;
const ASSISTANT_SPEECH_MODEL = 'gemini-3.8-flash-lite-tts' as const;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_CACHE_ENTRIES = 100;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;

const speechCache = new Map<string, Buffer>();
let cacheBytes = 0;

function cacheSpeech(key: string, audio: Buffer): void {
  if (audio.length > MAX_CACHE_BYTES) return;
  const previous = speechCache.get(key);
  if (previous) cacheBytes -= previous.length;
  speechCache.delete(key);
  speechCache.set(key, audio);
  cacheBytes += audio.length;

  while (speechCache.size > MAX_CACHE_ENTRIES || cacheBytes > MAX_CACHE_BYTES) {
    const oldestKey = speechCache.keys().next().value;
    if (!oldestKey) break;
    cacheBytes -= speechCache.get(oldestKey)!.length;
    speechCache.delete(oldestKey);
  }
}

export interface AssistantSpeechStream {
  stream: Readable;
  contentType: 'audio/wav';
  contentLength?: number;
  cached: boolean;
}

export async function synthesizeAssistantSpeechStream(
  text: string,
  language: string,
  signal?: AbortSignal
): Promise<AssistantSpeechStream> {
  signal?.throwIfAborted();
  const apiKey = process.env.GEMINI_APPOINTMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini speech is not configured: GEMINI_APPOINTMENTS_API_KEY is required');
  }
  const cacheKey = `${ASSISTANT_SPEECH_MODEL}:${ASSISTANT_VOICE}:${language}:${text}`;
  const cached = speechCache.get(cacheKey);
  if (cached) {
    speechCache.delete(cacheKey);
    speechCache.set(cacheKey, cached);
    return {
      stream: Readable.from([cached]),
      contentType: 'audio/wav',
      contentLength: cached.length,
      cached: true
    };
  }

  // Use the documented REST contract without changing the SDK used by other AI functions.
  // Unary Gemini 3.8 TTS returns a complete WAV, not MP3 or headerless PCM.
  const controller = new AbortController();
  const abortUpstream = () => controller.abort();
  signal?.addEventListener('abort', abortUpstream, { once: true });
  const timeout = setTimeout(abortUpstream, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${ASSISTANT_SPEECH_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text,
              speech_metadata: {
                style: `Clear, warm, natural conversational delivery at a brisk but understandable pace. Pronounce the transcript in ${language} without translating it.`
              }
            }]
          }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { voice: ASSISTANT_VOICE } },
            responseFormat: { audio: { mimeType: 'AUDIO_WAV' } }
          }
        })
      }
    );
    if (!response.ok) {
      // Never include the upstream body, which can contain credential details.
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`Gemini speech request failed (HTTP ${response.status})`);
    }
    const result = await response.json();
    controller.signal.throwIfAborted();
    const parts = result.candidates?.[0]?.content?.parts;
    const audioParts = Array.isArray(parts)
      ? parts.filter(part => typeof part.inlineData?.data === 'string')
      : [];
    if (audioParts.length !== 1 ||
        !/^audio\/(?:wav|x-wav|wave)(?:;|$)/i.test(audioParts[0].inlineData.mimeType || '')) {
      throw new Error('Gemini speech returned no supported WAV audio');
    }
    const audio = Buffer.from(audioParts[0].inlineData.data, 'base64');
    if (audio.length <= 44 || audio.toString('ascii', 0, 4) !== 'RIFF' ||
        audio.toString('ascii', 8, 12) !== 'WAVE') {
      throw new Error('Gemini speech returned invalid WAV audio');
    }
    cacheSpeech(cacheKey, audio);
    return {
      stream: Readable.from([audio]),
      contentType: 'audio/wav',
      contentLength: audio.length,
      cached: false
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortUpstream);
  }
}

export const assistantSpeechConfig = {
  model: ASSISTANT_SPEECH_MODEL,
  voice: ASSISTANT_VOICE
} as const;