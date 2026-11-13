import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';
import { db } from '../db';

const ACTIVITY_WRITE_INTERVAL_MS = 15 * 60 * 1000;
const MAX_CACHED_USERS = 5000;
const lastPersistedAt = new Map<number, number>();
const inFlight = new Map<number, Promise<void>>();

/**
 * Record real authenticated app use separately from login counting.
 * Writes are throttled per process; activity does not create login records.
 */
export async function recordProgramActivity(
  userId: number,
  database: any = db,
  now = new Date(),
): Promise<void> {
  const nowMs = now.getTime();
  const lastWrite = lastPersistedAt.get(userId);
  if (lastWrite !== undefined && nowMs - lastWrite < ACTIVITY_WRITE_INTERVAL_MS) return;

  const pending = inFlight.get(userId);
  if (pending) return pending;

  const write = database
    .update(users)
    .set({ lastProgramActivityAt: now })
    .where(eq(users.id, userId))
    .then(() => {
      lastPersistedAt.set(userId, nowMs);
      if (lastPersistedAt.size > MAX_CACHED_USERS) {
        lastPersistedAt.forEach((timestamp, cachedUserId) => {
          if (nowMs - timestamp > ACTIVITY_WRITE_INTERVAL_MS * 4) {
            lastPersistedAt.delete(cachedUserId);
          }
        });
      }
    })
    .finally(() => {
      inFlight.delete(userId);
    });

  inFlight.set(userId, write);
  return write;
}
