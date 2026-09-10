import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/authMiddleware';
import {
  assistantSpeechConfig,
  synthesizeAssistantSpeech
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

    try {
      const audio = await synthesizeAssistantSpeech(text, language);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audio.length.toString(),
        'Cache-Control': 'private, no-store',
        'X-Assistant-Voice': assistantSpeechConfig.voice
      });
      return res.send(audio);
    } catch (error) {
      console.error('[AI APPOINTMENT ASSISTANT] Speech synthesis failed:', error);
      return res.status(503).json({
        message: 'La voce non è momentaneamente disponibile.'
      });
    }
  }
);

export default router;