import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

router.get("/api/treatment-rooms", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;

  try {
    const rooms = await storage.getTreatmentRoomsForUser(user.id);
    res.json(rooms);
  } catch (error) {
    console.error("Error retrieving rooms:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/treatment-rooms", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;

  try {
    const roomData = {
      ...req.body,
      userId: user.id
    };

    const newRoom = await storage.createTreatmentRoom(roomData);
    console.log(`✅ room created: ${newRoom.name} for user ${user.id}`);
    res.status(201).json(newRoom);
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/api/treatment-rooms/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const roomId = parseInt(req.params.id);

  try {
    const existingRoom = await storage.getTreatmentRoom(roomId);
    if (!existingRoom || existingRoom.userId !== user.id) {
      return res.status(404).json({ message: "Room not found" });
    }

    const updatedRoom = await storage.updateTreatmentRoom(roomId, req.body);
    if (!updatedRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    console.log(`✅ room updated: ${updatedRoom.name}`);
    res.json(updatedRoom);
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/treatment-rooms/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const roomId = parseInt(req.params.id);

  try {
    const existingRoom = await storage.getTreatmentRoom(roomId);
    if (!existingRoom || existingRoom.userId !== user.id) {
      return res.status(404).json({ message: "Room not found" });
    }

    const deleted = await storage.deleteTreatmentRoom(roomId);
    if (!deleted) {
      return res.status(404).json({ message: "Room not found" });
    }

    console.log(`✅ room deleted: ID ${roomId} for user ${user.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
