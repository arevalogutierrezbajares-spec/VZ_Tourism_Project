/** @jest-environment node */
/**
 * Unit tests for isWithinWorkingHours().
 *
 * TDD RED phase: tests working hours logic with Venezuela timezone (UTC-4),
 * day-of-week matching, boundary conditions, and disabled states.
 */

import { isWithinWorkingHours } from '@/lib/whatsapp-hours';
import type { WaWorkingHours } from '@/types/database';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHours(overrides: Partial<WaWorkingHours> = {}): WaWorkingHours {
  const defaultDay = { active: true, start: '08:00', end: '20:00' };
  return {
    mon: { ...defaultDay },
    tue: { ...defaultDay },
    wed: { ...defaultDay },
    thu: { ...defaultDay },
    fri: { ...defaultDay },
    sat: { active: true, start: '09:00', end: '17:00' },
    sun: { active: false, start: '00:00', end: '00:00' },
    ...overrides,
  };
}

/**
 * Helper to mock Date.now() / new Date() to a specific UTC time.
 * Venezuela is UTC-4, so 14:00 UTC = 10:00 VZ time.
 */
function mockDateTime(utcIsoString: string) {
  const mockedDate = new Date(utcIsoString);
  jest.useFakeTimers();
  jest.setSystemTime(mockedDate);
}

afterEach(() => {
  jest.useRealTimers();
});

// ─── Disabled working hours ──────────────────────────────────────────────────

describe('isWithinWorkingHours — disabled', () => {
  test('returns true when working_hours_enabled is false', () => {
    const result = isWithinWorkingHours({
      working_hours_enabled: false,
      working_hours: makeHours(),
    });
    expect(result).toBe(true);
  });

  test('returns true when working_hours_enabled is undefined', () => {
    const result = isWithinWorkingHours({
      working_hours_enabled: undefined,
      working_hours: makeHours(),
    });
    expect(result).toBe(true);
  });

  test('returns true when working_hours is null', () => {
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: null,
    });
    expect(result).toBe(true);
  });
});

// ─── Active day, within hours ────────────────────────────────────────────────

describe('isWithinWorkingHours — within hours', () => {
  test('returns true during working hours on Monday (10:00 VZ = 14:00 UTC)', () => {
    // Monday 2026-04-20 14:00 UTC → Monday 10:00 VZ time
    mockDateTime('2026-04-20T14:00:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: makeHours(),
    });
    expect(result).toBe(true);
  });

  test('returns true at exact start time (08:00 VZ = 12:00 UTC)', () => {
    // Wednesday 2026-04-22 12:00 UTC → 08:00 VZ
    mockDateTime('2026-04-22T12:00:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: makeHours(),
    });
    expect(result).toBe(true);
  });

  test('returns true at exact end time (20:00 VZ = 00:00+1 UTC)', () => {
    // Thursday 2026-04-23 00:00 UTC = Wed 20:00 VZ
    mockDateTime('2026-04-23T00:00:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: makeHours(),
    });
    expect(result).toBe(true);
  });

  test('returns true on Saturday within its custom hours (12:00 VZ = 16:00 UTC)', () => {
    // Saturday 2026-04-25 16:00 UTC → 12:00 VZ
    mockDateTime('2026-04-25T16:00:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: makeHours(),
    });
    expect(result).toBe(true);
  });
});

// ─── Active day, outside hours ───────────────────────────────────────────────

describe('isWithinWorkingHours — outside hours', () => {
  test('returns false before opening (06:00 VZ = 10:00 UTC on Tuesday)', () => {
    // Tuesday 2026-04-21 10:00 UTC → 06:00 VZ
    mockDateTime('2026-04-21T10:00:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: makeHours(),
    });
    expect(result).toBe(false);
  });

  test('returns false after closing (22:00 VZ = 02:00+1 UTC on Friday)', () => {
    // Friday 22:00 VZ → Saturday 02:00 UTC
    mockDateTime('2026-04-25T02:00:00Z');
    // This is actually Friday in VZ (22:00), which is past the 20:00 end
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: makeHours(),
    });
    expect(result).toBe(false);
  });
});

// ─── Inactive day ────────────────────────────────────────────────────────────

describe('isWithinWorkingHours — inactive day', () => {
  test('returns false on Sunday (inactive) regardless of time', () => {
    // Sunday 2026-04-26 18:00 UTC → 14:00 VZ (would be in-hours on other days)
    mockDateTime('2026-04-26T18:00:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: makeHours(),
    });
    expect(result).toBe(false);
  });

  test('returns false when day config has active=false', () => {
    mockDateTime('2026-04-22T14:00:00Z'); // Wednesday 10:00 VZ
    const hours = makeHours({ wed: { active: false, start: '08:00', end: '20:00' } });
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: hours,
    });
    expect(result).toBe(false);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('isWithinWorkingHours — edge cases', () => {
  test('midnight boundary: 23:59 VZ on active day with end=23:59', () => {
    const hours = makeHours({ fri: { active: true, start: '00:00', end: '23:59' } });
    // Friday 23:59 VZ = Saturday 03:59 UTC
    mockDateTime('2026-04-25T03:59:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: hours,
    });
    expect(result).toBe(true);
  });

  test('narrow window: 12:00-12:30, message at 12:15', () => {
    const hours = makeHours({ mon: { active: true, start: '12:00', end: '12:30' } });
    // Monday 12:15 VZ = 16:15 UTC
    mockDateTime('2026-04-20T16:15:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: hours,
    });
    expect(result).toBe(true);
  });

  test('narrow window: 12:00-12:30, message at 12:45 → outside', () => {
    const hours = makeHours({ mon: { active: true, start: '12:00', end: '12:30' } });
    // Monday 12:45 VZ = 16:45 UTC
    mockDateTime('2026-04-20T16:45:00Z');
    const result = isWithinWorkingHours({
      working_hours_enabled: true,
      working_hours: hours,
    });
    expect(result).toBe(false);
  });
});
