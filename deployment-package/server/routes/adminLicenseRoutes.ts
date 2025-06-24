/**
 * Routes per la gestione delle licenze da parte dell'amministratore
 * Queste route sono accessibili solo dall'utente con ruolo admin
 */

import express from 'express';
import { isAdmin } from '../auth';
import { licenseService, LicenseType } from '../services/licenseService';
import { db } from '../db';
import { users, licenses } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Middleware di protezione: solo admin può accedere
router.use(isAdmin);

// Genera una nuova licenza gratuita di lunga durata (10 anni) per un membro dello staff
router.post('/generate-staff-license', async (req, res) => {
  try {
    const { userId, licenseType = LicenseType.PRO } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'ID utente richiesto' });
    }
    
    // Verifica che l'utente esista e sia di tipo staff
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    if (user.type !== 'staff') {
      return res.status(400).json({ message: 'La licenza gratuita può essere assegnata solo a membri dello staff' });
    }
    
    // Calcola la data di scadenza (10 anni da oggi)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);
    
    // Genera un codice di licenza speciale
    const licenseCode = await licenseService.generateStaffLicense(userId, licenseType, expiresAt);
    
    res.status(201).json({ 
      success: true, 
      message: `Licenza gratuita di 10 anni di tipo ${licenseType} generata con successo per l'utente ${user.username}`,
      licenseCode
    });
  } catch (error: any) {
    console.error('Errore nella generazione della licenza staff:', error);
    res.status(500).json({ message: error.message || 'Errore durante la generazione della licenza' });
  }
});

// Ottieni tutte le licenze attualmente generate
router.get('/licenses', async (req, res) => {
  try {
    // Ottiene tutte le licenze e le associazioni con gli utenti
    const licensesList = await db.select({
      license: licenses,
      username: users.username,
      userType: users.type,
      userRole: users.role
    })
    .from(licenses)
    .leftJoin(users, eq(licenses.userId, users.id));
    
    res.json(licensesList);
  } catch (error: any) {
    console.error('Errore nel recupero delle licenze:', error);
    res.status(500).json({ message: error.message || 'Errore durante il recupero delle licenze' });
  }
});

// Revoca una licenza esistente
router.post('/revoke-license', async (req, res) => {
  try {
    const { licenseId } = req.body;
    
    if (!licenseId) {
      return res.status(400).json({ message: 'ID licenza richiesto' });
    }
    
    await licenseService.revokeLicense(licenseId);
    
    res.json({ 
      success: true, 
      message: 'Licenza revocata con successo'
    });
  } catch (error: any) {
    console.error('Errore nella revoca della licenza:', error);
    res.status(500).json({ message: error.message || 'Errore durante la revoca della licenza' });
  }
});

// Ottieni la lista degli utenti staff che possono ricevere una licenza
router.get('/staff-users', async (req, res) => {
  try {
    const staffUsers = await db.select({
      id: users.id,
      username: users.username,
      type: users.type,
      role: users.role,
      // Altri campi utili
    })
    .from(users)
    .where(eq(users.type, 'staff'));
    
    res.json(staffUsers);
  } catch (error: any) {
    console.error('Errore nel recupero degli utenti staff:', error);
    res.status(500).json({ message: error.message || 'Errore durante il recupero degli utenti staff' });
  }
});

export default router;