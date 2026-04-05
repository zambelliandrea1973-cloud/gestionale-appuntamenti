import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

router.get("/api/collaborators", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;

  try {
    const collaborators = await storage.getStaffForUser(user.id);
    res.json(collaborators);
  } catch (error) {
    console.error("Errore recupero collaboratori:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.post("/api/collaborators", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;

  try {
    const collaboratorData = {
      ...req.body,
      userId: user.id
    };

    const newCollaborator = await storage.createStaff(collaboratorData);
    console.log(`✅ Collaboratore creato: ${newCollaborator.firstName} ${newCollaborator.lastName} per utente ${user.id}`);
    res.status(201).json(newCollaborator);
  } catch (error) {
    console.error("Errore creazione collaboratore:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.put("/api/collaborators/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const collaboratorId = parseInt(req.params.id);

  try {
    const existingCollaborator = await storage.getStaff(collaboratorId);
    if (!existingCollaborator || existingCollaborator.userId !== user.id) {
      return res.status(404).json({ message: "Collaboratore non trovato" });
    }

    const updatedCollaborator = await storage.updateStaff(collaboratorId, req.body);
    if (!updatedCollaborator) {
      return res.status(404).json({ message: "Collaboratore non trovato" });
    }

    console.log(`✅ Collaboratore aggiornato: ${updatedCollaborator.firstName} ${updatedCollaborator.lastName}`);
    res.json(updatedCollaborator);
  } catch (error) {
    console.error("Errore aggiornamento collaboratore:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.delete("/api/collaborators/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const collaboratorId = parseInt(req.params.id);

  try {
    const existingCollaborator = await storage.getStaff(collaboratorId);
    if (!existingCollaborator || existingCollaborator.userId !== user.id) {
      return res.status(404).json({ message: "Collaboratore non trovato" });
    }

    const deleted = await storage.deleteStaff(collaboratorId);
    if (!deleted) {
      return res.status(404).json({ message: "Collaboratore non trovato" });
    }

    console.log(`✅ Collaboratore eliminato: ID ${collaboratorId} per utente ${user.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Errore eliminazione collaboratore:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

export default router;
