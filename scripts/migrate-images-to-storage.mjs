/**
 * migrate-images-to-storage.mjs
 *
 * Downloads all external listing cover images and uploads them to Supabase Storage.
 * Updates the cover_image_url column to point to the new Supabase Storage URL.
 * Saves a backup JSON with original URLs.
 *
 * Usage:
 *   source .env.local && node scripts/migrate-images-to-storage.mjs [--dry-run] [--batch=10] [--offset=0]
 *
 * Prerequisites:
 *   - "listing-images" bucket must exist in Supabase Storage (public)
 *   - SUPABASE_SERVICE_ROLE_KEY env var
 *   - NEXT_PUBLIC_SUPABASE_URL env var
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'listing-images';
const BACKUP_FILE = join(__dirname, 'image-migration-backup.json');
const PROGRESS_FILE = join(__dirname, 'image-migration-progress.json');

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '10');
const START_OFFSET = parseInt(process.argv.find(a => a.startsWith('--offset='))?.split('=')[1] || '0');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (DRY_RUN) console.log('🔍 DRY RUN — no writes\n');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { migrated: [], failed: [], skipped: [] };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function loadBackup() {
  if (existsSync(BACKUP_FILE)) {
    return JSON.parse(readFileSync(BACKUP_FILE, 'utf8'));
  }
  return {};
}

function saveBackup(backup) {
  writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
}

async function downloadImage(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'VAV-ImageMigration/1.0' },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Not an image: ${contentType}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = contentType.includes('png') ? 'png'
        : contentType.includes('webp') ? 'webp'
        : 'jpg';

      return { buffer, ext, contentType };
    } catch (err) {
      if (attempt === retries) throw err;
      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function uploadToStorage(listingId, buffer, ext, contentType) {
  const path = `covers/${listingId}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      cacheControl: '31536000', // 1 year — immutable content
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return publicUrl;
}

async function updateListingUrl(listingId, newUrl) {
  const { error } = await supabase
    .from('listings')
    .update({ cover_image_url: newUrl })
    .eq('id', listingId);

  if (error) throw new Error(`DB update failed: ${error.message}`);
}

function isExternalUrl(url) {
  if (!url) return false;
  // Skip URLs already on Supabase Storage
  if (url.includes('.supabase.co/storage/')) return false;
  return url.startsWith('http');
}

// ─── Main ────────────────────────────────────────────────────────────────���──

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);

  if (!exists) {
    console.log(`Creating bucket "${BUCKET}"...`);
    if (!DRY_RUN) {
      const { error } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (error) {
        console.error('Failed to create bucket:', error.message);
        process.exit(1);
      }
    }
    console.log('Bucket created.\n');
  } else {
    console.log(`Bucket "${BUCKET}" exists.\n`);
  }
}

async function migrate() {
  await ensureBucket();

  // Load state
  const progress = loadProgress();
  const backup = loadBackup();
  const alreadyDone = new Set(progress.migrated);

  // Fetch all listings with external cover images (paginate past 1000-row limit)
  console.log('Fetching listings with external images...');
  let listings = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, cover_image_url')
      .not('cover_image_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Failed to fetch listings:', error.message);
      process.exit(1);
    }
    listings = listings.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const toMigrate = listings.filter(l => isExternalUrl(l.cover_image_url) && !alreadyDone.has(l.id));
  console.log(`Total listings: ${listings.length}`);
  console.log(`Already migrated: ${alreadyDone.size}`);
  console.log(`To migrate: ${toMigrate.length}`);
  console.log(`Batch size: ${BATCH_SIZE}, starting at offset: ${START_OFFSET}\n`);

  const batch = toMigrate.slice(START_OFFSET);
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async (listing) => {
        const { id, title, cover_image_url } = listing;

        try {
          // Download
          const { buffer, ext, contentType } = await downloadImage(cover_image_url);

          if (DRY_RUN) {
            console.log(`  OK [dry] ${title.substring(0, 50)} (${(buffer.length / 1024).toFixed(0)}KB)`);
            return { id, status: 'ok' };
          }

          // Upload to storage
          const newUrl = await uploadToStorage(id, buffer, ext, contentType);

          // Update DB
          await updateListingUrl(id, newUrl);

          // Save backup
          backup[id] = cover_image_url;

          console.log(`  OK ${title.substring(0, 50)} (${(buffer.length / 1024).toFixed(0)}KB)`);
          return { id, status: 'ok' };
        } catch (err) {
          console.error(`  FAIL ${title.substring(0, 50)}: ${err.message}`);
          return { id, status: 'fail', error: err.message };
        }
      })
    );

    // Update progress
    for (const result of results) {
      processed++;
      if (result.status === 'fulfilled' && result.value.status === 'ok') {
        succeeded++;
        progress.migrated.push(result.value.id);
      } else {
        failed++;
        const reason = result.status === 'rejected'
          ? result.reason?.message
          : result.value?.error;
        progress.failed.push({ id: result.value?.id, error: reason });
      }
    }

    // Save progress after each batch
    if (!DRY_RUN) {
      saveProgress(progress);
      saveBackup(backup);
    }

    // Progress bar
    const pct = ((processed / batch.length) * 100).toFixed(1);
    console.log(`\n  [${pct}%] ${processed}/${batch.length} | OK: ${succeeded} | FAIL: ${failed}\n`);

    // Rate limit: 500ms pause between batches
    if (i + BATCH_SIZE < batch.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n════════��══════════════════════════════');
  console.log(`Migration ${DRY_RUN ? '(dry run) ' : ''}complete.`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Backup: ${BACKUP_FILE}`);
  console.log(`  Progress: ${PROGRESS_FILE}`);
  console.log('═══════════════════════════════════��═══');
}

migrate().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
