import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'outreach.json');

// Mutex for concurrent writes
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

export type OutreachChannel = 'whatsapp' | 'instagram' | 'email';
export type OutreachStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'responded'
  | 'interested'
  | 'declined'
  | 'converted';
export type ResponseClassification =
  | 'interested'
  | 'question'
  | 'not_interested'
  | 'uncertain'
  | null;

export interface OutreachRecord {
  id: string;
  business_id: string;
  business_name: string;
  business_type: string;
  business_region: string;
  channel: OutreachChannel;
  status: OutreachStatus;
  message_text: string;
  response_text: string | null;
  response_classification: ResponseClassification;
  sequence_step: number;
  sequence_name: string;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  notes: string;
}

let _cache: OutreachRecord[] | null = null;

export function loadAll(): OutreachRecord[] {
  if (_cache) return _cache;
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
    _cache = [];
    return _cache;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  _cache = JSON.parse(raw) as OutreachRecord[];
  return _cache;
}

export function invalidateCache(): void {
  _cache = null;
}

async function writeAll(records: OutreachRecord[]): Promise<void> {
  await acquireLock();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
    invalidateCache();
  } finally {
    releaseLock();
  }
}

export interface OutreachFilters {
  status?: string;
  channel?: string;
  business_id?: string;
  classification?: string;
  limit?: number;
  offset?: number;
}

export function query(filters: OutreachFilters = {}): OutreachRecord[] {
  let records = loadAll();

  if (filters.status && filters.status !== 'all') {
    records = records.filter((r) => r.status === filters.status);
  }
  if (filters.channel && filters.channel !== 'all') {
    records = records.filter((r) => r.channel === filters.channel);
  }
  if (filters.business_id) {
    records = records.filter((r) => r.business_id === filters.business_id);
  }
  if (filters.classification && filters.classification !== 'all') {
    records = records.filter((r) => r.response_classification === filters.classification);
  }

  // Sort newest first
  records = [...records].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 100;
  return records.slice(offset, offset + limit);
}

export function getStats() {
  const all = loadAll();
  const total = all.length;
  const queued = all.filter((r) => r.status === 'queued').length;
  const sent = all.filter((r) => r.status === 'sent' || r.status === 'delivered').length;
  const responded = all.filter((r) => r.status === 'responded').length;
  const interested = all.filter(
    (r) => r.status === 'interested' || r.response_classification === 'interested'
  ).length;
  const converted = all.filter((r) => r.status === 'converted').length;

  const sentTotal = sent + responded + interested + converted;
  const responseRate = sentTotal > 0 ? Math.round((responded / sentTotal) * 100) : 0;
  const conversionRate = sentTotal > 0 ? Math.round((converted / sentTotal) * 100) : 0;

  return { total, queued, sent, responded, interested, converted, responseRate, conversionRate };
}

export async function createRecord(
  fields: Omit<OutreachRecord, 'id' | 'created_at'>
): Promise<OutreachRecord> {
  const records = loadAll();
  const record: OutreachRecord = {
    ...fields,
    id: `out-${randomUUID().slice(0, 8)}`,
    created_at: new Date().toISOString(),
  };
  records.push(record);
  await writeAll(records);
  return record;
}

export async function updateRecord(
  id: string,
  fields: Partial<OutreachRecord>
): Promise<OutreachRecord | null> {
  const records = loadAll();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...fields, id };
  await writeAll(records);
  return records[idx];
}

export function getById(id: string): OutreachRecord | null {
  return loadAll().find((r) => r.id === id) ?? null;
}

export async function bulkCreate(
  items: Omit<OutreachRecord, 'id' | 'created_at'>[]
): Promise<OutreachRecord[]> {
  const records = loadAll();
  const now = new Date().toISOString();
  const created = items.map((fields) => ({
    ...fields,
    id: `out-${randomUUID().slice(0, 8)}`,
    created_at: now,
  }));
  records.push(...created);
  await writeAll(records);
  return created;
}
