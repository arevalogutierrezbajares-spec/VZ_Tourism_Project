import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'scraped-listings.json');

// Simple mutex for concurrent write protection
let _writeLock = false;
const _writeQueue: Array<() => void> = [];

function acquireLock(): Promise<void> {
  return new Promise((resolve) => {
    if (!_writeLock) {
      _writeLock = true;
      resolve();
    } else {
      _writeQueue.push(resolve);
    }
  });
}

function releaseLock(): void {
  if (_writeQueue.length > 0) {
    const next = _writeQueue.shift()!;
    next();
  } else {
    _writeLock = false;
  }
}

export interface AdminListing {
  id: string;
  name: string;
  slug: string;
  type: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  region: string;
  city: string;
  address: string;
  avg_rating: number | null;
  review_count: number;
  phone: string | null;
  website: string | null;
  instagram_handle: string | null;
  google_place_id: string | null;
  cover_image_url: string | null;
  category_tags: string[];
  provider_id: string;
  status: string;
  platform_status?: string;
  featured?: boolean;
  price_level?: string;
  created_at: string | null;
  updated_at: string | null;
}

// Cache with invalidation
let _cache: AdminListing[] | null = null;

export function loadAll(): AdminListing[] {
  if (_cache) return _cache;
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  _cache = JSON.parse(raw) as AdminListing[];
  return _cache;
}

export function invalidateCache(): void {
  _cache = null;
  // Also invalidate local-listings cache
  try {
    // Dynamic require to avoid circular import
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ll = require('./local-listings');
    if (ll && typeof ll.invalidateCache === 'function') ll.invalidateCache();
  } catch {
    // ignore
  }
}

async function writeAll(listings: AdminListing[]): Promise<void> {
  await acquireLock();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(listings, null, 2), 'utf-8');
    invalidateCache();
  } finally {
    releaseLock();
  }
}

export async function updateListing(
  id: string,
  fields: Partial<AdminListing>
): Promise<AdminListing | null> {
  const listings = loadAll();
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  const updated = {
    ...listings[idx],
    ...fields,
    id, // never overwrite id
    updated_at: new Date().toISOString(),
  };
  listings[idx] = updated;
  await writeAll(listings);
  return updated;
}

export async function bulkUpdate(
  ids: string[],
  fields: Partial<AdminListing>
): Promise<number> {
  const listings = loadAll();
  const idSet = new Set(ids);
  let count = 0;
  for (let i = 0; i < listings.length; i++) {
    if (idSet.has(listings[i].id)) {
      listings[i] = {
        ...listings[i],
        ...fields,
        id: listings[i].id,
        updated_at: new Date().toISOString(),
      };
      count++;
    }
  }
  if (count > 0) await writeAll(listings);
  return count;
}

export async function deleteListing(id: string): Promise<boolean> {
  return (await bulkUpdate([id], { status: 'archived' })) > 0;
}

export function exportCSV(): string {
  const listings = loadAll();
  const headers = [
    'id', 'name', 'type', 'category', 'region', 'city', 'status',
    'avg_rating', 'review_count', 'phone', 'website', 'address',
    'cover_image_url', 'google_place_id', 'created_at',
  ];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = listings.map((l) =>
    headers.map((h) => escape(l[h as keyof AdminListing])).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
