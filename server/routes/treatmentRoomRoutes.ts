import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

router.get("/api/treatment-rooms", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;

  try {
    const rooms = await storage.getTreatmentRoomsForUser(user.id);
    res.json(rooms);
  } catch (error) {
    console.error("Errore recupero stanze:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.post("/api/treatment-rooms", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;

  try {
    const roomData = {
      ...req.body,
      userId: user.id
    };

    const newRoom = await storage.createTreatmentRoom(roomData);
    console.log(`✅ Stanza creata: ${newRoom.name} per utente ${user.id}`);
    res.status(201).json(newRoom);
  } catch (error) {
    console.error("Errore creazione stanza:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.put("/api/treatment-rooms/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const roomId = parseInt(req.params.id);

  try {
    const existingRoom = await storage.getTreatmentRoom(roomId);
    if (!existingRoom || existingRoom.userId !== user.id) {
      return res.status(404).json({ message: "Stanza non trovata" });
    }

    const updatedRoom = await storage.updateTreatmentRoom(roomId, req.body);
    if (!updatedRoom) {
      return res.status(404).json({ message: "Stanza non trovata" });
    }

    console.log(`✅ Stanza aggiornata: ${updatedRoom.name}`);
    res.json(updatedRoom);
  } catch (error) {
    console.error("Errore aggiornamento stanza:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.delete("/api/treatment-rooms/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const roomId = parseInt(req.params.id);

  try {
    const existingRoom = await storage.getTreatmentRoom(roomId);
    if (!existingRoom || existingRoom.userId !== user.id) {
      return res.status(404).json({ message: "Stanza non trovata" });
    }

    const deleted = await storage.deleteTreatmentRoom(roomId);
    if (!deleted) {
      return res.status(404).json({ message: "Stanza non trovata" });
    }

    console.log(`✅ Stanza eliminata: ID ${roomId} per utente ${user.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Errore eliminazione stanza:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

export default router;
