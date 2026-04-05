import { describe, it, expect } from 'vitest';

function detectConflict(
  existing: { startTime: string; endTime: string; roomId?: number | null; staffId?: number | null; status: string },
  newAppt: { startTime: string; endTime: string; roomId?: number | null; staffId?: number | null }
): boolean {
  if (existing.status === 'cancelled') return false;
  
  const overlapTime = existing.startTime < newAppt.endTime && existing.endTime > newAppt.startTime;
  if (!overlapTime) return false;
  
  if (newAppt.roomId && existing.roomId) {
    if (newAppt.roomId === existing.roomId) return true;
  }
  if (newAppt.staffId && existing.staffId) {
    if (newAppt.staffId === existing.staffId) return true;
  }
  
  if (!newAppt.roomId && !newAppt.staffId) return true;
  
  return false;
}

describe('Appointment Conflict Detection', () => {
  it('detects overlapping appointments for same room', () => {
    const existing = { startTime: '09:00', endTime: '10:00', roomId: 1, staffId: null, status: 'scheduled' };
    const newAppt = { startTime: '09:30', endTime: '10:30', roomId: 1, staffId: null };
    expect(detectConflict(existing, newAppt)).toBe(true);
  });

  it('allows non-overlapping appointments for same room', () => {
    const existing = { startTime: '09:00', endTime: '10:00', roomId: 1, staffId: null, status: 'scheduled' };
    const newAppt = { startTime: '10:00', endTime: '11:00', roomId: 1, staffId: null };
    expect(detectConflict(existing, newAppt)).toBe(false);
  });

  it('allows overlapping appointments in different rooms', () => {
    const existing = { startTime: '09:00', endTime: '10:00', roomId: 1, staffId: null, status: 'scheduled' };
    const newAppt = { startTime: '09:30', endTime: '10:30', roomId: 2, staffId: null };
    expect(detectConflict(existing, newAppt)).toBe(false);
  });

  it('detects overlapping appointments for same staff', () => {
    const existing = { startTime: '09:00', endTime: '10:00', roomId: null, staffId: 5, status: 'scheduled' };
    const newAppt = { startTime: '09:30', endTime: '10:30', roomId: null, staffId: 5 };
    expect(detectConflict(existing, newAppt)).toBe(true);
  });

  it('allows overlapping appointments for different staff', () => {
    const existing = { startTime: '09:00', endTime: '10:00', roomId: null, staffId: 5, status: 'scheduled' };
    const newAppt = { startTime: '09:30', endTime: '10:30', roomId: null, staffId: 6 };
    expect(detectConflict(existing, newAppt)).toBe(false);
  });

  it('ignores cancelled appointments', () => {
    const existing = { startTime: '09:00', endTime: '10:00', roomId: 1, staffId: null, status: 'cancelled' };
    const newAppt = { startTime: '09:00', endTime: '10:00', roomId: 1, staffId: null };
    expect(detectConflict(existing, newAppt)).toBe(false);
  });

  it('detects exact same time slot', () => {
    const existing = { startTime: '14:00', endTime: '15:00', roomId: 1, staffId: 3, status: 'scheduled' };
    const newAppt = { startTime: '14:00', endTime: '15:00', roomId: 1, staffId: 3 };
    expect(detectConflict(existing, newAppt)).toBe(true);
  });

  it('detects appointment fully contained within another', () => {
    const existing = { startTime: '09:00', endTime: '12:00', roomId: 1, staffId: null, status: 'scheduled' };
    const newAppt = { startTime: '10:00', endTime: '11:00', roomId: 1, staffId: null };
    expect(detectConflict(existing, newAppt)).toBe(true);
  });
});
