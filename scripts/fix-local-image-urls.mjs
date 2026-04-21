/**
 * fix-local-image-urls.mjs
 *
 * Updates data/scraped-listings.json to replace expired Google Places photo URLs
 * with Supabase Storage URLs (already uploaded by migrate-images-to-storage.mjs).
 *
 * For cover_image_url: points to the already-uploaded cover in listing-images/covers/{id}.jpg
 * For photos/selected_photos: removes expired Google URLs (listing_photos table is empty,
 * and we don't have gallery images in storage — only covers exist).
 *
 * Usage:
 *   source .env.local && node scripts/fix-local-image-urls.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', 'data', 'scraped-listings.json');

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

  // Load local listings
  const listings = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  console.log(`Loaded ${listings.length} listings from scraped-listings.json`);

  // List all files in covers/ folder of the bucket to know which covers exist
  const existingCovers = new Set();
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('covers', { limit: PAGE, offset });
    if (error) {
      console.error('Failed to list bucket:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    for (const file of data) {
      // file.name is like "01176ad3-0bb2-4e86-afe5-566135627ae3.jpg"
      const id = file.name.replace(/\.[^.]+$/, '');
      existingCovers.add(id);
    }
    offset += data.length;
    if (data.length < PAGE) break;
  }
  console.log(`Found ${existingCovers.size} covers in Supabase Storage\n`);

  let coverFixed = 0;
  let coverAlready = 0;
  let coverMissing = 0;
  let photosCleared = 0;

  for (const listing of listings) {
    const id = listing.id;
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/covers/${id}.jpg`;

    // Fix cover_image_url
    if (existingCovers.has(id)) {
      if (listing.cover_image_url !== storageUrl) {
        listing.cover_image_url = storageUrl;
        coverFixed++;
      } else {
        coverAlready++;
      }
    } else {
      // No cover in storage — set to null rather than leaving expired URL
      if (listing.cover_image_url && listing.cover_image_url.includes('googleapis.com')) {
        listing.cover_image_url = null;
        coverMissing++;
      }
    }

    // Clear expired photos/selected_photos (Google Places URLs that return 403)
    if (listing.photos && listing.photos.length > 0) {
      const validPhotos = listing.photos.filter(url => !url.includes('googleapis.com'));
      if (validPhotos.length !== listing.photos.length) {
        // Replace gallery with just the cover if it exists
        listing.photos = existingCovers.has(id) ? [storageUrl] : [];
        photosCleared++;
      }
    }
    if (listing.selected_photos && listing.selected_photos.length > 0) {
      const valid = listing.selected_photos.filter(url => !url.includes('googleapis.com'));
      if (valid.length !== listing.selected_photos.length) {
        listing.selected_photos = existingCovers.has(id) ? [storageUrl] : [];
      }
    }
  }

  console.log(`Cover URLs fixed: ${coverFixed}`);
  console.log(`Cover URLs already correct: ${coverAlready}`);
  console.log(`Cover URLs nulled (no storage file): ${coverMissing}`);
  console.log(`Listings with photos cleared: ${photosCleared}`);

  if (!DRY_RUN) {
    writeFileSync(DATA_FILE, JSON.stringify(listings, null, 2));
    console.log('\nWrote updated scraped-listings.json');
  } else {
    console.log('\nDry run complete. No files written.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
