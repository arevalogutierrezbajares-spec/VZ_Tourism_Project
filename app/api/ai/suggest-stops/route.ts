import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, CLAUDE_MODEL, tourismTools, SYSTEM_PROMPT } from '@/lib/claude/client';
import { handleToolCall } from '@/lib/claude/tool-handlers';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SONNET_MODEL = 'claude-sonnet-4-5-20241022';

/**
 * POST /api/ai/suggest-stops
 *
 * Given the current itinerary context, suggests 2-3 stops for a specific day.
 * Uses Claude with search_listings tool to find real DB entries.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(getClientIp(request), 10);
  if (limited) return limited;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const body = await request.json();
  const {
    day,
    total_days,
    regions,
    existing_stops,
    vibe,
    mode,
  } = body as {
    day: number;
    total_days: number;
    regions: string[];
    existing_stops: { day: number; title: string; location_name?: string }[];
    vibe?: string;
    mode?: 'suggest' | 'alternatives';
  };

  const regionStr = regions.length > 0 ? regions.join(', ') : 'Venezuela';
  const existingStr = existing_stops.length > 0
    ? existing_stops.map((s) => `Day ${s.day}: ${s.title}${s.location_name ? ` (${s.location_name})` : ''}`).join('\n')
    : 'No stops added yet.';

  const prompt = mode === 'alternatives'
    ? `I have this stop on Day ${day} of a ${total_days}-day trip to ${regionStr}:
${existingStr}

Suggest 3 ALTERNATIVE stops that could replace this one. They should be in the same region, similar type but offer variety. Use search_listings to find real options from our database.

Return ONLY a JSON array (no markdown, no explanation) with objects like:
[{"listing_id": "...", "title": "...", "description": "one sentence", "location_name": "...", "latitude": ..., "longitude": ..., "cost_usd": ..., "duration_hours": ..., "reason": "why this is a good alternative"}]`
    : `I'm planning a ${total_days}-day trip to ${regionStr}.${vibe ? ` Vibe: ${vibe}.` : ''}

Current itinerary:
${existingStr}

Suggest 3 stops to add for Day ${day}. Use search_listings to find real experiences from our database that would complement what's already planned. Avoid duplicating existing stops. Consider logical geography and pacing.

Return ONLY a JSON array (no markdown, no explanation) with objects like:
[{"listing_id": "...", "title": "...", "description": "one sentence", "location_name": "...", "latitude": ..., "longitude": ..., "cost_usd": ..., "duration_hours": ..., "reason": "why this fits the itinerary"}]`;

  try {
    const client = getAnthropicClient();

    let messages: { role: 'user' | 'assistant'; content: string | Array<Record<string, unknown>> }[] = [
      { role: 'user', content: prompt },
    ];

    let finalText = '';
    let iterations = 0;

    while (iterations < 5) {
      iterations++;
      const response = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: tourismTools,
        messages: messages as Parameters<typeof client.messages.create>[0]['messages'],
      });

      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text;
        }
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: Array<Record<string, unknown>> = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await handleToolCall(block.name, block.input as Record<string, unknown>);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }

        messages = [
          ...messages,
          { role: 'assistant', content: response.content as unknown as Array<Record<string, unknown>> },
          { role: 'user', content: toolResults },
        ];
        finalText = '';
      } else {
        break;
      }
    }

    const jsonMatch = finalText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ suggestions: [], raw: finalText });
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('AI suggest-stops error:', err);
    const message = err instanceof Error ? err.message : 'Suggestion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
