/**
 * Batch-match extracted place names against the listings database.
 * Replaces the N+1 per-spot sequential queries with a single broad query + client-side scoring.
 */

import { createServiceClient } from '@/lib/supabase/server';

interface RawSpot {
  extracted_name: string;
  region: string | null;
}

interface MatchResult {
  listing_id: string | null;
  listing_title: string | null;
  confidence: 'high' | 'medium' | 'low';
  latitude: number | null;
  longitude: number | null;
}

/**
 * Match an array of extracted spot names against the listings DB in one batch.
 * Uses a single broad query, then scores matches client-side.
 */
export async function matchSpotsBatch(
  spots: RawSpot[]
): Promise<MatchResult[]> {
  if (spots.length === 0) return [];

  const supabase = await createServiceClient();
  if (!supabase) {
    return spots.map(() => ({
      listing_id: null,
      listing_title: null,
      confidence: 'low' as const,
      latitude: null,
      longitude: null,
    }));
  }

  // Build a single OR query with all spot names + first words
  const searchTerms = new Set<string>();
  for (const spot of spots) {
    searchTerms.add(spot.extracted_name);
    const firstWord = spot.extracted_name.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
      searchTerms.add(firstWord);
    }
  }

  // Fetch all potentially matching listings in one query
  const orClauses = [...searchTerms]
    .map((term) => `title.ilike.%${term}%,location_name.ilike.%${term}%`)
    .join(',');

  const { data: candidates } = await supabase
    .from('listings')
    .select('id, title, latitude, longitude, region, location_name')
    .eq('is_published', true)
    .or(orClauses)
    .limit(200);

  const allCandidates = candidates || [];

  // Score each spot against the candidate pool
  return spots.map((spot) => {
    const nameLower = spot.extracted_name.toLowerCase();

    // Exact title match
    const exact = allCandidates.find(
      (c) => c.title.toLowerCase().includes(nameLower)
    );
    if (exact) {
      return {
        listing_id: exact.id,
        listing_title: exact.title,
        confidence: 'high' as const,
        latitude: Number(exact.latitude),
        longitude: Number(exact.longitude),
      };
    }

    // First-word match
    const firstWord = nameLower.split(' ')[0];
    const fuzzy = firstWord && firstWord.length > 2
      ? allCandidates.find(
          (c) =>
            c.title.toLowerCase().includes(firstWord) ||
            (c.location_name && c.location_name.toLowerCase().includes(nameLower))
        )
      : null;

    if (fuzzy) {
      return {
        listing_id: fuzzy.id,
        listing_title: fuzzy.title,
        confidence: 'medium' as const,
        latitude: Number(fuzzy.latitude),
        longitude: Number(fuzzy.longitude),
      };
    }

    // Region-based match
    if (spot.region) {
      const regionMatch = allCandidates.find(
        (c) =>
          c.region?.toLowerCase().includes(spot.region!.toLowerCase()) &&
          c.title.toLowerCase().includes(firstWord || '')
      );
      if (regionMatch) {
        return {
          listing_id: regionMatch.id,
          listing_title: regionMatch.title,
          confidence: 'medium' as const,
          latitude: Number(regionMatch.latitude),
          longitude: Number(regionMatch.longitude),
        };
      }
    }

    return {
      listing_id: null,
      listing_title: null,
      confidence: 'low' as const,
      latitude: null,
      longitude: null,
    };
  });
}
