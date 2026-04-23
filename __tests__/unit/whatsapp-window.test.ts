/** @jest-environment node */
/**
 * Unit tests for 24-hour WhatsApp messaging window utilities.
 *
 * Verifies isWindowOpen() and getWindowStatus() against various
 * timestamps relative to the current time, including null/undefined
 * inputs and the exact 24-hour boundary.
 */

import { isWindowOpen, getWindowStatus } from '@/lib/whatsapp-window';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-04-23T12:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── isWindowOpen ────────────────────────────────────────────────────────────

describe('isWindowOpen', () => {
  it('returns true when the last customer message is 1 hour old', () => {
    expect(isWindowOpen(hoursAgo(1))).toBe(true);
  });

  it('returns true when the last customer message is 23 hours old', () => {
    expect(isWindowOpen(hoursAgo(23))).toBe(true);
  });

  it('returns false when the last customer message is 25 hours old', () => {
    expect(isWindowOpen(hoursAgo(25))).toBe(false);
  });

  it('returns false when lastCustomerMessageAt is null', () => {
    expect(isWindowOpen(null)).toBe(false);
  });

  it('returns false when lastCustomerMessageAt is undefined', () => {
    expect(isWindowOpen(undefined)).toBe(false);
  });

  it('returns false when lastCustomerMessageAt is an invalid date string', () => {
    expect(isWindowOpen('not-a-date')).toBe(false);
  });

  it('returns false when message is exactly 24 hours old (boundary)', () => {
    // Exactly 24h means elapsed === WINDOW_DURATION_MS, which is NOT < 24h
    const exactly24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isWindowOpen(exactly24h)).toBe(false);
  });

  it('returns true when message is 1ms under 24 hours old', () => {
    const justUnder = new Date(Date.now() - 24 * 60 * 60 * 1000 + 1).toISOString();
    expect(isWindowOpen(justUnder)).toBe(true);
  });
});

// ─── getWindowStatus ─────────────────────────────────────────────────────────

describe('getWindowStatus', () => {
  it('returns open=true with correct expiry for a recent message', () => {
    const ts = hoursAgo(1);
    const status = getWindowStatus(ts);

    expect(status.open).toBe(true);
    expect(status.expiresAt).toBeInstanceOf(Date);
    // 1h elapsed → 23h remaining → floor(23) = 23
    expect(status.hoursRemaining).toBe(23);
  });

  it('returns correct hoursRemaining for a 23-hour-old message', () => {
    const status = getWindowStatus(hoursAgo(23));

    expect(status.open).toBe(true);
    // 23h elapsed → 1h remaining → floor(1) = 1
    expect(status.hoursRemaining).toBe(1);
  });

  it('returns open=false and hoursRemaining=0 for expired window', () => {
    const status = getWindowStatus(hoursAgo(25));

    expect(status.open).toBe(false);
    expect(status.expiresAt).toBeInstanceOf(Date);
    expect(status.hoursRemaining).toBe(0);
  });

  it('returns null fields when lastCustomerMessageAt is null', () => {
    const status = getWindowStatus(null);

    expect(status.open).toBe(false);
    expect(status.expiresAt).toBeNull();
    expect(status.hoursRemaining).toBeNull();
  });

  it('returns null fields when lastCustomerMessageAt is undefined', () => {
    const status = getWindowStatus(undefined);

    expect(status.open).toBe(false);
    expect(status.expiresAt).toBeNull();
    expect(status.hoursRemaining).toBeNull();
  });

  it('calculates the correct expiresAt timestamp', () => {
    const sentAt = new Date('2026-04-23T10:00:00Z');
    const status = getWindowStatus(sentAt.toISOString());

    // 10:00 + 24h = next day 10:00 UTC
    expect(status.expiresAt!.toISOString()).toBe('2026-04-24T10:00:00.000Z');
    expect(status.open).toBe(true);
    // current time 12:00, sent at 10:00 → 2h elapsed → 22h remaining → floor(22) = 22
    expect(status.hoursRemaining).toBe(22);
  });

  it('returns open=false at exactly 24 hours (boundary)', () => {
    const exactly24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const status = getWindowStatus(exactly24h);

    expect(status.open).toBe(false);
    expect(status.hoursRemaining).toBe(0);
  });

  it('returns null fields for invalid date string', () => {
    const status = getWindowStatus('garbage');

    expect(status.open).toBe(false);
    expect(status.expiresAt).toBeNull();
    expect(status.hoursRemaining).toBeNull();
  });
});
