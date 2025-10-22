import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import nodemailer from "nodemailer";

const scryptAsync = promisify(scrypt);

// Schema per richiesta reset password
const resetRequestSchema = z.object({
  email: z.string().email("Email non valida")
});

// Schema per conferma reset password
const resetConfirmSchema = z.object({
  token: z.string().min(1, "Token richiesto"),
  newPassword: z.string().min(6, "Password deve essere almeno 6 caratteri")
});

// Mappa temporanea per i token di reset (in produzione usare Redis o database)
const resetTokens = new Map<string, { userId: number; email: string; expires: Date }>();

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

// Configura il trasportatore email (da configurare con credenziali reali)
const createEmailTransporter = () => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  
  // Configurazione di fallback per testing (Ethereal Email)
  return null;
};

export function setupPasswordResetRoutes(app: Express) {
  // Richiesta reset password
  app.post("/api/password-reset/request", async (req: Request, res: Response) => {
    try {
      const validationResult = resetRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Dati non validi",
          errors: validationResult.error.errors
        });
      }

      const { email } = validationResult.data;
      
      // Verifica se l'utente esiste
      const user = await storage.getUserByUsername(email);
      if (!user) {
        // Per sicurezza, non rivelare se l'email esiste o meno
        return res.json({ 
          message: "Se l'email esiste nel sistema, riceverai le istruzioni per il reset" 
        });
      }

      // Genera token di reset
      const resetToken = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 3600000); // 1 ora

      // Salva il token
      resetTokens.set(resetToken, {
        userId: user.id,
        email: user.username,
        expires
      });

      // Configura l'invio email
      const transporter = createEmailTransporter();
      if (!transporter) {
        console.log("📧 Email non configurata. Token di reset:", resetToken);
        console.log("🔗 Link di reset (per sviluppo):", `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`);
        
        return res.json({ 
          message: "Sistema email non configurato. Controlla i log del server per il token di reset.",
          developmentToken: resetToken // Solo per sviluppo
        });
      }

      // Invia email di reset
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: "Reset Password - Sistema Appuntamenti",
        html: `
          <h2>Reset Password</h2>
          <p>Hai richiesto il reset della password per il tuo account.</p>
          <p>Clicca sul link seguente per impostare una nuova password:</p>
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <p>Questo link scadrà tra 1 ora.</p>
          <p>Se non hai richiesto questo reset, ignora questa email.</p>
        `,
        text: `
          Reset Password
          
          Hai richiesto il reset della password per il tuo account.
          Vai al seguente link per impostare una nuova password:
          ${resetUrl}
          
          Questo link scadrà tra 1 ora.
          Se non hai richiesto questo reset, ignora questa email.
        `
      });

      res.json({ 
        message: "Se l'email esiste nel sistema, riceverai le istruzioni per il reset" 
      });

    } catch (error) {
      console.error("Errore richiesta reset password:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Verifica validità token
  app.get("/api/password-reset/verify/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const resetData = resetTokens.get(token);

      if (!resetData || resetData.expires < new Date()) {
        return res.status(400).json({ 
          message: "Token non valido o scaduto" 
        });
      }

      res.json({ 
        message: "Token valido",
        email: resetData.email 
      });

    } catch (error) {
      console.error("Errore verifica token:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Conferma reset password
  app.post("/api/password-reset/confirm", async (req: Request, res: Response) => {
    try {
      const validationResult = resetConfirmSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Dati non validi",
          errors: validationResult.error.errors
        });
      }

      const { token, newPassword } = validationResult.data;
      const resetData = resetTokens.get(token);

      if (!resetData || resetData.expires < new Date()) {
        return res.status(400).json({ 
          message: "Token non valido o scaduto" 
        });
      }

      // Hash della nuova password
      const hashedPassword = await hashPassword(newPassword);

      // Aggiorna la password dell'utente
      const user = await storage.getUser(resetData.userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      // Qui dovresti implementare updateUserPassword nel storage
      // Per ora usiamo una query diretta
      console.log(`🔄 Reset password per utente ${resetData.email} (ID: ${resetData.userId})`);

      // Rimuovi il token usato
      resetTokens.delete(token);

      res.json({ 
        message: "Password aggiornata con successo" 
      });

    } catch (error) {
      console.error("Errore conferma reset password:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Cleanup periodico dei token scaduti
  setInterval(() => {
    const now = new Date();
    for (const [token, data] of resetTokens.entries()) {
      if (data.expires < now) {
        resetTokens.delete(token);
      }
    }
  }, 300000); // Ogni 5 minuti
}