import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { streamSearch } from '@/lib/claude/client';
import { searchListings, mapTypeToCategory } from '@/lib/local-listings';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';
import type { AISearchRequest } from '@/types/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const limited = rateLimit(getClientIp(request), 10);
  if (limited) return limited;

  const body = (await request.json()) as AISearchRequest;
  const { query, conversationHistory, filters } = body;

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI search is not configured' }, { status: 503 });
  }

  let supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;
  try {
    supabase = await createServiceClient();
  } catch {
    // Supabase not configured — availability/safety tools will return empty results
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      async function handleToolCall(name: string, input: Record<string, unknown>) {
        switch (name) {
          case 'search_listings': {
            const searchQuery = (input.query as string) || (input.region as string) || '';
            const region = (input.region as string) || (filters?.region as string) || undefined;
            const type = (input.category as string) || (filters?.category as string) || undefined;
            const limit = (input.limit as number) || 10;

            const scraped = searchListings(searchQuery, { region, type, limit });

            const listings = scraped.map((l) => ({
              id: l.id,
              name: l.name,
              title: l.name,
              slug: l.slug,
              type: l.type,
              category: mapTypeToCategory(l.type),
              latitude: l.latitude,
              longitude: l.longitude,
              rating: l.avg_rating,
              review_count: l.review_count,
              region: l.region,
              address: l.address,
              phone: l.phone,
              website: l.website,
              instagram_handle: l.instagram_handle,
              description: l.description,
            }));

            // Emit listings to the frontend for map pins
            if (listings.length > 0) {
              emit({ type: 'listings', data: listings });

              const firstRegion = listings[0]?.region || '';
              const firstType = listings[0]?.type || '';
              const suggestions = [
                `Tell me more about ${firstRegion}`,
                `Best ${firstType} places nearby`,
                `Is it safe to visit ${firstRegion}?`,
                `What's the best time to go?`,
                `Add all to my itinerary`,
              ].filter(Boolean);
              emit({ type: 'suggestions', data: suggestions });
            }

            return listings;
          }

          case 'check_availability': {
            if (!supabase) return { unavailable_dates: [], is_available: true };
            const { listing_id, check_in, check_out } = input as {
              listing_id: string;
              check_in: string;
              check_out: string;
            };
            const { data } = await supabase
              .from('availability')
              .select('*')
              .eq('listing_id', listing_id)
              .gte('date', check_in)
              .lte('date', check_out)
              .eq('is_available', false);
            return { unavailable_dates: data || [], is_available: !data?.length };
          }

          case 'get_safety_info': {
            if (!supabase) return [];
            const { region } = input as { region: string };
            const escapedRegion = region.replace(/[%_]/g, '\\$&');
            const { data } = await supabase
              .from('safety_zones')
              .select('name, level, description, tips')
              .ilike('name', `%${escapedRegion}%`)
              .limit(3);
            return data || [];
          }

          case 'get_route': {
            return {
              message: 'Route calculation requires Mapbox API — available in the interactive map',
            };
          }

          case 'calculate_cost': {
            const { price_per_person, guests, nights, include_platform_fee } = input as {
              price_per_person: number;
              guests: number;
              nights: number;
              include_platform_fee?: boolean;
            };
            const subtotal = price_per_person * guests * (nights || 1);
            const platformFee = include_platform_fee ? subtotal * 0.05 : 0;
            return { subtotal, platform_fee: platformFee, total: subtotal + platformFee };
          }

          default:
            return { error: `Unknown tool: ${name}` };
        }
      }

      // Build messages from conversation history + current query
      const history = (conversationHistory || []) as { role: 'user' | 'assistant'; content: string }[];
      const messages = [
        ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: query },
      ];

      try {
        await streamSearch(
          messages,
          (text: string) => {
            emit({ type: 'text', text });
          },
          handleToolCall
        );
        emit({ type: 'done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        emit({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
