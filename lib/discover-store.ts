import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const CONTENT_FILE = path.join(process.cwd(), 'data', 'discover-content.json');
const COLLECTIONS_FILE = path.join(process.cwd(), 'data', 'discover-collections.json');

export type DiscoverStatus = 'draft' | 'published' | 'featured' | 'archived';

export interface DiscoverContent {
  id: string;
  type: 'photo' | 'instagram_embed';
  // Photo URL (unsplash/creator) or thumbnail URL (instagram)
  url: string;
  thumbnail_url?: string;
  instagram_embed_html?: string;
  instagram_post_url?: string;
  creator_handle?: string;
  caption: string;
  description: string;
  region: string;
  region_name: string;
  category: string;
  tags: string[];
  aspect: number;
  featured: boolean;
  featured_order?: number;
  lat: number;
  lng: number;
  geo_label: string;
  location_name?: string;
  location_type?: string;
  status: DiscoverStatus;
  // legacy field kept for backwards compat with discover page
  source_type?: string;
  credit?: string;
  credit_url?: string;
  collection_ids?: string[];
  save_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DiscoverCollection {
  id: string;
  name: string;
  description: string;
  cover_image_url?: string;
  content_ids: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function migrateItem(raw: Record<string, unknown>): DiscoverContent {
  const featured = (raw.featured as boolean) ?? false;
  const isInstagram = !!(raw.instagram_embed_html || raw.instagram_post_url || raw.source_type === 'instagram');
  return {
    id: (raw.id as string) ?? uuidv4(),
    type: isInstagram ? 'instagram_embed' : 'photo',
    url: (raw.url as string) ?? '',
    thumbnail_url: (raw.thumbnail_url as string) ?? (raw.url as string) ?? undefined,
    instagram_embed_html: (raw.instagram_embed_html as string) ?? undefined,
    instagram_post_url: (raw.instagram_post_url as string) ?? undefined,
    creator_handle: (raw.creator_handle as string) ?? undefined,
    caption: (raw.caption as string) ?? '',
    description: (raw.description as string) ?? '',
    region: (raw.region as string) ?? '',
    region_name: (raw.region_name as string) ?? '',
    category: (raw.category as string) ?? 'nature',
    tags: (raw.tags as string[]) ?? [],
    aspect: (raw.aspect as number) ?? 1.0,
    featured: featured,
    featured_order: (raw.featured_order as number) ?? undefined,
    lat: (raw.lat as number) ?? 0,
    lng: (raw.lng as number) ?? 0,
    geo_label: (raw.geo_label as string) ?? '',
    location_name: (raw.location_name as string) ?? undefined,
    location_type: (raw.location_type as string) ?? undefined,
    status: (raw.status as DiscoverStatus) ?? (featured ? 'featured' : 'published'),
    source_type: (raw.source_type as string) ?? (isInstagram ? 'instagram' : 'unsplash'),
    credit: (raw.credit as string) ?? undefined,
    credit_url: (raw.credit_url as string) ?? undefined,
    collection_ids: (raw.collection_ids as string[]) ?? [],
    save_count: (raw.save_count as number) ?? 0,
    created_at: (raw.created_at as string) ?? new Date().toISOString(),
    updated_at: (raw.updated_at as string) ?? new Date().toISOString(),
  };
}

function readContent(): DiscoverContent[] {
  try {
    const raw = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'));
    return (raw as Record<string, unknown>[]).map(migrateItem);
  } catch {
    return [];
  }
}

function writeContent(items: DiscoverContent[]) {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(items, null, 2));
}

function readCollections(): DiscoverCollection[] {
  try {
    return JSON.parse(fs.readFileSync(COLLECTIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeCollections(collections: DiscoverCollection[]) {
  fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(collections, null, 2));
}

export function getAllContent(filters?: {
  status?: string;
  category?: string;
  region?: string;
  search?: string;
  limit?: number;
}): DiscoverContent[] {
  let items = readContent();

  if (filters?.status && filters.status !== 'all') {
    items = items.filter((i) => i.status === filters.status);
  }
  if (filters?.category && filters.category !== 'all') {
    items = items.filter((i) => i.category === filters.category);
  }
  if (filters?.region && filters.region !== 'all') {
    items = items.filter((i) => i.region === filters.region);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (i) =>
        i.caption.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.region_name.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (filters?.limit) {
    items = items.slice(0, filters.limit);
  }

  return items;
}

export function getContent(id: string): DiscoverContent | null {
  const items = readContent();
  return items.find((i) => i.id === id) ?? null;
}

export function createContent(data: Partial<DiscoverContent>): DiscoverContent {
  const items = readContent();
  const now = new Date().toISOString();
  const item = migrateItem({ ...data, id: uuidv4(), created_at: now, updated_at: now });
  items.unshift(item);
  writeContent(items);
  return item;
}

export function updateContent(id: string, data: Partial<DiscoverContent>): DiscoverContent | null {
  const items = readContent();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...data, id, updated_at: new Date().toISOString() };
  writeContent(items);
  return items[idx];
}

export function deleteContent(id: string): boolean {
  const items = readContent();
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;
  writeContent(filtered);
  return true;
}

export function reorderContent(ids: string[]): void {
  const items = readContent();
  const map = new Map(items.map((i) => [i.id, i]));
  const ordered: DiscoverContent[] = [];
  for (const id of ids) {
    const item = map.get(id);
    if (item) ordered.push(item);
  }
  for (const item of items) {
    if (!ids.includes(item.id)) ordered.push(item);
  }
  writeContent(ordered);
}

export function getCollections(): DiscoverCollection[] {
  return readCollections();
}

export function createCollection(data: Partial<DiscoverCollection>): DiscoverCollection {
  const collections = readCollections();
  const now = new Date().toISOString();
  const collection: DiscoverCollection = {
    id: uuidv4(),
    name: data.name ?? 'Untitled Collection',
    description: data.description ?? '',
    cover_image_url: data.cover_image_url,
    content_ids: data.content_ids ?? [],
    is_published: data.is_published ?? false,
    created_at: now,
    updated_at: now,
  };
  collections.push(collection);
  writeCollections(collections);
  return collection;
}

export function updateCollection(id: string, data: Partial<DiscoverCollection>): DiscoverCollection | null {
  const collections = readCollections();
  const idx = collections.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  collections[idx] = { ...collections[idx], ...data, id, updated_at: new Date().toISOString() };
  writeCollections(collections);
  return collections[idx];
}

export function deleteCollection(id: string): boolean {
  const collections = readCollections();
  const filtered = collections.filter((c) => c.id !== id);
  if (filtered.length === collections.length) return false;
  writeCollections(filtered);
  return true;
}
