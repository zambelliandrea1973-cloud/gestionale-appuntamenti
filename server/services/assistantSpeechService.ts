import OpenAI from 'openai';

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

export async function synthesizeAssistantSpeech(
  text: string,
  language: string
): Promise<Buffer> {
  const cacheKey = `${language}:${text}`;
  const cached = speechCache.get(cacheKey);
  if (cached) {
    speechCache.delete(cacheKey);
    speechCache.set(cacheKey, cached);
    return cached;
  }

  const response = await getOpenAIClient().audio.speech.create({
    model: ASSISTANT_SPEECH_MODEL,
    voice: ASSISTANT_VOICE,
    input: text,
    response_format: 'mp3',
    speed: ASSISTANT_SPEECH_SPEED
  });
  const audio = Buffer.from(await response.arrayBuffer());
  cacheSpeech(cacheKey, audio);
  return audio;
}

export const assistantSpeechConfig = {
  model: ASSISTANT_SPEECH_MODEL,
  voice: ASSISTANT_VOICE,
  speed: ASSISTANT_SPEECH_SPEED
} as const;