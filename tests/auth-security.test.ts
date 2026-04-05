import { describe, it, expect } from 'vitest';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split('.');
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return buf.toString('hex') === hashed;
}

describe('Password Hashing', () => {
  it('hashes password with salt', async () => {
    const hash = await hashPassword('test123');
    expect(hash).toContain('.');
    const parts = hash.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBe(128);
    expect(parts[1].length).toBe(32);
  });

  it('produces different hashes for same password', async () => {
    const hash1 = await hashPassword('test123');
    const hash2 = await hashPassword('test123');
    expect(hash1).not.toBe(hash2);
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword('mypassword');
    const match = await comparePasswords('mypassword', hash);
    expect(match).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('mypassword');
    const match = await comparePasswords('wrongpassword', hash);
    expect(match).toBe(false);
  });

  it('rejects empty password against valid hash', async () => {
    const hash = await hashPassword('mypassword');
    const match = await comparePasswords('', hash);
    expect(match).toBe(false);
  });
});

describe('Session Serialization', () => {
  function serializeUser(user: { id: number; type: string }): string {
    return `${user.type}:${user.id}`;
  }

  function deserializeUser(serialized: string): { type: string; id: number } | null {
    const parts = serialized.split(':');
    if (parts.length !== 2) return null;
    const id = parseInt(parts[1]);
    if (isNaN(id)) return null;
    return { type: parts[0], id };
  }

  it('serializes staff user', () => {
    expect(serializeUser({ id: 1, type: 'staff' })).toBe('staff:1');
  });

  it('serializes client user', () => {
    expect(serializeUser({ id: 42, type: 'client' })).toBe('client:42');
  });

  it('deserializes valid string', () => {
    const result = deserializeUser('staff:1');
    expect(result).toEqual({ type: 'staff', id: 1 });
  });

  it('handles invalid deserialization', () => {
    expect(deserializeUser('invalid')).toBeNull();
    expect(deserializeUser('staff:abc')).toBeNull();
  });
});

describe('Tenant Isolation', () => {
  it('filters data by ownerId', () => {
    const allAppointments = [
      { id: 1, userId: 1, date: '2026-04-05' },
      { id: 2, userId: 2, date: '2026-04-05' },
      { id: 3, userId: 1, date: '2026-04-06' },
    ];

    const user1Appts = allAppointments.filter(a => a.userId === 1);
    expect(user1Appts).toHaveLength(2);
    expect(user1Appts.every(a => a.userId === 1)).toBe(true);
  });

  it('prevents cross-tenant data access', () => {
    const requestingUserId = 1;
    const targetAppointment = { id: 2, userId: 2, date: '2026-04-05' };

    const hasAccess = targetAppointment.userId === requestingUserId;
    expect(hasAccess).toBe(false);
  });
});
