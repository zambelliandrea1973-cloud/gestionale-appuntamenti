import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { AppointmentInterpretationError } from '../services/appointmentInterpretationService';
import { authorizeAppointmentAI } from '../services/aiTrialUsageService';
import trialRoutes, { sendAITrialError } from './aiTrialRoutes';
import {
  interpretAppointmentRequest,
  type AppointmentAssistantDraft
} from '../ai-chat';

const router = Router();
router.use(trialRoutes);

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
    if (JSON.stringify(draft).length > 4000) {
      return res.status(400).json({ message: 'La bozza è troppo lunga.' });
    }

    await authorizeAppointmentAI(Number((req.user as { id: number }).id), req.body?.conversationId, 'interpretation');
    const interpretation = await interpretAppointmentRequest(message, draft, language);
    res.json(interpretation);
  } catch (error) {
    if (sendAITrialError(error, res)) return;
    if (error instanceof AppointmentInterpretationError) {
      return res.status(error.httpStatus).json({
        code: error.code,
        message: 'Il servizio di comprensione AI non è disponibile in questo momento. Riprova più tardi.'
      });
    }
    console.error('[AI APPOINTMENT ASSISTANT] Unexpected interpretation error');
    res.status(500).json({
      code: 'AI_ASSISTANT_INTERNAL_ERROR',
      message: 'Non riesco a interpretare la richiesta in questo momento. Riprova.'
    });
  }
});

export default router;