import fs from 'fs';
import path from 'path';

export type ProviderStage = 'lead' | 'contacted' | 'interested' | 'call_scheduled' | 'onboarding' | 'live';
export type ProviderTier = 'A' | 'B' | 'C';

export interface ProviderNote {
  id: string;
  text: string;
  created_at: string;
}

export interface ContactHistoryEntry {
  type: 'email' | 'phone' | 'whatsapp';
  date: string;
  note: string;
}

export interface PipelineProvider {
  id: string;
  business_id: string;
  business_name: string;
  type: string;
  region: string;
  stage: ProviderStage;
  tier: ProviderTier;
  entered_stage_at: string;
  phone?: string | null;
  cover_image_url?: string | null;
  avg_rating?: number | null;
  notes: ProviderNote[];
  contact_history: ContactHistoryEntry[];
  assigned_to: string | null;
  created_at: string;
}

const DATA_PATH = path.join(process.cwd(), 'data', 'providers-pipeline.json');

function readStore(): PipelineProvider[] {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    const raw = fs.readFileSync(DATA_PATH, 'utf-8').trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStore(providers: PipelineProvider[]): void {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(providers, null, 2));
}

export function getAllProviders(): PipelineProvider[] {
  return readStore();
}

export function getProvidersByStage(stage: ProviderStage): PipelineProvider[] {
  return readStore().filter((p) => p.stage === stage);
}

export function getProvider(id: string): PipelineProvider | null {
  return readStore().find((p) => p.id === id) || null;
}

export function createProvider(data: Omit<PipelineProvider, 'id' | 'created_at'>): PipelineProvider {
  const providers = readStore();
  const now = new Date().toISOString();
  const newProvider: PipelineProvider = {
    ...data,
    id: `pp_${Date.now()}`,
    created_at: now,
  };
  providers.push(newProvider);
  writeStore(providers);
  return newProvider;
}

export function updateProvider(
  id: string,
  updates: Partial<Omit<PipelineProvider, 'id' | 'created_at'>>
): PipelineProvider | null {
  const providers = readStore();
  const idx = providers.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  providers[idx] = { ...providers[idx]!, ...updates };
  writeStore(providers);
  return providers[idx]!;
}

export function moveProviderToStage(id: string, stage: ProviderStage): PipelineProvider | null {
  return updateProvider(id, { stage, entered_stage_at: new Date().toISOString() });
}

export function addNote(id: string, text: string): PipelineProvider | null {
  const provider = getProvider(id);
  if (!provider) return null;
  const note: ProviderNote = {
    id: `n${Date.now()}`,
    text,
    created_at: new Date().toISOString(),
  };
  return updateProvider(id, { notes: [...provider.notes, note] });
}

export function addContactHistory(
  id: string,
  entry: Omit<ContactHistoryEntry, 'date'>
): PipelineProvider | null {
  const provider = getProvider(id);
  if (!provider) return null;
  const histEntry: ContactHistoryEntry = { ...entry, date: new Date().toISOString() };
  return updateProvider(id, {
    contact_history: [...provider.contact_history, histEntry],
  });
}
