/**
 * Script di correzione per i problemi di identità
 * Questo script contiene funzioni per verificare e correggere 
 * problemi di confusione di identità tra utenti
 */

import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface UserIdentity {
  id: number;
  username: string;
  email: string;
  type?: string;
  role?: string;
}

/**
 * Controlla se l'utente è soggetto a confusione di identità
 * @param userId ID dell'utente da verificare
 * @param usernameToVerify Nome utente da verificare (opzionale)
 */
export async function verifyIdentity(userId: number, usernameToVerify?: string): Promise<boolean> {
  // Ottieni l'utente dal database
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  // Se non c'è nessun username da verificare, restituisci semplicemente i dati dell'utente
  if (!usernameToVerify) {
    return true;
  }
  
  // Verifica se c'è una corrispondenza
  return user?.username === usernameToVerify;
}

/**
 * Corregge l'identità per utenti specifici che sono soggetti a confusione
 * @param userId ID dell'utente
 * @param sessionType Tipo di utente nella sessione
 */
export async function correctIdentityIfNeeded(userId: number, sessionType: string): Promise<UserIdentity | null> {
  // Se l'utente è zambelli.andrea.1973B (noto per problemi di identità)
  if (userId === 16 && (sessionType === 'staff' || sessionType === 'customer')) {
    console.log(`⚠️ Rilevato potenziale problema di identità: User ID ${userId} potrebbe essere confuso con Elisa Faverio`);
    
    // Cerca l'utente corretto per zambelli.andrea.1973B 
    const [correctUser] = await db.select().from(users).where(eq(users.username, 'zambelli.andrea.1973B'));
    
    if (correctUser) {
      console.log(`✅ Correzione identità: Trovato utente corretto zambelli.andrea.1973B con ID ${correctUser.id}`);
      return {
        id: correctUser.id, 
        username: correctUser.username,
        email: correctUser.email,
        type: correctUser.type || sessionType,
        role: correctUser.role
      };
    }
  }
  
  // Se è l'account di ElisaFaverio ma dovrebbe essere qualcun altro
  if (userId === 16 && (sessionType === 'staff' || sessionType === 'customer')) {
    console.log(`⚠️ Correzione forzata: ID 16 viene identificato erroneamente come Elisa Faverio`);
    
    // Cerca l'utente zambelli.andrea.1973B
    const [correctUser] = await db.select().from(users).where(eq(users.username, 'zambelli.andrea.1973B'));
    
    if (correctUser) {
      return {
        id: correctUser.id,
        username: correctUser.username,
        email: correctUser.email,
        type: correctUser.type || sessionType,
        role: correctUser.role
      };
    }
  }
  
  return null;
}