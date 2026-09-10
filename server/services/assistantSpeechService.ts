import OpenAI from 'openai';
import { Readable } from 'node:stream';

const ASSISTANT_VOICE = 'shimmer' as const;
const ASSISTANT_SPEECH_MODEL = 'tts-1' as const;
const ASSISTANT_SPEECH_SPEED = 2.22;
const MAX_CACHE_ENTRIES = 100;

const speechCache = new Map<string, Buffer>();
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function cacheSpeech(key: string, audio: Buffer): void {
  if (speechCache.has(key)) speechCache.delete(key);
  speechCache.set(key, audio);

  while (speechCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = speechCache.keys().next().value;
    if (!oldestKey) break;
    speechCache.delete(oldestKey);
  }
}

export interface AssistantSpeechStream {
  stream: Readable;
  contentLength?: number;
  cached: boolean;
}

export async function synthesizeAssistantSpeechStream(
  text: string,
  language: string,
  signal?: AbortSignal
): Promise<AssistantSpeechStream> {
  const cacheKey = `${language}:${text}`;
  const cached = speechCache.get(cacheKey);
  if (cached) {
    speechCache.delete(cacheKey);
    speechCache.set(cacheKey, cached);
    return {
      stream: Readable.from([cached]),
      contentLength: cached.length,
      cached: true
    };
  }

  const response = await getOpenAIClient().audio.speech.create({
    model: ASSISTANT_SPEECH_MODEL,
    voice: ASSISTANT_VOICE,
    input: text,
    response_format: 'mp3',
    speed: ASSISTANT_SPEECH_SPEED
  }, { signal });
  const contentLengthHeader = response.headers.get('content-length');
  const contentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : undefined;

  if (!response.body) {
    const audio = Buffer.from(await response.arrayBuffer());
    cacheSpeech(cacheKey, audio);
    return {
      stream: Readable.from([audio]),
      contentLength: audio.length,
      cached: false
    };
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  const stream = Readable.from((async function* () {
    let completed = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          completed = true;
          break;
        }
        const chunk = Buffer.from(value);
        chunks.push(chunk);
        yield chunk;
      }
    } finally {
      if (!completed) {
        await reader.cancel().catch(() => undefined);
      }
      reader.releaseLock();
      if (completed) {
        cacheSpeech(cacheKey, Buffer.concat(chunks));
      }
    }
  })());

  return {
    stream,
    contentLength: Number.isFinite(contentLength) ? contentLength : undefined,
    cached: false
  };
}

export const assistantSpeechConfig = {
  model: ASSISTANT_SPEECH_MODEL,
  voice: ASSISTANT_VOICE,
  speed: ASSISTANT_SPEECH_SPEED
} as const;