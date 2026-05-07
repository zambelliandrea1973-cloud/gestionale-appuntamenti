import { db } from '../db';
import { invoices, users } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Generate the next invoice number in format CODICE-XXX/YEAR
 * Es: BUS14-001/2025, BUS14-002/2025, etc.
 * 
 * Handle race conditions with unique index + retry logic
 * 
 * @param userId - Professional ID
 * @param invoiceDate - Invoice date in format YYYY-MM-DD
 * @param maxRetries - Maximum number of attempts (default: 5)
 * @returns Formatted invoice number (e.g.: "BUS14-001/2025")
 */
export async function generateInvoiceNumber(userId: number, invoiceDate: string, maxRetries: number = 5): Promise<string> {
  // 1. Retrieve the unique professional code (cache this for performance)
  const user = await db.select({ assignmentCode: users.assignmentCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user || user.length === 0 || !user[0].assignmentCode) {
    throw new Error(`Professional code not found for userId ${userId}`);
  }
  
  const professionalCode = user[0].assignmentCode;
  
  // 2. Extract the year from the invoice date
  const year = invoiceDate.split('-')[0];
  
  // 3. Loop with retry logic to handle race conditions
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Find the maximum sequential number with transactional locking
      const existingInvoices = await db.select({ invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(and(
          eq(invoices.userId, userId),
          sql`SUBSTRING(${invoices.invoiceNumber} FROM '/([0-9]{4})$') = ${year}`
        ))
        .for('update'); // LOCK FOR UPDATE: prevents concurrent reads
      
      // Extract the sequential numbers and find the maximum
      let maxSequence = 0;
      const pattern = new RegExp(`^${professionalCode}-(\\d+)/${year}$`);
      
      for (const inv of existingInvoices) {
        const match = inv.invoiceNumber.match(pattern);
        if (match) {
          const sequence = parseInt(match[1], 10);
          if (sequence > maxSequence) {
            maxSequence = sequence;
          }
        }
      }
      
      // Increment and format with 3-digit padding
      const nextSequence = maxSequence + 1;
      const paddedSequence = nextSequence.toString().padStart(3, '0');
      const invoiceNumber = `${professionalCode}-${paddedSequence}/${year}`;
      
      console.log(`📊 [INVOICE-NUMBER] Generated: ${invoiceNumber} (userId: ${userId}, year: ${year}, max: ${maxSequence}, attempt: ${attempt})`);
      
      return invoiceNumber;
      
    } catch (error: any) {
      // If error di duplicato (unique constraint), ritenta
      if (error.code === '23505' && attempt < maxRetries) {
        console.log(`⚠️  [INVOICE-NUMBER] Duplicate detected, retry ${attempt}/${maxRetries}...`);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 50 * attempt));
        continue;
      }
      // Altri errors o max retries raggiunti
      throw error;
    }
  }
  
  throw new Error(`Unable to generate invoice number dopo ${maxRetries} tentativi`);
}

/**
 * Parse an invoice number in the format CODICE-XXX/YEAR
 * 
 * @param invoiceNumber - Number invoice (es: "BUS14-001/2025")
 * @returns Object with code, sequence and year
 */
export function parseInvoiceNumber(invoiceNumber: string): { code: string; sequence: number; year: string } | null {
  const pattern = /^([A-Z0-9]+)-(\d+)\/(\d{4})$/;
  const match = invoiceNumber.match(pattern);
  
  if (!match) {
    return null;
  }
  
  return {
    code: match[1],
    sequence: parseInt(match[2], 10),
    year: match[3]
  };
}
