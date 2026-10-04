import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
// The owner selected the local prototype instead. Keep the older protected
// archive intact; any recovery must explicitly identify its destination.
router.use('/api/private-appointments', requireAuth, (_req, res) => {
  res.status(410).json({ message: 'Questa agenda è archiviata. Usa gli impegni locali del calendario.' });
});
export default router;