import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { storage } from '../storage';

const router = Router();

router.get("/api/subscription-plans", async (req, res) => {
  try {
    const plans = await storage.getActiveSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error loading subscription plans:', error);
    res.status(500).json({ message: "Error loading plans" });
  }
});

router.post("/api/subscription-plans", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Only admin can create plans" });
  }

  try {
    const newPlan = await storage.createSubscriptionPlan(req.body);
    res.json(newPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ message: "Error creating plan" });
  }
});

router.put("/api/subscription-plans/:id", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Only admin can modify plans" });
  }

  try {
    const planId = parseInt(req.params.id);
    const updatedPlan = await storage.updateSubscriptionPlan(planId, req.body);
    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: "Error updating plan" });
  }
});

router.delete("/api/subscription-plans/:id", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Only admin can delete plans" });
  }

  try {
    const planId = parseInt(req.params.id);
    await storage.updateSubscriptionPlan(planId, { isActive: false });
    res.json({ message: "Piano disattivato successfully" });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ message: "Error deleting plan" });
  }
});

export default router;
