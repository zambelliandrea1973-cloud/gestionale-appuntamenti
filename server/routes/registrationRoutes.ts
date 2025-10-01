import { Express } from "express";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { addDays } from "date-fns";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { licenseService } from "../services/licenseService";

/**
 * Configura le route di registrazione per i nuovi utenti
 */
export default function setupRegistrationRoutes(app: Express) {
  // Endpoint per la registrazione di nuovi utenti cliente
  app.post("/api/register", async (req, res) => {
    try {
      const { name, email, username, password, referralCode } = req.body;
      
      // Verifica che tutti i campi necessari siano presenti
      if (!name || !email || !username || !password) {
        return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
      }
      
      // Verifica codice referral se fornito
      let referrerStaff = null;
      if (referralCode && referralCode.trim() !== '') {
        referrerStaff = await storage.getUserByReferralCode(referralCode.trim());
        if (!referrerStaff) {
          console.log(`⚠️ Codice referral non valido: ${referralCode}`);
          // Non blocchiamo la registrazione, semplicemente ignoriamo il codice
        } else {
          console.log(`✅ Codice referral valido! Sponsor: ${referrerStaff.username} (${referrerStaff.id})`);
        }
      }
      
      // Verifica se l'username è già in uso
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username già in uso" });
      }
      
      // Verifica se l'email è già in uso
      const [existingUserByEmail] = await db.select()
                                             .from(users)
                                             .where(eq(users.email, email));
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email già in uso" });
      }
      
      // Crea l'hash della password
      const hashedPassword = await hashPassword(password);
      
      // Crea il nuovo utente (con referral se presente)
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: 'user', // I nuovi utenti hanno il ruolo 'user' di default
        type: 'customer', // Tutti i nuovi utenti sono 'customer' di default, solo admin può promuovere a 'staff'
        referredBy: referrerStaff?.id || null // Assegna sponsor se presente
      });
      
      if (referrerStaff) {
        console.log(`🎉 REFERRAL TRACCIATO: ${newUser.username} sponsorizzato da ${referrerStaff.username}`);
      }
      
      console.log(`Nuovo utente registrato: ${username} (${email})`);
      
      // Crea una licenza di prova per l'utente
      try {
        // Imposta la data di scadenza della prova gratuita (40 giorni da oggi)
        const trialExpiresAt = addDays(new Date(), 40);
        
        // Registra la licenza di prova nel servizio licenze
        await licenseService.createTrialLicense(newUser.id, trialExpiresAt);
        
        console.log(`Licenza di prova creata per l'utente ${username} con scadenza ${trialExpiresAt.toISOString()}`);
      } catch (licenseError) {
        console.error(`Errore durante la creazione della licenza di prova per l'utente ${username}:`, licenseError);
        // Non blocchiamo la registrazione se c'è un errore nella creazione della licenza
      }
      
      // Restituisci il nuovo utente (senza la password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        ...userWithoutPassword,
        message: "Registrazione completata con successo"
      });
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      res.status(500).json({ message: "Si è verificato un errore durante la registrazione" });
    }
  });
}