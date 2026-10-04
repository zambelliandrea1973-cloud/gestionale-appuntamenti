import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
// Preserve the old archive without exposing it through the shared studio login.
// Any future transfer must explicitly select and unlock the intended profile.
router.use('/api/personal-appointments', requireAuth, (_req, res) => {
  res.status(410).json({ message: 'Usa lo spazio privato protetto del calendario. Il vecchio archivio è conservato ma non condiviso.' });
});
export default router;