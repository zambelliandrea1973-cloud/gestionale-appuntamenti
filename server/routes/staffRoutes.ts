import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { isAdmin } from "../auth";
import { loadStorageData } from "../utils/jsonStorage";

/**
 * Configura le route per la gestione degli utenti staff
 */
export default function setupStaffRoutes(app: Express) {
  // Ottieni la lista di tutti gli utenti staff (solo per admin) - endpoint alternativo
  app.get("/api/staff/users", isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("🔵 [/api/staff/users] INIZIO - Recupero staff dal database PostgreSQL");
      
      // Recupera tutti gli utenti staff dal database
      const staffUsers = await storage.getAllStaffUsers();
      console.log(`🔵 [/api/staff/users] Trovati ${staffUsers.length} utenti staff dal database`);
      
      // Rimuovi le password e aggiungi i codici referral
      const safeUsers = staffUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        
        // Genera il codice referral per ogni staff
        const referralCode = user.id === 14 ? "BUS14" : 
                           user.id === 16 ? "FAV16" : 
                           user.id === 8 ? "ZAM08" : 
                           `REF${user.id}`;
        
        return {
          ...userWithoutPassword,
          referralCode: referralCode
        };
      });
      
      console.log(`📋 STAFF USERS CON CODICI REFERRAL: ${safeUsers.length} account preparati`);
      console.log(`🔵 [/api/staff/users] Invio risposta JSON con ${safeUsers.length} utenti`);
      res.json(safeUsers);
    } catch (error) {
      console.error("❌ [/api/staff/users] Errore durante il recupero degli utenti staff:", error);
      res.status(500).json({ message: "Si è verificato un errore durante il recupero degli utenti staff" });
    }
  });

  // Ottieni la lista di tutti gli utenti staff (solo per admin)
  app.get("/api/staff/list", isAdmin, async (req: Request, res: Response) => {
    try {
      // Recupera tutti gli utenti staff dal database
      const staffUsers = await storage.getAllStaffUsers();
      
      // Rimuovi le password e aggiungi i codici referral
      const safeUsers = staffUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        
        // Genera il codice referral per ogni staff
        const referralCode = user.id === 14 ? "BUS14" : 
                           user.id === 16 ? "FAV16" : 
                           user.id === 8 ? "ZAM08" : 
                           `REF${user.id}`;
        
        return {
          ...userWithoutPassword,
          referralCode: referralCode
        };
      });
      
      console.log(`📋 STAFF LIST CON CODICI REFERRAL: ${safeUsers.length} account preparati`);
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
      
      // Imposta il ruolo e il type
      let userRole = 'staff';
      let userType = 'staff';
      
      if (role === 'admin') {
        userRole = 'admin';
        userType = 'admin';
      } else if (role === 'user' || role === 'customer') {
        userRole = 'user';
        userType = 'customer';
      } else {
        userRole = 'staff';
        userType = 'staff';
      }
      
      // Crea il nuovo utente
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        role: userRole,
        type: userType,
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

  // Aggiorna un utente staff (solo per admin)
  app.patch("/api/staff/:id", isAdmin, async (req: Request, res: Response) => {
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
        return res.status(400).json({ message: "Non è possibile modificare un utente cliente da questa API" });
      }
      
      // Dati da aggiornare
      const updateData: any = {};
      const { username, email, password, role } = req.body;
      
      // Controlla se l'username è stato fornito e se è cambiato
      if (username && username !== user.username) {
        // Verifica se l'username è già in uso da un altro utente
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username già in uso da un altro utente" });
        }
        updateData.username = username;
      }
      
      // Aggiorna l'email se fornita
      if (email !== undefined) {
        updateData.email = email || null; // Consenti di rimuovere l'email impostando null
      }
      
      // Aggiorna la password se fornita
      if (password) {
        updateData.password = await hashPassword(password);
      }
      
      // Aggiorna il ruolo se fornito (solo admin può modificare ruoli)
      if (role !== undefined && (role === 'admin' || role === 'staff' || role === 'user')) {
        updateData.role = role;
        
        // Se il ruolo è 'user', cambia anche il type a 'customer'
        if (role === 'user') {
          updateData.type = 'customer';
        } else {
          // Staff e Admin hanno type uguale al role
          updateData.type = role;
        }
      }
      
      // Verifica che ci sia almeno un campo da aggiornare
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nessun dato da aggiornare fornito" });
      }
      
      // Aggiorna l'utente
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (updatedUser) {
        // Rimuovi la password dalla risposta
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Impossibile aggiornare l'utente" });
      }
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'utente staff:", error);
      res.status(500).json({ message: "Si è verificato un errore durante l'aggiornamento dell'utente staff" });
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
      
      // PROTEZIONE CROSS-STORE: Verifica se user ha dati in JSON prima di cancellare
      const storageData = loadStorageData();
      
      // Normalizza struttura JSON (supporta sia [id, obj] che obj)
      const clients = (storageData.clients || []).map((it: any) => Array.isArray(it) ? it[1] : it);
      const appointments = (storageData.appointments || []).map((it: any) => Array.isArray(it) ? it[1] : it);
      
      const userClients = clients.filter((client: any) => client.ownerId === userId);
      const userAppointments = appointments.filter((appt: any) => {
        // Trova il client dell'appuntamento e verifica se appartiene a questo user
        const apptClient = clients.find((c: any) => c.id === appt.clientId);
        return apptClient && apptClient.ownerId === userId;
      });
      
      if (userClients.length > 0 || userAppointments.length > 0) {
        console.error(`❌ [PROTEZIONE] Impossibile eliminare utente ${userId}: ha ${userClients.length} clienti e ${userAppointments.length} appuntamenti in JSON`);
        return res.status(409).json({ 
          message: `Impossibile eliminare: l'utente ha ${userClients.length} clienti e ${userAppointments.length} appuntamenti associati`,
          error: "HAS_RELATED_DATA",
          details: {
            clients: userClients.length,
            appointments: userAppointments.length
          }
        });
      }
      
      console.log(`✅ [PROTEZIONE] Utente ${userId} non ha dati in JSON, eliminazione sicura`);
      
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