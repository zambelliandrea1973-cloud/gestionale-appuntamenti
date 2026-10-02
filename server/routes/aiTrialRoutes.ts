import { Router, type Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { AITrialAccessError, beginAppointmentConversation, getAITrialUsage } from '../services/aiTrialUsageService';

export function sendAITrialError(error: unknown, res: Response): boolean {
  if (!(error instanceof AITrialAccessError)) return false;
  const conversationOnly = error.code.startsWith('AI_CONVERSATION');
  res.status(403).json({
    code: error.code,
    feature: error.feature,
    subscriptionRequired: !conversationOnly,
    message: conversationOnly
      ? 'Questa conversazione è terminata. Ricomincia una nuova conversazione se hai ancora utilizzi disponibili.'
      : error.message
  });
  return true;
}

const router = Router();
router.get('/api/ai/trial-access', requireAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store').json(await getAITrialUsage(Number((req.user as { id: number }).id)));
  } catch {
    res.status(503).json({ message: 'Impossibile verificare gli utilizzi AI. Riprova più tardi.' });
  }
});
router.post('/api/ai-appointment-assistant/conversation', requireAuth, async (req, res) => {
  try {
    res.json(await beginAppointmentConversation(Number((req.user as { id: number }).id), req.body?.conversationId));
  } catch (error) {
    if (sendAITrialError(error, res)) return;
    res.status(503).json({ code: 'AI_INTERPRETATION_UNAVAILABLE', message: 'Impossibile avviare la conversazione AI.' });
  }
});
export default router;