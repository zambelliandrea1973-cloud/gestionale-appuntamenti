import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

router.get("/api/collaborators", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;

  try {
    const collaborators = await storage.getStaffForUser(user.id);
    res.json(collaborators);
  } catch (error) {
    console.error("Error retrieving collaborators:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/collaborators", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;

  try {
    const collaboratorData = {
      ...req.body,
      userId: user.id
    };

    const newCollaborator = await storage.createStaff(collaboratorData);
    console.log(`✅ Collaborator created: ${newCollaborator.firstName} ${newCollaborator.lastName} for user ${user.id}`);
    res.status(201).json(newCollaborator);
  } catch (error) {
    console.error("Error creating collaborator:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/api/collaborators/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const collaboratorId = parseInt(req.params.id);

  try {
    const existingCollaborator = await storage.getStaff(collaboratorId);
    if (!existingCollaborator || existingCollaborator.userId !== user.id) {
      return res.status(404).json({ message: "Collaboratore not found" });
    }

    const updatedCollaborator = await storage.updateStaff(collaboratorId, req.body);
    if (!updatedCollaborator) {
      return res.status(404).json({ message: "Collaboratore not found" });
    }

    console.log(`✅ Collaborator updated: ${updatedCollaborator.firstName} ${updatedCollaborator.lastName}`);
    res.json(updatedCollaborator);
  } catch (error) {
    console.error("Error updating collaborator:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/collaborators/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const collaboratorId = parseInt(req.params.id);

  try {
    const existingCollaborator = await storage.getStaff(collaboratorId);
    if (!existingCollaborator || existingCollaborator.userId !== user.id) {
      return res.status(404).json({ message: "Collaboratore not found" });
    }

    const deleted = await storage.deleteStaff(collaboratorId);
    if (!deleted) {
      return res.status(404).json({ message: "Collaboratore not found" });
    }

    console.log(`✅ Collaboratore deleted: ID ${collaboratorId} for user ${user.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting collaborator:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
