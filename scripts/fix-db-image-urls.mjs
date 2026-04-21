/**
 * fix-db-image-urls.mjs
 *
 * Syncs the Supabase `listings` table cover_image_url with what's actually
 * in the listing-images bucket. If a cover exists in storage but the DB row
 * has null or a stale Google URL, update it.
 *
 * Also purges any listing_photos rows pointing to expired Google URLs.
 *
 * Usage:
 *   source .env.local && node scripts/fix-db-image-urls.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'listing-images';
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN ---\n' : '');

  // 1. List all covers in storage
  const existingCovers = new Set();
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('covers', { limit: PAGE, offset });
    if (error) { console.error('Bucket list error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const file of data) {
      existingCovers.add(file.name.replace(/\.[^.]+$/, ''));
    }
    offset += data.length;
    if (data.length < PAGE) break;
  }
  console.log(`Covers in storage: ${existingCovers.size}`);

  // 2. Fetch all listings from DB that have null or Google cover_image_url
  const { data: listings, error: fetchErr } = await supabase
    .from('listings')
    .select('id, cover_image_url')
    .or('cover_image_url.is.null,cover_image_url.like.%googleapis.com%');

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }
  console.log(`Listings needing cover URL fix: ${listings.length}`);

  let updated = 0;
  let skipped = 0;

  for (const listing of listings) {
    if (existingCovers.has(listing.id)) {
      const newUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/covers/${listing.id}.jpg`;
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('listings')
          .update({ cover_image_url: newUrl })
          .eq('id', listing.id);
        if (error) {
          console.error(`  Failed ${listing.id}: ${error.message}`);
          continue;
        }
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDB cover_image_url updated: ${updated}`);
  console.log(`Skipped (no cover in storage): ${skipped}`);

  // 3. Purge expired Google URLs from listing_photos
  if (!DRY_RUN) {
    const { count, error: delErr } = await supabase
      .from('listing_photos')
      .delete({ count: 'exact' })
      .like('url', '%googleapis.com%');

    if (delErr) {
      console.error('listing_photos cleanup error:', delErr.message);
    } else {
      console.log(`\nPurged ${count ?? 0} expired Google URLs from listing_photos`);
    }
  } else {
    const { count } = await supabase
      .from('listing_photos')
      .select('*', { count: 'exact', head: true })
      .like('url', '%googleapis.com%');
    console.log(`\nWould purge ${count ?? 0} expired Google URLs from listing_photos`);
  }

  console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
