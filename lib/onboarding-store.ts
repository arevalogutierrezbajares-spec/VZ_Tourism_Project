import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getAllListings, invalidateCache } from './local-listings';
import type { PlatformStatus } from './local-listings';

export interface RoomType {
  id: string;
  name: string;
  max_guests: number;
  price_usd: number;
  photo_url?: string;
}

export interface PaymentMethod {
  type: 'zelle' | 'usdt' | 'binance' | 'bank' | 'cash';
  details: string;
}

export interface OnboardingSession {
  id: string;
  business_id: string;
  slug: string;
  step: number; // 1-6, 7 = completed
  started_at: string;
  completed_at?: string;
  // Step 1: Verification
  verified_via?: 'phone' | 'instagram' | 'photo';
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_instagram?: string;
  verification_status?: 'pending' | 'verified' | 'manual_review';
  // Step 2: Listing details
  listing_name?: string;
  listing_description?: string;
  listing_category?: string;
  selected_photos?: string[];
  amenities?: string[];
  // Step 3: Rooms & pricing
  rooms?: RoomType[];
  // Step 4: Availability
  availability_type?: 'always' | 'specific';
  blocked_dates?: string[];
  min_stay?: number;
  max_guests_total?: number;
  // Step 5: Booking & payment
  booking_type?: 'instant' | 'request';
  cancellation_policy?: 'flexible' | 'moderate' | 'strict';
  checkin_time?: string;
  checkout_time?: string;
  payment_methods?: PaymentMethod[];
  status: 'in_progress' | 'completed' | 'abandoned';
}

const SESSIONS_FILE = path.join(process.cwd(), 'data', 'onboarding-sessions.json');

function readSessions(): OnboardingSession[] {
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw) as OnboardingSession[];
  } catch {
    return [];
  }
}

function writeSessions(sessions: OnboardingSession[]): void {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

export function getSession(slug: string): OnboardingSession | undefined {
  const sessions = readSessions();
  // Return the most recent in_progress or completed session for this slug
  return sessions
    .filter((s) => s.slug === slug)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
}

export function getSessionById(id: string): OnboardingSession | undefined {
  return readSessions().find((s) => s.id === id);
}

export function createSession(slug: string, businessId: string): OnboardingSession {
  const sessions = readSessions();
  const session: OnboardingSession = {
    id: uuidv4(),
    business_id: businessId,
    slug,
    step: 1,
    started_at: new Date().toISOString(),
    status: 'in_progress',
  };
  sessions.push(session);
  writeSessions(sessions);
  return session;
}

export function updateSession(slug: string, updates: Partial<OnboardingSession>): OnboardingSession | null {
  const sessions = readSessions();
  const idx = sessions.findLastIndex((s) => s.slug === slug && s.status === 'in_progress');
  if (idx === -1) return null;
  sessions[idx] = { ...sessions[idx], ...updates };
  writeSessions(sessions);
  return sessions[idx];
}

export function completeOnboarding(slug: string): OnboardingSession | null {
  const sessions = readSessions();
  const idx = sessions.findLastIndex((s) => s.slug === slug && s.status === 'in_progress');
  if (idx === -1) return null;

  sessions[idx].status = 'completed';
  sessions[idx].completed_at = new Date().toISOString();
  sessions[idx].step = 7;
  writeSessions(sessions);

  // Update the business in scraped-listings.json
  promoteToPlatform(slug, sessions[idx]);

  return sessions[idx];
}

function promoteToPlatform(slug: string, session: OnboardingSession): void {
  const listingsFile = path.join(process.cwd(), 'data', 'scraped-listings.json');
  try {
    const raw = fs.readFileSync(listingsFile, 'utf-8');
    const listings = JSON.parse(raw) as Record<string, unknown>[];
    const idx = listings.findIndex((l) => (l as { slug: string }).slug === slug);
    if (idx === -1) return;

    const listing = listings[idx] as Record<string, unknown>;
    listing.platform_status = 'founding_partner' as PlatformStatus;
    listing.updated_at = new Date().toISOString();

    if (session.listing_name) listing.name = session.listing_name;
    if (session.listing_description) listing.description = session.listing_description;
    if (session.listing_category) listing.category = session.listing_category;
    if (session.amenities) listing.amenities = session.amenities;
    if (session.rooms) listing.rooms = session.rooms;
    if (session.payment_methods) listing.payment_methods = session.payment_methods;
    if (session.booking_type) listing.booking_type = session.booking_type;
    if (session.checkin_time) listing.checkin_time = session.checkin_time;
    if (session.checkout_time) listing.checkout_time = session.checkout_time;
    if (session.min_stay) listing.min_stay = session.min_stay;
    if (session.max_guests_total) listing.max_guests = session.max_guests_total;
    if (session.cancellation_policy) listing.cancellation_policy = session.cancellation_policy;

    fs.writeFileSync(listingsFile, JSON.stringify(listings, null, 2), 'utf-8');
    invalidateCache();
  } catch {
    // Non-fatal: just log
    console.error('[onboarding-store] Failed to promote listing to platform');
  }
}

/** Compute regional price suggestion: average price of completed rooms in same region */
export function getRegionalPriceSuggestion(region: string): { min: number; max: number } {
  const sessions = readSessions().filter((s) => s.status === 'completed' && s.rooms?.length);
  const prices: number[] = [];
  for (const s of sessions) {
    const listings = getAllListings();
    const listing = listings.find((l) => l.slug === s.slug);
    if (listing?.region === region && s.rooms) {
      for (const r of s.rooms) {
        if (r.price_usd > 0) prices.push(r.price_usd);
      }
    }
  }
  if (prices.length < 2) return { min: 40, max: 120 };
  prices.sort((a, b) => a - b);
  return {
    min: Math.round(prices[Math.floor(prices.length * 0.25)]),
    max: Math.round(prices[Math.floor(prices.length * 0.75)]),
  };
}
