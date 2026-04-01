import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { streamSearch } from '@/lib/claude/client';
import type { AISearchRequest } from '@/types/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AISearchRequest;
  const { query, conversationHistory, filters } = body;

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI search is not configured' }, { status: 503 });
  }

  const supabase = await createServiceClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      async function handleToolCall(name: string, input: Record<string, unknown>) {
        switch (name) {
          case 'search_listings': {
            let q = supabase
              .from('listings')
              .select(
                'id, title, slug, category, price_usd, rating, latitude, longitude, location_name, region, tags, cover_image_url, provider:providers(business_name, is_verified)'
              )
              .eq('is_published', true)
              .limit((input.limit as number) || 10);

            if (input.category) q = q.eq('category', input.category as string);
            if (input.region) q = q.eq('region', input.region as string);
            if (input.min_price) q = q.gte('price_usd', input.min_price as number);
            if (input.max_price) q = q.lte('price_usd', input.max_price as number);
            if (filters?.minPrice) q = q.gte('price_usd', filters.minPrice);
            if (filters?.maxPrice) q = q.lte('price_usd', filters.maxPrice);
            if (filters?.category) q = q.eq('category', filters.category);
            if (filters?.region) q = q.eq('region', filters.region);
            if (input.tags && Array.isArray(input.tags)) q = q.overlaps('tags', input.tags as string[]);
            if (input.query) q = q.ilike('title', `%${input.query as string}%`);

            const { data } = await q;
            const listings = data || [];

            // Emit listings to the frontend for map pins
            if (listings.length > 0) {
              emit({ type: 'listings', data: listings });

              // Emit smart follow-up suggestion chips
              const region = listings[0]?.region || '';
              const category = listings[0]?.category || '';
              const suggestions = [
                `Tell me more about ${region}`,
                `Best ${category} activities nearby`,
                `Is it safe to visit ${region}?`,
                `What's the best time to go?`,
                `Add all to my itinerary`,
              ].filter(Boolean);
              emit({ type: 'suggestions', data: suggestions });
            }

            return listings;
          }

          case 'check_availability': {
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
            const { region } = input as { region: string };
            const { data } = await supabase
              .from('safety_zones')
              .select('name, level, description, tips')
              .ilike('name', `%${region}%`)
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
