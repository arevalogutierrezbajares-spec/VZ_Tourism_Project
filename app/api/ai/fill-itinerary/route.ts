import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, tourismTools, SYSTEM_PROMPT } from '@/lib/claude/client';
import { handleToolCall } from '@/lib/claude/tool-handlers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SONNET_MODEL = 'claude-sonnet-4-5-20241022';

/**
 * POST /api/ai/fill-itinerary
 *
 * Generates a full skeleton itinerary from scratch given regions, number of days, and vibe.
 * Uses Sonnet with search_listings tool to populate with real DB listings.
 */
export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const body = await request.json();
  const { regions, total_days, vibe, budget } = body as {
    regions: string[];
    total_days: number;
    vibe?: string;
    budget?: 'budget' | 'moderate' | 'luxury';
  };

  const regionStr = regions.length > 0 ? regions.join(', ') : 'Venezuela';
  const budgetStr = budget ? `Budget level: ${budget}.` : '';
  const vibeStr = vibe ? `Trip vibe: ${vibe}.` : '';

  const prompt = `Create a ${total_days}-day travel itinerary for ${regionStr}. ${vibeStr} ${budgetStr}

Use search_listings to find REAL experiences from our database for each day. Aim for 2-3 stops per day with logical geography (minimize travel between stops). Include variety: mix activities, meals, cultural experiences.

Return ONLY a JSON array (no markdown, no code fences) with this structure:
[
  {
    "day": 1,
    "title": "Arrival & City Exploration",
    "stops": [
      {"listing_id": "uuid-or-null", "title": "...", "description": "one sentence", "location_name": "...", "latitude": ..., "longitude": ..., "cost_usd": ..., "duration_hours": ...}
    ]
  }
]

If search_listings returns no results for a region, still suggest stops but set listing_id to null. Always include latitude/longitude when available.`;

  try {
    const client = getAnthropicClient();

    let messages: { role: 'user' | 'assistant'; content: string | Array<Record<string, unknown>> }[] = [
      { role: 'user', content: prompt },
    ];

    let finalText = '';
    let iterations = 0;

    while (iterations < 8) {
      iterations++;
      const response = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: 4096,
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
      return NextResponse.json({ days: [], raw: finalText });
    }

    const days = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ days });
  } catch (err) {
    console.error('AI fill-itinerary error:', err);
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
