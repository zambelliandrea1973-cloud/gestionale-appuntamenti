import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  interpretAppointmentRequest,
  type AppointmentAssistantDraft
} from '../ai-chat';

const router = Router();

router.post('/api/ai-appointment-assistant/interpret', requireAuth, async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const draft = (req.body?.draft && typeof req.body.draft === 'object')
      ? req.body.draft as AppointmentAssistantDraft
      : {};
    const language = typeof req.body?.language === 'string'
      ? req.body.language.slice(0, 20)
      : 'it';

    if (!message) {
      return res.status(400).json({ message: 'Il messaggio è obbligatorio.' });
    }

    if (message.length > 1500) {
      return res.status(400).json({ message: 'Il messaggio è troppo lungo.' });
    }

    const interpretation = await interpretAppointmentRequest(message, draft, language);
    res.json(interpretation);
  } catch (error) {
    console.error('❌ [AI APPOINTMENT ASSISTANT] Interpretation error:', error);
    res.status(500).json({
      message: 'Non riesco a interpretare la richiesta in questo momento. Riprova.'
    });
  }
});

export default router;