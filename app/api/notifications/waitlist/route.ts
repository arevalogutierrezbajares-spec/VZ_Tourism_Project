import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const WAITLIST_FILE = path.join(process.cwd(), 'data', 'waitlist.json');

interface WaitlistEntry {
  email: string;
  listing_id: string;
  created_at: string;
}

function loadWaitlist(): WaitlistEntry[] {
  try {
    const raw = fs.readFileSync(WAITLIST_FILE, 'utf-8');
    return JSON.parse(raw) as WaitlistEntry[];
  } catch {
    return [];
  }
}

function saveWaitlist(entries: WaitlistEntry[]): void {
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, listing_id } = body as { email?: string; listing_id?: string };

  if (!email || !listing_id) {
    return NextResponse.json({ error: 'email and listing_id required' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }

  const entries = loadWaitlist();

  // Deduplicate: one entry per email+listing combo
  const exists = entries.some((e) => e.email === email && e.listing_id === listing_id);
  if (!exists) {
    entries.push({ email, listing_id, created_at: new Date().toISOString() });
    saveWaitlist(entries);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const entries = loadWaitlist();
  return NextResponse.json({ entries, count: entries.length });
}
