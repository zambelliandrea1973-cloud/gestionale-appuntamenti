/**
 * Servizio per la gestione del sistema di referral
 */
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, and, isNull, gt, lte, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Quanti codici di referral devono essere generati prima che inizi la commissione
const MIN_REFERRALS_FOR_COMMISSION = 3;

// Valore della commissione mensile in centesimi (1€)
const MONTHLY_COMMISSION_AMOUNT = 100;

/**
 * Genera un codice di referral univoco per un utente
 */
export async function generateReferralCode(userId: number): Promise<string> {
  // Genera un codice di 8 caratteri, univoco nel database
  let code = nanoid(8).toUpperCase();
  let isUnique = false;

  while (!isUnique) {
    // Verifica che il codice non esista già
    const existingUser = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.referralCode, code))
      .limit(1);
    
    isUnique = existingUser.length === 0;
    
    // Se non è univoco, genera un nuovo codice
    if (!isUnique) {
      code = nanoid(8).toUpperCase();
    }
  }
  
  // Salva il nuovo codice nel database
  await db
    .update(schema.users)
    .set({ referralCode: code })
    .where(eq(schema.users.id, userId));
  
  return code;
}

/**
 * Registra un nuovo utente come referral di un altro utente
 */
export async function registerReferral(referrerCode: string, newUserId: number): Promise<boolean> {
  try {
    // Trova l'utente che ha generato il codice
    const referrer = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.referralCode, referrerCode))
      .limit(1);
    
    if (referrer.length === 0) {
      console.log(`Nessun utente trovato con il codice referral: ${referrerCode}`);
      return false;
    }
    
    const referrerId = referrer[0].id;
    
    // Associa l'utente referrer al nuovo utente
    await db
      .update(schema.users)
      .set({ referredBy: referrerId })
      .where(eq(schema.users.id, newUserId));
      
    console.log(`Utente ${newUserId} registrato come referral di ${referrerId}`);
    return true;
  } catch (error) {
    console.error('Errore nella registrazione del referral:', error);
    return false;
  }
}

/**
 * Verifica se un utente ha raggiunto il numero minimo di referral per la commissione
 */
export async function hasMinReferrals(userId: number): Promise<boolean> {
  const referrals = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.referredBy, userId));
  
  return referrals.length >= MIN_REFERRALS_FOR_COMMISSION;
}

/**
 * Crea una nuova commissione per un utente che ha fatto referral
 */
export async function createCommission(
  referrerId: number, 
  referredId: number,
  subscriptionId: number
): Promise<schema.ReferralCommission | null> {
  try {
    // Verifica che l'utente abbia almeno 3 referral prima di iniziare a guadagnare
    const hasMinimum = await hasMinReferrals(referrerId);
    if (!hasMinimum) {
      console.log(`L'utente ${referrerId} non ha ancora ${MIN_REFERRALS_FOR_COMMISSION} referral. Non viene creata commissione.`);
      return null;
    }
    
    // Crea la commissione
    const [commission] = await db
      .insert(schema.referralCommissions)
      .values({
        referrerId,
        referredId,
        subscriptionId,
        monthlyAmount: MONTHLY_COMMISSION_AMOUNT,
        status: 'active'
      })
      .returning();
    
    return commission;
  } catch (error) {
    console.error('Errore nella creazione della commissione:', error);
    return null;
  }
}

/**
 * Ottiene tutte le commissioni attive per un utente
 */
export async function getActiveCommissions(userId: number): Promise<schema.ReferralCommission[]> {
  return db
    .select()
    .from(schema.referralCommissions)
    .where(
      and(
        eq(schema.referralCommissions.referrerId, userId),
        eq(schema.referralCommissions.status, 'active')
      )
    );
}

/**
 * Calcola il totale delle commissioni per un utente in un periodo specifico
 */
export async function calculateCommissionsForPeriod(
  userId: number, 
  period: string // formato: "YYYY-MM"
): Promise<number> {
  const commissions = await getActiveCommissions(userId);
  let total = 0;
  
  // Verifica per ogni commissione se è attiva nel periodo specificato
  for (const commission of commissions) {
    const [year, month] = period.split('-').map(p => parseInt(p));
    const periodDate = new Date(year, month - 1, 1); // Mese è 0-indexed in JavaScript
    
    const startDate = new Date(commission.startDate);
    const endDate = commission.endDate ? new Date(commission.endDate) : null;
    
    // La commissione è attiva se è iniziata prima della fine del periodo
    // e non è terminata o è terminata dopo l'inizio del periodo
    if (startDate <= endOfMonth(periodDate) && (!endDate || endDate >= startOfMonth(periodDate))) {
      total += commission.monthlyAmount;
    }
  }
  
  return total;
}

/**
 * Genera il pagamento per le commissioni di un periodo
 */
export async function generatePaymentForPeriod(
  userId: number, 
  period: string // formato: "YYYY-MM"
): Promise<schema.ReferralPayment | null> {
  try {
    // Verifica se esiste già un pagamento per questo periodo
    const existingPayment = await db
      .select()
      .from(schema.referralPayments)
      .where(
        and(
          eq(schema.referralPayments.userId, userId),
          eq(schema.referralPayments.period, period)
        )
      )
      .limit(1);
    
    if (existingPayment.length > 0) {
      console.log(`Pagamento già esistente per l'utente ${userId} nel periodo ${period}`);
      return existingPayment[0];
    }
    
    // Calcola l'importo totale delle commissioni per il periodo
    const amount = await calculateCommissionsForPeriod(userId, period);
    
    // Se non ci sono commissioni, non generare un pagamento
    if (amount === 0) {
      console.log(`Nessuna commissione da pagare per l'utente ${userId} nel periodo ${period}`);
      return null;
    }
    
    // Crea il pagamento
    const [payment] = await db
      .insert(schema.referralPayments)
      .values({
        userId,
        amount,
        status: 'pending',
        period,
      })
      .returning();
    
    // Aggiorna lastPaidPeriod per tutte le commissioni attive
    await db
      .update(schema.referralCommissions)
      .set({ lastPaidPeriod: period })
      .where(
        and(
          eq(schema.referralCommissions.referrerId, userId),
          eq(schema.referralCommissions.status, 'active')
        )
      );
    
    return payment;
  } catch (error) {
    console.error('Errore nella generazione del pagamento:', error);
    return null;
  }
}

/**
 * Ottieni i dati del conto bancario per un utente
 */
export async function getBankAccount(userId: number): Promise<schema.BankAccount | null> {
  const accounts = await db
    .select()
    .from(schema.bankAccounts)
    .where(eq(schema.bankAccounts.userId, userId))
    .orderBy(desc(schema.bankAccounts.isDefault));
  
  return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Salva un nuovo conto bancario per un utente
 */
export async function saveBankAccount(
  userId: number,
  data: Omit<schema.InsertBankAccount, 'userId'>
): Promise<schema.BankAccount | null> {
  try {
    // Se è impostato come predefinito, rimuovi il flag predefinito dagli altri conti
    if (data.isDefault) {
      await db
        .update(schema.bankAccounts)
        .set({ isDefault: false })
        .where(eq(schema.bankAccounts.userId, userId));
    }
    
    // Verifica se l'utente ha già un conto bancario
    const existingAccount = await db
      .select()
      .from(schema.bankAccounts)
      .where(eq(schema.bankAccounts.userId, userId))
      .limit(1);
    
    // Se esiste, aggiorna il conto esistente
    if (existingAccount.length > 0) {
      const [account] = await db
        .update(schema.bankAccounts)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(schema.bankAccounts.userId, userId))
        .returning();
      
      return account;
    }
    
    // Altrimenti crea un nuovo conto
    const [account] = await db
      .insert(schema.bankAccounts)
      .values({
        userId,
        ...data
      })
      .returning();
    
    return account;
  } catch (error) {
    console.error('Errore nel salvataggio del conto bancario:', error);
    return null;
  }
}