import { db } from '../db';
import { clients, users } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Generate the next unique client code in format CODICE-XXX
 * Es: BUS1422-001, BUS1422-002, etc.
 * 
 * Handle race conditions with transactional locking
 * 
 * @param ownerId - ID of the professional owner
 * @param maxRetries - Maximum number of attempts (default: 5)
 * @returns Formatted client code (e.g.: "BUS1422-001")
 */
export async function generateClientCode(ownerId: number, maxRetries: number = 5): Promise<string> {
  const user = await db.select({ assignmentCode: users.assignmentCode })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);
  
  if (!user || user.length === 0 || !user[0].assignmentCode) {
    throw new Error(`Professional code not found for ownerId ${ownerId}`);
  }
  
  const professionalCode = user[0].assignmentCode;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const existingClients = await db.select({ newUniqueCode: clients.newUniqueCode })
        .from(clients)
        .where(and(
          eq(clients.ownerId, ownerId)
        ))
        .for('update');
      
      let maxSequence = 0;
      const pattern = new RegExp(`^${professionalCode}-(\\d+)$`);
      
      for (const client of existingClients) {
        if (client.newUniqueCode) {
          const match = client.newUniqueCode.match(pattern);
          if (match) {
            const sequence = parseInt(match[1], 10);
            if (sequence > maxSequence) {
              maxSequence = sequence;
            }
          }
        }
      }
      
      const nextSequence = maxSequence + 1;
      const paddedSequence = nextSequence.toString().padStart(3, '0');
      const clientCode = `${professionalCode}-${paddedSequence}`;
      
      console.log(`👤 [CLIENT-CODE] Generated: ${clientCode} (ownerId: ${ownerId}, max: ${maxSequence}, attempt: ${attempt})`);
      
      return clientCode;
      
    } catch (error: any) {
      if (error.code === '23505' && attempt < maxRetries) {
        console.log(`⚠️  [CLIENT-CODE] Duplicate detected, retry ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 50 * attempt));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error(`Unable to generate client code dopo ${maxRetries} tentativi`);
}

/**
 * Parse a client code in the format CODICE-XXX
 * 
 * @param clientCode - Code client (es: "BUS1422-001")
 * @returns Object with code and sequence
 */
export function parseClientCode(clientCode: string): { code: string; sequence: number } | null {
  const pattern = /^([A-Z0-9]+)-(\d+)$/;
  const match = clientCode.match(pattern);
  
  if (!match) {
    return null;
  }
  
  return {
    code: match[1],
    sequence: parseInt(match[2], 10)
  };
}
