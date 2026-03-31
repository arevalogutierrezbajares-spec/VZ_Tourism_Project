import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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

  // Build tool handler with supabase access
  const supabase = await createServiceClient();

  async function handleToolCall(name: string, input: Record<string, unknown>) {
    switch (name) {
      case 'search_listings': {
        let query = supabase
          .from('listings')
          .select('id, title, slug, category, price_usd, rating, location_city, location_state, region, tags, cover_image_url, provider:providers(business_name, is_verified)')
          .eq('is_published', true)
          .limit(10);

        if (input.category) query = query.eq('category', input.category as string);
        if (input.region) query = query.eq('region', input.region as string);
        if (input.min_price) query = query.gte('price_usd', input.min_price as number);
        if (input.max_price) query = query.lte('price_usd', input.max_price as number);
        if (input.tags && Array.isArray(input.tags)) query = query.overlaps('tags', input.tags as string[]);
        if (input.query) query = query.ilike('title', `%${input.query}%`);

        const { data } = await query;
        return data || [];
      }

      case 'check_availability': {
        const { listing_id, check_in, check_out } = input as { listing_id: string; check_in: string; check_out: string };
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
        return { message: 'Route calculation requires Mapbox API — available in the interactive map' };
      }

      case 'calculate_cost': {
        const { price_per_person, guests, nights, include_platform_fee } = input as {
          price_per_person: number;
          guests: number;
          nights: number;
          include_platform_fee?: boolean;
        };
        const subtotal = price_per_person * guests * nights;
        const platformFee = include_platform_fee ? subtotal * 0.05 : 0;
        return { subtotal, platform_fee: platformFee, total: subtotal + platformFee };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  const encoder = new TextEncoder();

  // Build initial messages from conversation history + current query
  const history = (conversationHistory || []) as { role: 'user' | 'assistant'; content: string }[];
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: query },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamSearch(
          messages,
          (text: string) => {
            const data = JSON.stringify({ type: 'text', text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          },
          handleToolCall,
        );
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
