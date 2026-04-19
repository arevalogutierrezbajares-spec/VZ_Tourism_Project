/**
 * migrate-photo-urls.mjs
 *
 * Scans listing_photos.url and listings.photos_json for raw Google Places API
 * URLs (containing places.googleapis.com) and rewrites them to use the
 * server-side proxy at /api/places/photo.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-photo-urls.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xuxmqpbddtajfiuogbov.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
if (dryRun) console.log('DRY RUN — no writes will be made\n');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const GOOGLE_PHOTO_REGEX = /https:\/\/places\.googleapis\.com\/v1\/(places\/[^/]+\/photos\/[^/]+)\/media\?[^"'\s]*/g;

function rewriteUrl(rawUrl) {
  const match = rawUrl.match(/https:\/\/places\.googleapis\.com\/v1\/(places\/[^/]+\/photos\/[^/]+)\/media/);
  if (!match) return null;
  const photoName = match[1];
  return `/api/places/photo?ref=${encodeURIComponent(photoName)}&maxWidth=800`;
}

async function migrateListingPhotos() {
  console.log('--- listing_photos table ---');
  const { data: photos, error } = await supabase
    .from('listing_photos')
    .select('id, url')
    .like('url', '%places.googleapis.com%');

  if (error) {
    console.error('Error querying listing_photos:', error.message);
    return 0;
  }

  console.log(`Found ${photos.length} rows with raw Google URLs`);
  let updated = 0;

  for (const photo of photos) {
    const newUrl = rewriteUrl(photo.url);
    if (!newUrl) {
      console.warn(`  Skipping ${photo.id} — could not parse URL: ${photo.url}`);
      continue;
    }

    console.log(`  ${photo.id}: ${photo.url.slice(0, 60)}...`);
    console.log(`    → ${newUrl}`);

    if (!dryRun) {
      const { error: updateErr } = await supabase
        .from('listing_photos')
        .update({ url: newUrl })
        .eq('id', photo.id);
      if (updateErr) {
        console.error(`  FAILED: ${updateErr.message}`);
      } else {
        updated++;
      }
    } else {
      updated++;
    }
  }

  return updated;
}

async function migratePhotosJson() {
  console.log('\n--- listings.photos_json column ---');
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, photos_json')
    .not('photos_json', 'is', null);

  if (error) {
    console.error('Error querying listings:', error.message);
    return 0;
  }

  let updated = 0;

  for (const listing of listings) {
    const photos = listing.photos_json;
    if (!Array.isArray(photos) || photos.length === 0) continue;

    let changed = false;
    const newPhotos = photos.map((p) => {
      if (typeof p.url === 'string' && p.url.includes('places.googleapis.com')) {
        const newUrl = rewriteUrl(p.url);
        if (newUrl) {
          changed = true;
          return { ...p, url: newUrl };
        }
      }
      return p;
    });

    if (!changed) continue;

    console.log(`  listing ${listing.id}: ${newPhotos.length} photos rewritten`);
    updated++;

    if (!dryRun) {
      const { error: updateErr } = await supabase
        .from('listings')
        .update({ photos_json: newPhotos })
        .eq('id', listing.id);
      if (updateErr) {
        console.error(`  FAILED: ${updateErr.message}`);
      }
    }
  }

  return updated;
}

const [photoCount, jsonCount] = await Promise.all([
  migrateListingPhotos(),
  migratePhotosJson(),
]);

console.log(`\n${dryRun ? '[DRY RUN] Would update' : 'Updated'}: ${photoCount} listing_photos rows, ${jsonCount} listings rows`);
