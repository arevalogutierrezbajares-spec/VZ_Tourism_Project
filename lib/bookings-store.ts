import fs from 'fs';
import path from 'path';
import type { BookingStatus } from '@/types/database';

export type { BookingStatus };
export type PaymentMethod = 'card' | 'zelle' | 'usdt' | 'arrival';

export interface LocalBooking {
  id: string;
  listing_id: string;
  listing_name: string;
  listing_slug?: string;
  provider_id?: string;
  provider_name?: string;
  provider_whatsapp?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  base_price_usd: number;
  nights: number;
  subtotal_usd: number;
  service_fee_usd: number;
  total_usd: number;
  commission_usd: number;
  net_provider_usd: number;
  status: BookingStatus;
  payment_method: PaymentMethod;
  payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  confirmation_code: string;
  special_requests?: string;
  notes?: string;
  discount_code_id?: string;
  discount_amount_usd?: number;
  created_at: string;
  updated_at: string;
}

const DATA_PATH = path.join(process.cwd(), 'data', 'bookings.json');

function readStore(): LocalBooking[] {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    const raw = fs.readFileSync(DATA_PATH, 'utf-8').trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStore(bookings: LocalBooking[]): void {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(bookings, null, 2));
}

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'VZ-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createBooking(
  data: Omit<LocalBooking, 'id' | 'confirmation_code' | 'created_at' | 'updated_at'>
): LocalBooking {
  const bookings = readStore();
  const now = new Date().toISOString();
  const newBooking: LocalBooking = {
    ...data,
    id: crypto.randomUUID(),
    confirmation_code: generateConfirmationCode(),
    created_at: now,
    updated_at: now,
  };
  bookings.push(newBooking);
  writeStore(bookings);
  return newBooking;
}

export function getBooking(id: string): LocalBooking | null {
  return readStore().find((b) => b.id === id) || null;
}

export function updateBookingStatus(
  id: string,
  status: BookingStatus,
  extra: Partial<LocalBooking> = {}
): LocalBooking | null {
  const bookings = readStore();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], ...extra, status, updated_at: new Date().toISOString() };
  writeStore(bookings);
  return bookings[idx];
}

export function updateBookingBySessionId(
  sessionId: string,
  status: BookingStatus,
  extra: Partial<LocalBooking> = {}
): LocalBooking | null {
  const bookings = readStore();
  const idx = bookings.findIndex((b) => b.stripe_checkout_session_id === sessionId);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], ...extra, status, updated_at: new Date().toISOString() };
  writeStore(bookings);
  return bookings[idx];
}

export function getBookingsByEmail(email: string): LocalBooking[] {
  return readStore().filter((b) => b.guest_email === email);
}

export function getBookingsByListingIds(listingIds: string[]): LocalBooking[] {
  if (listingIds.length === 0) return readStore();
  return readStore().filter((b) => listingIds.includes(b.listing_id));
}

export function getAllBookings(): LocalBooking[] {
  return readStore();
}
