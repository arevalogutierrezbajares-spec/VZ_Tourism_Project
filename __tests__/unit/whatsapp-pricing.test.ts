/**
 * Unit tests for the WhatsApp dynamic pricing engine.
 * applyPricingRules() is a pure function that computes prices the AI quotes
 * to guests — correctness here directly affects what guests are charged.
 */

import { applyPricingRules } from '@/lib/whatsapp-context';
import type { PricingRules } from '@/types/database';

// 2026-04-18 is a Saturday (UTC)
const SATURDAY = '2026-04-18';
// 2026-04-20 is a Monday
const MONDAY = '2026-04-21';
// Inside Semana Santa 2026 (Mar 29 – Apr 5)
const SEMANA_SANTA = '2026-04-02';

const SEMANA_SANTA_RULES: PricingRules = {
  seasonal_periods: [
    {
      name: 'Semana Santa',
      dates: [{ start: '2026-03-29', end: '2026-04-05' }],
      multiplier: 1.35,
    },
  ],
};

// ─── Baseline ─────────────────────────────────────────────────────────────────

test('no rules: returns base price unchanged', () => {
  expect(applyPricingRules(100, MONDAY, {})).toBe(100);
});

// ─── Seasonal uplift ──────────────────────────────────────────────────────────

test('seasonal: applies multiplier on dates inside window', () => {
  expect(applyPricingRules(100, SEMANA_SANTA, SEMANA_SANTA_RULES)).toBe(135);
});

test('seasonal: no uplift outside window', () => {
  expect(applyPricingRules(100, MONDAY, SEMANA_SANTA_RULES)).toBe(100);
});

test('seasonal: overlapping seasons — highest multiplier wins', () => {
  const rules: PricingRules = {
    seasonal_periods: [
      { name: 'Season A', dates: [{ start: '2026-04-01', end: '2026-04-10' }], multiplier: 1.2 },
      { name: 'Season B', dates: [{ start: '2026-04-01', end: '2026-04-10' }], multiplier: 1.4 },
    ],
  };
  // Should apply 1.4, not 1.2 or 1.2 × 1.4
  expect(applyPricingRules(100, '2026-04-05', rules)).toBe(140);
});

// ─── Weekend premium ──────────────────────────────────────────────────────────

test('weekend premium: applies on Saturday', () => {
  const rules: PricingRules = { weekend_premium: 0.2 };
  expect(applyPricingRules(100, SATURDAY, rules)).toBe(120);
});

test('weekend premium: no uplift on Monday', () => {
  const rules: PricingRules = { weekend_premium: 0.2 };
  expect(applyPricingRules(100, MONDAY, rules)).toBe(100);
});

// ─── Long-stay discounts ──────────────────────────────────────────────────────

test('long-stay: applies 7-night discount when stay >= 7', () => {
  const rules: PricingRules = {
    long_stay_discounts: [{ nights: 7, discount: 0.1 }],
  };
  expect(applyPricingRules(100, MONDAY, rules, 7)).toBe(90);
  expect(applyPricingRules(100, MONDAY, rules, 10)).toBe(90);
});

test('long-stay: no discount when stay < threshold', () => {
  const rules: PricingRules = {
    long_stay_discounts: [{ nights: 7, discount: 0.1 }],
  };
  expect(applyPricingRules(100, MONDAY, rules, 6)).toBe(100);
});

test('long-stay: highest qualifying threshold wins', () => {
  const rules: PricingRules = {
    long_stay_discounts: [
      { nights: 7, discount: 0.1 },
      { nights: 14, discount: 0.2 },
    ],
  };
  // 14+ nights → 20% off, not 10%
  expect(applyPricingRules(100, MONDAY, rules, 14)).toBe(80);
  expect(applyPricingRules(100, MONDAY, rules, 20)).toBe(80);
  // 7-13 nights → 10% off
  expect(applyPricingRules(100, MONDAY, rules, 7)).toBe(90);
});

// ─── Last-minute discount ─────────────────────────────────────────────────────

test('last-minute: applies when daysUntilCheckIn <= threshold', () => {
  const rules: PricingRules = {
    last_minute_discount: { days_before: 3, discount: 0.15 },
  };
  expect(applyPricingRules(100, MONDAY, rules, undefined, 2)).toBe(85);
  expect(applyPricingRules(100, MONDAY, rules, undefined, 3)).toBe(85);
});

test('last-minute: no discount when daysUntilCheckIn > threshold', () => {
  const rules: PricingRules = {
    last_minute_discount: { days_before: 3, discount: 0.15 },
  };
  expect(applyPricingRules(100, MONDAY, rules, undefined, 4)).toBe(100);
});

// ─── Rule stacking ────────────────────────────────────────────────────────────

test('seasonal + weekend stack multiplicatively', () => {
  const rules: PricingRules = {
    seasonal_periods: [
      { name: 'Peak', dates: [{ start: '2026-04-18', end: '2026-04-18' }], multiplier: 1.3 },
    ],
    weekend_premium: 0.2,
  };
  // base 100 × 1.3 (seasonal) × 1.2 (weekend) = 156
  expect(applyPricingRules(100, SATURDAY, rules)).toBe(156);
});

test('result is rounded to nearest dollar', () => {
  const rules: PricingRules = { weekend_premium: 0.15 };
  // 99 × 1.15 = 113.85 → rounds to 114
  expect(applyPricingRules(99, SATURDAY, rules)).toBe(114);
});
