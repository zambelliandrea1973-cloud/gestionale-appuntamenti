import { db } from '../db';
import { invoices, users } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Genera il prossimo numero fattura nel formato CODICE-XXX/ANNO
 * Es: BUS14-001/2025, BUS14-002/2025, etc.
 * 
 * Gestisce race conditions con unique index + retry logic
 * 
 * @param userId - ID del professionista
 * @param invoiceDate - Data fattura in formato YYYY-MM-DD
 * @param maxRetries - Numero massimo di tentativi (default: 5)
 * @returns Numero fattura formattato (es: "BUS14-001/2025")
 */
export async function generateInvoiceNumber(userId: number, invoiceDate: string, maxRetries: number = 5): Promise<string> {
  // 1. Recupera il codice univoco del professionista (cache questo per performance)
  const user = await db.select({ assignmentCode: users.assignmentCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user || user.length === 0 || !user[0].assignmentCode) {
    throw new Error(`Codice professionista non trovato per userId ${userId}`);
  }
  
  const professionalCode = user[0].assignmentCode;
  
  // 2. Estrai l'anno dalla data fattura
  const year = invoiceDate.split('-')[0];
  
  // 3. Loop con retry logic per gestire race conditions
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Trova il numero sequenziale massimo con locking transazionale
      const existingInvoices = await db.select({ invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(and(
          eq(invoices.userId, userId),
          sql`SUBSTRING(${invoices.invoiceNumber} FROM '/([0-9]{4})$') = ${year}`
        ))
        .for('update'); // LOCK FOR UPDATE: previene letture concorrenti
      
      // Estrai i numeri sequenziali ed trova il massimo
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
      
      // Incrementa e formatta con padding a 3 cifre
      const nextSequence = maxSequence + 1;
      const paddedSequence = nextSequence.toString().padStart(3, '0');
      const invoiceNumber = `${professionalCode}-${paddedSequence}/${year}`;
      
      console.log(`📊 [INVOICE-NUMBER] Generato: ${invoiceNumber} (userId: ${userId}, anno: ${year}, max: ${maxSequence}, attempt: ${attempt})`);
      
      return invoiceNumber;
      
    } catch (error: any) {
      // Se errore di duplicato (unique constraint), ritenta
      if (error.code === '23505' && attempt < maxRetries) {
        console.log(`⚠️  [INVOICE-NUMBER] Duplicato rilevato, retry ${attempt}/${maxRetries}...`);
        // Attendi un po' prima di ritentare (backoff esponenziale)
        await new Promise(resolve => setTimeout(resolve, 50 * attempt));
        continue;
      }
      // Altri errori o max retries raggiunti
      throw error;
    }
  }
  
  throw new Error(`Impossibile generare numero fattura dopo ${maxRetries} tentativi`);
}

/**
 * Parsifica un numero fattura nel formato CODICE-XXX/ANNO
 * 
 * @param invoiceNumber - Numero fattura (es: "BUS14-001/2025")
 * @returns Oggetto con codice, sequenza e anno
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
