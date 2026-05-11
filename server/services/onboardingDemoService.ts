import { db } from '../db';
import { clients, services, appointments, userSettings, companyNameSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// ─── Demo business profile ────────────────────────────────────────────────────
const BUSINESS_NAME = 'Studio Giulia Beauty';

// ─── Realistic Italian clients ────────────────────────────────────────────────
const DEMO_CLIENTS = [
  { firstName: 'Francesca', lastName: 'Moretti',   phone: '338 9876543', email: 'francesca.moretti@gmail.com',  notes: 'Allergia colori ossidativi' },
  { firstName: 'Lucia',     lastName: 'Esposito',  phone: '333 2345678', email: 'lucia.esposito@hotmail.it',    notes: 'Preferisce appuntamenti mattina' },
  { firstName: 'Anna',      lastName: 'Ferrari',   phone: '347 5678901', email: 'anna.ferrari@yahoo.it',        notes: '' },
  { firstName: 'Paola',     lastName: 'Romano',    phone: '335 3456789', email: 'paola.romano@gmail.com',       notes: 'Cliente fedele da 5 anni' },
  { firstName: 'Chiara',    lastName: 'Rizzo',     phone: '346 7890123', email: 'chiara.rizzo@libero.it',       notes: '' },
  { firstName: 'Marina',    lastName: 'Colombo',   phone: '334 4567890', email: 'marina.colombo@gmail.com',     notes: 'Capelli trattati, usare prodotti delicati' },
  { firstName: 'Elena',     lastName: 'Greco',     phone: '339 8901234', email: 'elena.greco@outlook.it',       notes: '' },
  { firstName: 'Sara',      lastName: 'Bianchi',   phone: '342 1234567', email: 'sara.bianchi@gmail.com',       notes: 'VIP – sconto fedeltà 10%' },
  { firstName: 'Roberto',   lastName: 'Ferretti',  phone: '348 6789012', email: 'roberto.ferretti@gmail.com',   notes: 'Taglio classico, ogni 3 settimane' },
  { firstName: 'Marco',     lastName: 'Conti',     phone: '345 3456780', email: 'marco.conti@yahoo.it',         notes: '' },
  { firstName: 'Valentina', lastName: 'De Luca',   phone: '340 9012345', email: 'valentina.deluca@gmail.com',   notes: '' },
  { firstName: 'Serena',    lastName: 'Galli',     phone: '331 7654321', email: 'serena.galli@libero.it',       notes: 'Sensibile al cuoio capelluto' },
];

// ─── Realistic services for a beauty & hair salon ────────────────────────────
const DEMO_SERVICES = [
  { name: 'Taglio + Piega',        duration: 60,  price: 45,  color: '#e91e63' },
  { name: 'Colorazione completa',  duration: 120, price: 90,  color: '#9c27b0' },
  { name: 'Meches / Colpi di sole',duration: 150, price: 110, color: '#ff9800' },
  { name: 'Manicure',              duration: 45,  price: 25,  color: '#f06292' },
  { name: 'Pedicure',              duration: 60,  price: 35,  color: '#4caf50' },
  { name: 'Trattamento viso',      duration: 60,  price: 55,  color: '#2196f3' },
];

// ─── Appointment helpers ──────────────────────────────────────────────────────
/** Format a Date as YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add minutes to a HH:MM string, return HH:MM */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Add calendar days to a date */
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Deterministic pseudo-random integer in [0, max) based on seed */
function seededRand(seed: number, max: number): number {
  return ((seed * 1664525 + 1013904223) & 0x7fffffff) % max;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Delete ALL demo-user data and re-seed with appointments that are always
 * centred around today (±28 days), so the calendar always looks live.
 */
export async function seedDemoData(userId: number): Promise<void> {
  try {
    // 1. Wipe existing data
    await db.delete(appointments).where(eq(appointments.userId, userId));
    await db.delete(clients).where(eq(clients.ownerId, userId));
    await db.delete(services).where(eq(services.userId, userId));

    // 2. Insert clients
    const insertedClients = await db
      .insert(clients)
      .values(
        DEMO_CLIENTS.map((c) => ({
          ...c,
          userId,
          ownerId: userId,
          hasConsent: true,
          isDemo: true,
        }))
      )
      .returning({ id: clients.id });

    const clientIds = insertedClients.map((r) => r.id);

    // 3. Insert services
    const insertedServices = await db
      .insert(services)
      .values(
        DEMO_SERVICES.map((s) => ({
          ...s,
          userId,
          onlineBooking: true,
          isDemo: true,
        }))
      )
      .returning({ id: services.id, duration: services.duration });

    const serviceRows = insertedServices; // [{id, duration}]

    // 4. Generate appointments ±28 days from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const DAY_SLOTS = ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30'];
    const apptValues: Array<typeof appointments.$inferInsert> = [];

    let clientCursor = 0;
    let svcCursor = 0;

    for (let offset = -28; offset <= 28; offset++) {
      const d = addDays(today, offset);
      const dow = d.getDay(); // 0=Sun

      // Close on Sundays
      if (dow === 0) continue;

      // Decide number of appointments for this day using a deterministic hash
      // Hash: mix offset and day-of-week to get stable variation
      const hash = seededRand(Math.abs(offset) * 13 + dow * 7, 10);
      let numSlots: number;
      if (hash < 2) {
        numSlots = 0;           // 20% rest day
      } else if (hash < 5) {
        numSlots = 2;           // 30% light day
      } else if (hash < 9) {
        numSlots = 3;           // 40% normal day
      } else {
        numSlots = 1;           // 10% single appt
      }

      // Saturdays are lighter
      if (dow === 6 && numSlots > 2) numSlots = 2;

      const daySlots = DAY_SLOTS.slice(0, numSlots);
      const dateStr = toDateStr(d);
      const isPast = offset < 0;

      for (const startTime of daySlots) {
        const svcRow = serviceRows[svcCursor % serviceRows.length];
        const endTime = addMinutes(startTime, svcRow.duration);
        const clientId = clientIds[clientCursor % clientIds.length];

        apptValues.push({
          userId,
          clientId,
          serviceId: svcRow.id,
          date: dateStr,
          startTime,
          endTime,
          status: isPast ? 'completed' : 'scheduled',
          reminderSent: isPast,
          reminderType: isPast ? (clientCursor % 2 === 0 ? 'whatsapp' : 'email') : null,
          reminderStatus: isPast ? 'sent' : 'pending',
          notes: null,
        });

        clientCursor++;
        svcCursor++;
      }
    }

    if (apptValues.length > 0) {
      await db.insert(appointments).values(apptValues);
    }

    // 5. Seed user settings (business profile) ─ upsert
    // NOTE: company-name-settings endpoint reads from preferences.companyName (JSON)
    const companyNamePrefs = {
      businessName: BUSINESS_NAME,
      showBusinessName: true,
      name: BUSINESS_NAME,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'normal',
      color: '#c2185b',
      enabled: true,
    };

    await db
      .insert(userSettings)
      .values({
        userId,
        businessName: BUSINESS_NAME,
        description: 'Salone di bellezza e cura dei capelli nel cuore di Milano.',
        contactPhone: '02 1234 5678',
        contactEmail: 'info@giuliabeauty.it',
        address: 'Via Montenapoleone 12, 20121 Milano',
        workingHoursStart: '09:00',
        workingHoursEnd: '19:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        preferences: { companyName: companyNamePrefs },
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          businessName: BUSINESS_NAME,
          description: 'Salone di bellezza e cura dei capelli nel cuore di Milano.',
          contactPhone: '02 1234 5678',
          contactEmail: 'info@giuliabeauty.it',
          address: 'Via Montenapoleone 12, 20121 Milano',
          workingHoursStart: '09:00',
          workingHoursEnd: '19:00',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        },
      });

    // Force-update preferences separately (json column needs explicit update)
    await db
      .update(userSettings)
      .set({ preferences: { companyName: companyNamePrefs } })
      .where(eq(userSettings.userId, userId));

    // 6. Seed company name header settings ─ delete + insert (no unique on userId)
    await db.delete(companyNameSettings).where(eq(companyNameSettings.userId, userId));
    await db.insert(companyNameSettings).values({
      userId,
      name: BUSINESS_NAME,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'normal',
      color: '#c2185b',
      enabled: true,
    });

    console.log(
      `🌱 [DEMO] Seed completato per user ${userId}: ` +
        `${clientIds.length} clienti, ${serviceRows.length} servizi, ${apptValues.length} appuntamenti`
    );
  } catch (err) {
    console.error(`⚠️ [DEMO] Errore seed per user ${userId}:`, err);
    throw err;
  }
}

/**
 * Auto-cleanup legacy helper — kept for backward compatibility but no-ops
 * since the demo account now uses full re-seed instead of partial cleanup.
 */
export async function cleanupDemoDataIfNeeded(
  _userId: number,
  _kind: 'clients' | 'services'
): Promise<void> {
  // No-op: demo uses full re-seed, not incremental cleanup
}
