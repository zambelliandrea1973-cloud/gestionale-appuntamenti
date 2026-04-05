import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { storage } from '../storage';

const router = Router();

router.get("/api/subscription-plans", async (req, res) => {
  try {
    const plans = await storage.getActiveSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error('Errore nel caricamento piani abbonamento:', error);
    res.status(500).json({ message: "Errore nel caricamento dei piani" });
  }
});

router.post("/api/subscription-plans", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può creare piani" });
  }

  try {
    const newPlan = await storage.createSubscriptionPlan(req.body);
    res.json(newPlan);
  } catch (error) {
    console.error('Errore nella creazione piano:', error);
    res.status(500).json({ message: "Errore nella creazione del piano" });
  }
});

router.put("/api/subscription-plans/:id", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può modificare piani" });
  }

  try {
    const planId = parseInt(req.params.id);
    const updatedPlan = await storage.updateSubscriptionPlan(planId, req.body);
    res.json(updatedPlan);
  } catch (error) {
    console.error('Errore nell\'aggiornamento piano:', error);
    res.status(500).json({ message: "Errore nell'aggiornamento del piano" });
  }
});

router.delete("/api/subscription-plans/:id", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può eliminare piani" });
  }

  try {
    const planId = parseInt(req.params.id);
    await storage.updateSubscriptionPlan(planId, { isActive: false });
    res.json({ message: "Piano disattivato con successo" });
  } catch (error) {
    console.error('Errore nell\'eliminazione piano:', error);
    res.status(500).json({ message: "Errore nell'eliminazione del piano" });
  }
});

export default router;
