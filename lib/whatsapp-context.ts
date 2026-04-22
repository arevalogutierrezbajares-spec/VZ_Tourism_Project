/**
 * Live context builder for WhatsApp AI concierge.
 *
 * Produces a "Live Property Data" block injected into every system prompt so
 * the AI can quote accurate, dynamic prices and real availability windows
 * without ever making up numbers.
 */

import { getAvailability, getRoomTypes } from './availability-store';
import type { PosadaKnowledge, PricingRules, PricingSeasonalPeriod } from '@/types/database';
import type { ServiceClient } from '@/types/supabase-client';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function isWeekend(dateStr: string): boolean {
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  return dow === 0 || dow === 6;
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (current <= last) {
    dates.push(toYMD(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) /
      86_400_000
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Pricing engine ───────────────────────────────────────────────────────────

/**
 * Applies pricing rules to a base price for a given date.
 * Returns the adjusted price (rounded to nearest dollar).
 */
export function applyPricingRules(
  basePrice: number,
  dateStr: string,
  rules: PricingRules,
  stayNights?: number,
  daysUntilCheckIn?: number
): number {
  let price = basePrice;

  // 1. Seasonal uplift (highest season wins if overlapping)
  if (rules.seasonal_periods?.length) {
    const activeSeasons = rules.seasonal_periods.filter((season) =>
      season.dates.some((range) => dateStr >= range.start && dateStr <= range.end)
    );
    if (activeSeasons.length > 0) {
      const maxMultiplier = Math.max(...activeSeasons.map((s) => s.multiplier));
      price *= maxMultiplier;
    }
  }

  // 2. Weekend premium
  if (rules.weekend_premium && rules.weekend_premium > 0 && isWeekend(dateStr)) {
    price *= 1 + rules.weekend_premium;
  }

  // 3. Long-stay discount (applied to all nights if total stay qualifies)
  if (stayNights != null && rules.long_stay_discounts?.length) {
    const applicable = rules.long_stay_discounts
      .filter((d) => stayNights >= d.nights)
      .sort((a, b) => b.nights - a.nights); // highest threshold wins
    if (applicable.length > 0) {
      price *= 1 - applicable[0]!.discount;
    }
  }

  // 4. Last-minute discount
  if (
    daysUntilCheckIn != null &&
    rules.last_minute_discount &&
    daysUntilCheckIn <= rules.last_minute_discount.days_before
  ) {
    price *= 1 - rules.last_minute_discount.discount;
  }

  return Math.round(price);
}

/**
 * Returns the name(s) of any active seasonal period for a given date.
 */
function getActiveSeasons(dateStr: string, periods: PricingSeasonalPeriod[]): string[] {
  return periods
    .filter((s) => s.dates.some((r) => dateStr >= r.start && dateStr <= r.end))
    .map((s) => s.name);
}

// ─── Availability summariser ──────────────────────────────────────────────────

interface AvailWindow {
  start: string;
  end: string;
  isAvailable: boolean;
}

/**
 * Collapses a day-by-day availability array into continuous windows.
 * e.g. [avail, avail, blocked, blocked, avail] → [{avail 0-1}, {blocked 2-3}, {avail 4}]
 */
function collapseWindows(
  entries: { date: string; is_available: boolean }[]
): AvailWindow[] {
  const windows: AvailWindow[] = [];
  for (const e of entries) {
    const last = windows[windows.length - 1];
    if (last && last.isAvailable === e.is_available) {
      last.end = e.date;
    } else {
      windows.push({ start: e.date, end: e.date, isAvailable: e.is_available });
    }
  }
  return windows;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds the Live Property Data block that gets injected into the system prompt.
 *
 * @param supabase  Service client for fetching listing IDs
 * @param providerId  The posada provider's ID
 * @param knowledge  The posada's knowledge base (for pricing_rules + room_types)
 * @returns  A formatted string ready to embed into the system prompt
 */
export async function buildLiveContext(
  supabase: ServiceClient,
  providerId: string,
  knowledge: PosadaKnowledge | null
): Promise<string> {
  const today = new Date();
  const todayStr = toYMD(today);
  const end60 = toYMD(addDays(today, 60));
  const rules: PricingRules = knowledge?.pricing_rules ?? {};
  const knowledgeRooms = knowledge?.room_types ?? [];

  const lines: string[] = [];
  const dayName = WEEKDAY_NAMES[today.getUTCDay()];
  lines.push(`## Live Property Data (as of ${dayName} ${formatDate(todayStr)})`);
  lines.push('');

  // ── Current seasons ────────────────────────────────────────────────────────
  const currentSeasons =
    rules.seasonal_periods?.length
      ? getActiveSeasons(todayStr, rules.seasonal_periods)
      : [];

  if (currentSeasons.length > 0) {
    lines.push(`Current season: **${currentSeasons.join(', ')}** (peak pricing active)`);
    lines.push('');
  }

  // ── Upcoming peak periods (next 60 days) ──────────────────────────────────
  if (rules.seasonal_periods?.length) {
    const upcoming = rules.seasonal_periods.flatMap((s) =>
      s.dates
        .filter((r) => r.end >= todayStr && r.start <= end60)
        .map((r) => ({
          name: s.name,
          start: r.start < todayStr ? todayStr : r.start,
          end: r.end > end60 ? end60 : r.end,
          multiplier: s.multiplier,
        }))
    );
    if (upcoming.length > 0) {
      lines.push('Upcoming peak periods (next 60 days):');
      for (const p of upcoming) {
        const pct = Math.round((p.multiplier - 1) * 100);
        lines.push(`  - ${p.name}: ${formatDate(p.start)} – ${formatDate(p.end)} (+${pct}% pricing)`);
      }
      lines.push('');
    }
  }

  // ── Pricing summary ────────────────────────────────────────────────────────
  if (knowledgeRooms.length > 0) {
    lines.push('### Room Pricing');

    for (const room of knowledgeRooms) {
      if (!room.price_usd) continue;
      const basePrice = room.price_usd;

      // Compute price for tonight (reflects any active seasons/weekend)
      const tonightPrice = applyPricingRules(basePrice, todayStr, rules);

      // Compute a peak-season price for the next upcoming season
      const nextPeakPrice =
        rules.seasonal_periods?.length
          ? (() => {
              const nextPeak = rules.seasonal_periods
                .flatMap((s) => s.dates.map((r) => ({ ...r, multiplier: s.multiplier })))
                .filter((r) => r.end >= todayStr)
                .sort((a, b) => a.start.localeCompare(b.start))[0];
              if (!nextPeak) return null;
              const peakDate = nextPeak.start >= todayStr ? nextPeak.start : todayStr;
              return applyPricingRules(basePrice, peakDate, rules);
            })()
          : null;

      let priceLine = `  - **${room.name}** (up to ${room.capacity} guests): $${tonightPrice}/night`;
      if (nextPeakPrice && nextPeakPrice !== tonightPrice) {
        priceLine += ` · up to $${nextPeakPrice}/night during peak season`;
      }
      if (room.description) priceLine += ` — ${room.description}`;
      lines.push(priceLine);
    }

    // Weekend premium note
    if (rules.weekend_premium && rules.weekend_premium > 0) {
      lines.push(
        `  _(+${Math.round(rules.weekend_premium * 100)}% on Fri/Sat nights)_`
      );
    }

    // Long-stay discounts
    if (rules.long_stay_discounts?.length) {
      const discountNotes = rules.long_stay_discounts
        .sort((a, b) => a.nights - b.nights)
        .map((d) => `${Math.round(d.discount * 100)}% off for ${d.nights}+ nights`);
      lines.push(`  _Discounts: ${discountNotes.join(' · ')}_`);
    }

    // Last-minute discount
    if (rules.last_minute_discount) {
      lines.push(
        `  _Last-minute deal: ${Math.round(rules.last_minute_discount.discount * 100)}% off if booked within ${rules.last_minute_discount.days_before} days of arrival_`
      );
    }

    lines.push('');
  }

  // ── Live availability ───────────────────────────────────────────────────────
  try {
    // Fetch listing IDs for this provider from Supabase
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title')
      .eq('provider_id', providerId)
      .limit(5);

    const end30 = toYMD(addDays(today, 30));

    if (listings?.length) {
      lines.push('### Availability (next 30 days)');

      for (const listing of listings) {
        // Try file store first (local dev), then fall back to Supabase
        let fileEntries: { date: string; is_available: boolean }[] = [];
        try {
          fileEntries = getAvailability(listing.id, todayStr, end30);
        } catch {
          // File store unavailable (serverless) — will use Supabase below
        }

        const hasFileData = fileEntries.some((e) => !e.is_available);

        if (hasFileData) {
          // File store has real data — use it
          const windows = collapseWindows(fileEntries);
          const blockedWindows = windows.filter((w) => !w.isAvailable);
          const availableDays = fileEntries.filter((e) => e.is_available).length;

          if (blockedWindows.length === 0) {
            lines.push(`  - **${listing.title}**: Fully available for the next 30 days`);
          } else {
            const blockedStr = blockedWindows
              .map((w) => {
                const nights = diffDays(w.start, w.end) + 1;
                return `${formatDate(w.start)}${w.start !== w.end ? `–${formatDate(w.end)}` : ''} (${nights}n)`;
              })
              .join(', ');
            lines.push(
              `  - **${listing.title}**: ${availableDays}/30 days available · Blocked: ${blockedStr}`
            );
          }

          // Also check room types from file store for overridden prices
          const fileRooms = getRoomTypes(listing.id);
          if (fileRooms.length > 0) {
            for (const fr of fileRooms) {
              const effectivePrice = applyPricingRules(fr.base_price, todayStr, rules);
              lines.push(
                `    • ${fr.name}: $${effectivePrice}/night (base $${fr.base_price})`
              );
            }
          }
        } else {
          // Fall back to Supabase availability + guest_bookings
          const [{ data: availRows }, { data: bookingRows }] = await Promise.all([
            supabase
              .from('availability')
              .select('date, is_available, price_override_usd, slots, booked_slots')
              .eq('listing_id', listing.id)
              .gte('date', todayStr)
              .lte('date', end30)
              .order('date'),
            supabase
              .from('guest_bookings')
              .select('check_in, check_out, guest_count, status, guest_name')
              .eq('listing_id', listing.id)
              .in('status', ['pending', 'confirmed'])
              .gte('check_out', todayStr)
              .lte('check_in', end30)
              .order('check_in'),
          ]);

          // Build a date→blocked map from explicit availability rows
          const blockedDates = new Set<string>();
          if (availRows?.length) {
            for (const row of availRows) {
              const dateStr = typeof row.date === 'string' ? row.date : toYMD(new Date(row.date));
              if (!row.is_available || (row.slots > 0 && row.booked_slots >= row.slots)) {
                blockedDates.add(dateStr);
              }
            }
          }

          // Also block dates that have confirmed/pending bookings
          if (bookingRows?.length) {
            for (const bk of bookingRows) {
              const ciStr = typeof bk.check_in === 'string' ? bk.check_in : toYMD(new Date(bk.check_in));
              const coStr = typeof bk.check_out === 'string' ? bk.check_out : toYMD(new Date(bk.check_out));
              // Block check_in through check_out - 1 (checkout day is free)
              const d = new Date(ciStr + 'T00:00:00Z');
              const coDate = new Date(coStr + 'T00:00:00Z');
              while (d < coDate) {
                blockedDates.add(toYMD(d));
                d.setUTCDate(d.getUTCDate() + 1);
              }
            }
          }

          if (blockedDates.size === 0) {
            lines.push(`  - **${listing.title}**: Fully available for the next 30 days`);
          } else {
            // Collapse blocked dates into windows
            const allDates = dateRange(todayStr, end30);
            const entries = allDates.map((date) => ({
              date,
              is_available: !blockedDates.has(date),
            }));
            const windows = collapseWindows(entries);
            const blockedWindows = windows.filter((w) => !w.isAvailable);
            const availableDays = entries.filter((e) => e.is_available).length;
            const blockedStr = blockedWindows
              .map((w) => {
                const nights = diffDays(w.start, w.end) + 1;
                return `${formatDate(w.start)}${w.start !== w.end ? `–${formatDate(w.end)}` : ''} (${nights}n)`;
              })
              .join(', ');
            lines.push(
              `  - **${listing.title}**: ${availableDays}/${allDates.length} days available · Booked: ${blockedStr}`
            );
          }

          // Show upcoming bookings so AI knows what's reserved
          if (bookingRows?.length) {
            lines.push(`  _Upcoming bookings:_`);
            for (const bk of bookingRows.slice(0, 5)) {
              const ci = formatDate(typeof bk.check_in === 'string' ? bk.check_in : toYMD(new Date(bk.check_in)));
              const co = formatDate(typeof bk.check_out === 'string' ? bk.check_out : toYMD(new Date(bk.check_out)));
              lines.push(`    • ${ci} – ${co}: ${bk.guest_count} guest${bk.guest_count > 1 ? 's' : ''} (${bk.status})`);
            }
          }
        }
      }
      lines.push('');
    } else {
      // No listings in DB — check guest_bookings by provider_id directly
      const { data: providerBookings } = await supabase
        .from('guest_bookings')
        .select('check_in, check_out, guest_count, status, guest_name')
        .eq('provider_id', providerId)
        .in('status', ['pending', 'confirmed'])
        .gte('check_out', todayStr)
        .lte('check_in', end30)
        .order('check_in');

      lines.push('### Availability (next 30 days)');

      if (providerBookings?.length) {
        // Build blocked dates from bookings
        const blockedDates = new Set<string>();
        for (const bk of providerBookings) {
          const ciStr = typeof bk.check_in === 'string' ? bk.check_in : toYMD(new Date(bk.check_in));
          const coStr = typeof bk.check_out === 'string' ? bk.check_out : toYMD(new Date(bk.check_out));
          const d = new Date(ciStr + 'T00:00:00Z');
          const coDate = new Date(coStr + 'T00:00:00Z');
          while (d < coDate) {
            blockedDates.add(toYMD(d));
            d.setUTCDate(d.getUTCDate() + 1);
          }
        }

        const allDates = dateRange(todayStr, end30);
        const availableDays = allDates.filter((d) => !blockedDates.has(d)).length;
        lines.push(`  - ${availableDays}/${allDates.length} days available`);
        lines.push(`  _Upcoming bookings:_`);
        for (const bk of providerBookings.slice(0, 5)) {
          const ci = formatDate(typeof bk.check_in === 'string' ? bk.check_in : toYMD(new Date(bk.check_in)));
          const co = formatDate(typeof bk.check_out === 'string' ? bk.check_out : toYMD(new Date(bk.check_out)));
          lines.push(`    • ${ci} – ${co}: ${bk.guest_count} guest${bk.guest_count > 1 ? 's' : ''} (${bk.status})`);
        }
      } else {
        lines.push('  - No current bookings — all rooms appear available for the next 30 days.');
        if (knowledgeRooms.length > 0) {
          lines.push('  _Rooms:_');
          for (const room of knowledgeRooms) {
            lines.push(`    • ${room.name}: up to ${room.capacity} guests — $${room.price_usd}/night`);
          }
        }
      }
      lines.push('');
    }
  } catch {
    // Availability data unavailable — silently skip
  }

  // ── Pricing guidance for the AI ───────────────────────────────────────────
  lines.push('### Pricing guidance');
  lines.push('- Quote the prices shown above (already adjusted for current season/weekend).');
  lines.push('- For specific date ranges requested by the guest, mention any peak-season uplift that applies.');
  if (rules.long_stay_discounts?.length) {
    lines.push('- Proactively mention long-stay discounts when guests mention multi-week stays.');
  }
  if (rules.last_minute_discount) {
    lines.push('- Mention the last-minute discount if the guest is asking about immediate travel.');
  }
  lines.push('- Never invent prices. If uncertain, say you\'ll confirm with the team.');

  return lines.join('\n');
}
