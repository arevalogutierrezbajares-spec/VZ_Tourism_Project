/**
 * 24-hour WhatsApp messaging window utilities.
 *
 * Meta's WhatsApp Cloud API enforces a "customer service window": free-form
 * (session) messages can only be sent within 24 hours of the customer's last
 * inbound message.  After the window expires, only pre-approved template
 * messages are allowed.
 *
 * @see https://developers.facebook.com/docs/whatsapp/conversation-types
 */

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Returns `true` when the 24-hour customer service window is still open.
 *
 * - `null` / `undefined` → window is closed (no inbound message recorded).
 * - Timestamp older than 24 h → window is closed.
 * - Timestamp within 24 h (inclusive) → window is open.
 */
export function isWindowOpen(lastCustomerMessageAt: string | null | undefined): boolean {
  if (!lastCustomerMessageAt) return false;

  const sentAt = new Date(lastCustomerMessageAt).getTime();
  if (Number.isNaN(sentAt)) return false;

  return Date.now() - sentAt < WINDOW_DURATION_MS;
}

export interface WindowStatus {
  /** Whether free-form messages can be sent right now. */
  open: boolean;
  /** Absolute UTC timestamp when the window expires (null if never opened). */
  expiresAt: Date | null;
  /** Approximate whole hours remaining, clamped to 0 (null if never opened). */
  hoursRemaining: number | null;
}

/**
 * Returns detailed window status — useful for operator-facing UI.
 */
export function getWindowStatus(lastCustomerMessageAt: string | null | undefined): WindowStatus {
  if (!lastCustomerMessageAt) {
    return { open: false, expiresAt: null, hoursRemaining: null };
  }

  const sentAt = new Date(lastCustomerMessageAt).getTime();
  if (Number.isNaN(sentAt)) {
    return { open: false, expiresAt: null, hoursRemaining: null };
  }

  const expiresAtMs = sentAt + WINDOW_DURATION_MS;
  const expiresAt = new Date(expiresAtMs);
  const remainingMs = expiresAtMs - Date.now();

  if (remainingMs <= 0) {
    return { open: false, expiresAt, hoursRemaining: 0 };
  }

  const hoursRemaining = Math.floor(remainingMs / (60 * 60 * 1000));
  return { open: true, expiresAt, hoursRemaining };
}
