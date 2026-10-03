import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pipeline } from 'node:stream/promises';
import { requireAuth } from '../middleware/authMiddleware';
import {
  assistantSpeechConfig,
  synthesizeAssistantSpeechStream
} from '../services/assistantSpeechService';

const router = Router();
const MAX_TEXT_LENGTH = 1500;

const speechRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Troppe richieste vocali. Riprova tra poco.' }
});

router.post(
  '/api/ai-appointment-assistant/speech',
  requireAuth,
  speechRateLimiter,
  async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const language =
      typeof req.body?.language === 'string' && req.body.language.trim()
        ? req.body.language.trim().slice(0, 20)
        : 'it-IT';

    if (!text) {
      return res.status(400).json({ message: 'Il testo da pronunciare è obbligatorio.' });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        message: `Il testo da pronunciare non può superare ${MAX_TEXT_LENGTH} caratteri.`
      });
    }

    const upstreamController = new AbortController();
    const abortUpstream = () => {
      if (!res.writableEnded) upstreamController.abort();
    };
    req.once('aborted', abortUpstream);
    res.once('close', abortUpstream);

    try {
      const audio = await synthesizeAssistantSpeechStream(
        text,
        language,
        upstreamController.signal
      );
      const headers: Record<string, string> = {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, no-store',
        'X-Assistant-Voice': assistantSpeechConfig.voice,
        'X-Assistant-Audio-Streaming': audio.cached ? 'cache' : 'stream'
      };
      if (audio.contentLength) {
        headers['Content-Length'] = audio.contentLength.toString();
      }
      res.set(headers);
      await pipeline(audio.stream, res);
      return;
    } catch (error) {
      if (upstreamController.signal.aborted) return;
      console.error('[AI APPOINTMENT ASSISTANT] Speech synthesis failed:', error);
      if (res.headersSent) {
        res.destroy();
        return;
      }
      return res.status(503).json({
        message: 'La voce non è momentaneamente disponibile.'
      });
    } finally {
      req.removeListener('aborted', abortUpstream);
      res.removeListener('close', abortUpstream);
    }
  }
);

export default router;