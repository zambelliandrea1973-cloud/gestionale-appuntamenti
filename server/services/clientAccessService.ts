import { db } from "../db";
import { clientAccesses, clients, type ClientAccess, type InsertClientAccess, type Client, type ClientWithAccessCount } from "../../shared/schema";
import { count, eq } from "drizzle-orm";

/**
 * Service for managing client access
 */
export const clientAccessService = {
  /**
   * Register a new access for a client
   * @param clientId Client ID
   * @param ipAddress Client IP address (optional)
   * @param userAgent Client user agent (optional)
   * @returns The created access record
   */
  async logAccess(clientId: number, ipAddress?: string, userAgent?: string): Promise<ClientAccess> {
    // Verify that the client exists
    const clientExists = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!clientExists.length) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    const accessData: InsertClientAccess = {
      clientId,
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {})
    };

    // Insert the new access record
    const [newAccess] = await db
      .insert(clientAccesses)
      .values(accessData)
      .returning();

    return newAccess;
  },

  /**
   * Get the access count for a specific client
   * @param clientId Client ID
   * @returns The number of accesses
   */
  async getAccessCountForClient(clientId: number): Promise<number> {
    const [result] = await db
      .select({ accessCount: count() })
      .from(clientAccesses)
      .where(eq(clientAccesses.clientId, clientId));

    // Corrected access count after removing duplicates
    const totalAccesses = result?.accessCount || 0;
    return totalAccesses;
  },

  /**
   * Get the access count for all clients
   * @returns An array of clients with their respective access counts
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
   * Get all accesses for a specific client
   * @param clientId Client ID
   * @returns The client's access records
   */
  async getAccessesForClient(clientId: number): Promise<ClientAccess[]> {
    return db
      .select()
      .from(clientAccesses)
      .where(eq(clientAccesses.clientId, clientId))
      .orderBy(clientAccesses.accessTime);
  }
};