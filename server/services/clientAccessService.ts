import { db } from "../db";
import { clientAccesses, clients, type ClientAccess, type InsertClientAccess, type Client, type ClientWithAccessCount } from "@shared/schema";
import { count, eq } from "drizzle-orm";

/**
 * Servizio per la gestione degli accessi dei clienti
 */
export const clientAccessService = {
  /**
   * Registra un nuovo accesso per un cliente
   * @param clientId ID del cliente
   * @param ipAddress Indirizzo IP del cliente (opzionale)
   * @param userAgent User agent del client (opzionale)
   * @returns L'accesso creato
   */
  async logAccess(clientId: number, ipAddress?: string, userAgent?: string): Promise<ClientAccess> {
    // Verifica che il cliente esista
    const clientExists = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!clientExists.length) {
      throw new Error(`Cliente con ID ${clientId} non trovato`);
    }

    const accessData: InsertClientAccess = {
      clientId,
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {})
    };

    // Inserisci il nuovo accesso
    const [newAccess] = await db
      .insert(clientAccesses)
      .values(accessData)
      .returning();

    return newAccess;
  },

  /**
   * Ottiene il conteggio degli accessi per un cliente specifico
   * @param clientId ID del cliente
   * @returns Il numero di accessi
   */
  async getAccessCountForClient(clientId: number): Promise<number> {
    const [result] = await db
      .select({ accessCount: count() })
      .from(clientAccesses)
      .where(eq(clientAccesses.clientId, clientId));

    return result?.accessCount || 0;
  },

  /**
   * Ottiene il conteggio degli accessi per tutti i clienti
   * @returns Un array di clienti con i rispettivi conteggi di accesso
   */
  async getAccessCountsForAllClients(): Promise<ClientWithAccessCount[]> {
    // Get all clients
    const allClients = await db.select().from(clients);
    
    // For each client, get their access count
    const clientsWithCounts = await Promise.all(
      allClients.map(async (client) => {
        const accessCount = await this.getAccessCountForClient(client.id);
        return {
          ...client,
          accessCount
        };
      })
    );

    return clientsWithCounts;
  },

  /**
   * Ottiene tutti gli accessi per un cliente specifico
   * @param clientId ID del cliente
   * @returns Gli accessi del cliente
   */
  async getAccessesForClient(clientId: number): Promise<ClientAccess[]> {
    return db
      .select()
      .from(clientAccesses)
      .where(eq(clientAccesses.clientId, clientId))
      .orderBy(clientAccesses.accessTime);
  }
};