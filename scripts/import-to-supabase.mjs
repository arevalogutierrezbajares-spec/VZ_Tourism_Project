import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xuxmqpbddtajfiuogbov.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const raw = JSON.parse(readFileSync('data/scraped-listings.json', 'utf8'));
console.log(`Read ${raw.length} listings from JSON`);

// Map scraped type → category bucket
function mapCategory(type, category) {
  const t = (type || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (t === 'restaurante' || c.includes('restaur') || c.includes('gastro') || c.includes('food')) return 'gastronomy';
  if (t === 'hotel' || c.includes('hotel') || c.includes('hospedaje') || c.includes('hostal') || c.includes('lodge')) return 'cities';
  if (c.includes('playa') || c.includes('beach') || c.includes('costa')) return 'beaches';
  if (c.includes('monta') || c.includes('sierra') || c.includes('andes') || c.includes('peak')) return 'mountains';
  if (c.includes('eco') || c.includes('selva') || c.includes('jungle') || c.includes('nature')) return 'eco-tours';
  if (c.includes('bienestar') || c.includes('spa') || c.includes('wellness') || c.includes('salud')) return 'wellness';
  if (c.includes('cultural') || c.includes('museos') || c.includes('historia') || c.includes('heritage')) return 'cultural';
  if (t === 'tours' || c.includes('aventura') || c.includes('adventure') || c.includes('tour')) return 'adventure';
  return 'cities'; // safe fallback
}

// Deduplicate by slug
const seen = new Set();
const unique = raw.filter(l => {
  if (!l.slug || seen.has(l.slug)) return false;
  seen.add(l.slug);
  return true;
});
console.log(`${unique.length} unique slugs after dedup`);

// Map to Supabase schema
const listings = unique.map(l => ({
  id: l.id,  // preserve original UUIDs from scraped data
  title: l.name || 'Unnamed',
  slug: l.slug,
  description: l.description || '',
  short_description: '',
  category: mapCategory(l.type, l.category),
  tags: l.category ? [l.category] : [],
  region: (l.region || 'caracas').toLowerCase().replace(/\s+/g, '_'),
  location_name: l.city || l.region || '',
  latitude: l.latitude || 0,
  longitude: l.longitude || 0,
  price_usd: 0,
  is_published: true,
  is_featured: false,
  safety_level: 'yellow',
  rating: l.avg_rating || 0,
  total_reviews: l.review_count || 0,
  cover_image_url: l.cover_image_url || null,
  photos_json: (l.photos || []).map(url => ({ url })),
  phone: l.phone || null,
  instagram_handle: l.instagram_handle || null,
  google_place_id: l.google_place_id || null,
  platform_status: l.platform_status || 'scraped',
  provider_id: null,
}));

console.log('Starting batch upsert...');
let imported = 0;
let failed = 0;
const errors = [];

for (let i = 0; i < listings.length; i += 100) {
  const batch = listings.slice(i, i + 100);
  const { error } = await supabase
    .from('listings')
    .upsert(batch, { onConflict: 'slug', ignoreDuplicates: false });

  if (error) {
    // Try one-by-one to identify bad records
    for (const item of batch) {
      const { error: singleError } = await supabase
        .from('listings')
        .upsert(item, { onConflict: 'slug', ignoreDuplicates: false });
      if (singleError) {
        failed++;
        errors.push(`${item.slug}: ${singleError.message}`);
      } else {
        imported++;
      }
    }
  } else {
    imported += batch.length;
  }

  const progress = Math.min(i + 100, listings.length);
  process.stdout.write(`\r${progress}/${listings.length} processed...`);
}

console.log(`\n\nImported: ${imported}, Failed: ${failed}`);
if (errors.length > 0) {
  console.log('First 10 errors:');
  errors.slice(0, 10).forEach(e => console.log(' -', e));
}

// Verify final count
const { count } = await supabase
  .from('listings')
  .select('*', { count: 'exact', head: true });
console.log(`\nTotal listings in Supabase: ${count}`);
