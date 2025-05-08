import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { isAdmin } from "../auth";

/**
 * Configura le route per la gestione degli utenti staff
 */
export default function setupStaffRoutes(app: Express) {
  // Ottieni la lista di tutti gli utenti staff (solo per admin)
  app.get("/api/staff/list", isAdmin, async (req: Request, res: Response) => {
    try {
      // Recupera tutti gli utenti staff dal database
      const staffUsers = await storage.getAllStaffUsers();
      
      // Rimuovi le password dagli oggetti utente
      const safeUsers = staffUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Errore durante il recupero degli utenti staff:", error);
      res.status(500).json({ message: "Si è verificato un errore durante il recupero degli utenti staff" });
    }
  });

  // Crea un nuovo utente staff (solo per admin)
  app.post("/api/staff/register", isAdmin, async (req: Request, res: Response) => {
    try {
      const { username, password, email, role } = req.body;
      
      // Verifica che username e password siano presenti
      if (!username || !password) {
        return res.status(400).json({ message: "Username e password sono obbligatori" });
      }
      
      // Verifica se l'username è già in uso
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username già in uso" });
      }
      
      // Crea l'hash della password
      const hashedPassword = await hashPassword(password);
      
      // Imposta il ruolo (default: 'staff')
      const userRole = role === 'admin' ? 'admin' : 'staff';
      
      // Crea il nuovo utente
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        role: userRole,
        type: 'staff',
        clientId: null
      });
      
      console.log(`Nuovo utente staff creato: ${username} (${email || 'senza email'}) con ruolo ${userRole}`);
      
      // Restituisci il nuovo utente (senza la password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Errore durante la creazione dell'utente staff:", error);
      res.status(500).json({ message: "Si è verificato un errore durante la creazione dell'utente staff" });
    }
  });

  // Elimina un utente staff (solo per admin)
  app.delete("/api/staff/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verifica che l'ID sia valido
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID utente non valido" });
      }
      
      // Verifica che l'utente esista
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }
      
      // Verifica che l'utente sia uno staff (non un cliente)
      if (user.clientId) {
        return res.status(400).json({ message: "Non è possibile eliminare un utente cliente da questa API" });
      }
      
      // Impedisci l'eliminazione dell'account admin principale
      if (user.role === 'admin' && user.username === 'zambelli.andrea.1973@gmail.com') {
        return res.status(403).json({ message: "Non è possibile eliminare l'account amministratore principale" });
      }
      
      // Elimina l'utente
      const deleted = await storage.deleteUser(userId);
      
      if (deleted) {
        res.json({ message: "Utente eliminato con successo" });
      } else {
        res.status(500).json({ message: "Impossibile eliminare l'utente" });
      }
    } catch (error) {
      console.error("Errore durante l'eliminazione dell'utente staff:", error);
      res.status(500).json({ message: "Si è verificato un errore durante l'eliminazione dell'utente staff" });
    }
  });
}