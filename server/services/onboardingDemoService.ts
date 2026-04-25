import { db } from '../db';
import { clients, services } from '../../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

const DEMO_CLIENTS = [
  {
    firstName: '[DEMO] Mario',
    lastName: 'Rossi',
    phone: '+39 333 1234567',
    email: 'mario.rossi.demo@example.com',
    notes: 'Cliente di esempio - puoi modificarlo o eliminarlo in qualsiasi momento.',
  },
  {
    firstName: '[DEMO] Giulia',
    lastName: 'Bianchi',
    phone: '+39 333 7654321',
    email: 'giulia.bianchi.demo@example.com',
    notes: 'Cliente di esempio - puoi modificarlo o eliminarlo in qualsiasi momento.',
  },
];

const DEMO_SERVICES = [
  { name: 'Consulenza', duration: 60, price: 100, color: '#3f51b5' },
  { name: 'Servizio A', duration: 30, price: 50, color: '#4caf50' },
  { name: 'Servizio B', duration: 45, price: 75, color: '#ff9800' },
];

/**
 * Seed demo clients and services for a newly registered user.
 * All seeded items are flagged isDemo=true so they can be auto-cleaned later.
 */
export async function seedDemoData(userId: number): Promise<void> {
  try {
    await db.insert(clients).values(
      DEMO_CLIENTS.map((c) => ({
        ...c,
        userId,
        ownerId: userId,
        hasConsent: true,
        isDemo: true,
      }))
    );

    await db.insert(services).values(
      DEMO_SERVICES.map((s) => ({
        ...s,
        userId,
        onlineBooking: true,
        isDemo: true,
      }))
    );

    console.log(`🌱 [onboardingDemoService] Demo data creata per utente ${userId}`);
  } catch (err) {
    console.error(`⚠️ [onboardingDemoService] Errore seeding demo data per utente ${userId}:`, err);
  }
}

/**
 * Auto-cleanup: delete all demo items of the given kind for the user
 * if at least one real (non-demo) item of that kind now exists.
 */
export async function cleanupDemoDataIfNeeded(
  userId: number,
  kind: 'clients' | 'services'
): Promise<void> {
  try {
    if (kind === 'clients') {
      const [{ realCount }] = await db
        .select({ realCount: sql<number>`count(*)::int` })
        .from(clients)
        .where(and(eq(clients.ownerId, userId), eq(clients.isDemo, false)));

      if (realCount > 0) {
        const deleted = await db
          .delete(clients)
          .where(and(eq(clients.ownerId, userId), eq(clients.isDemo, true)))
          .returning({ id: clients.id });
        if (deleted.length > 0) {
          console.log(`🧹 [onboardingDemoService] Rimossi ${deleted.length} clienti demo per utente ${userId}`);
        }
      }
    } else {
      const [{ realCount }] = await db
        .select({ realCount: sql<number>`count(*)::int` })
        .from(services)
        .where(and(eq(services.userId, userId), eq(services.isDemo, false)));

      if (realCount > 0) {
        const deleted = await db
          .delete(services)
          .where(and(eq(services.userId, userId), eq(services.isDemo, true)))
          .returning({ id: services.id });
        if (deleted.length > 0) {
          console.log(`🧹 [onboardingDemoService] Rimossi ${deleted.length} servizi demo per utente ${userId}`);
        }
      }
    }
  } catch (err) {
    console.error(`⚠️ [onboardingDemoService] Errore cleanup ${kind} per utente ${userId}:`, err);
  }
}
