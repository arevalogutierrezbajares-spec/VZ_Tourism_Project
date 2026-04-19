import { NextRequest } from 'next/server';
import { getAnthropicClient, tourismTools } from '@/lib/claude/client';
import { handleToolCall } from '@/lib/claude/tool-handlers';
import type Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SONNET_MODEL = 'claude-sonnet-4-5';

const PLANNING_SYSTEM_PROMPT = `You are VZ Explorer, a friendly and knowledgeable AI travel planner for Venezuela. You're having a conversation with a traveler to help them build their perfect itinerary.

Your approach:
1. ASK about their preferences — don't assume. Ask about: trip length, interests/vibe, budget, who's traveling, comfort level with adventure
2. SUGGEST specific destinations that match, explaining WHY each fits. Use search_listings to find real experiences
3. ITERATE based on their reactions — if they like something, build on it; if not, pivot
4. BUILD the itinerary progressively through conversation, confirming each piece

Key knowledge:
- Los Roques: pristine Caribbean, snorkeling, relaxation
- Mérida: Andes, adventure sports, cable car, páramo
- Canaima/Gran Sabana: Angel Falls, tepuis, indigenous culture
- Margarita: beaches, nightlife, duty-free
- Morrocoy: coral reefs, mangroves, day trips from Caracas
- Choroní/Henri Pittier: colonial town, cocoa, secluded beaches
- Caracas: museums, restaurants, Ávila mountain

Safety levels: Green (safe), Yellow (normal precautions), Orange (increased caution), Red (extreme caution)

PROGRESSIVE BUILDING — output a <day-plan> tag each time the traveler agrees on a day's plan:
<day-plan day="1" title="Caracas Arrival">
[{"listing_id": "uuid-or-null", "title": "...", "description": "...", "location_name": "...", "latitude": ..., "longitude": ..., "cost_usd": ..., "duration_hours": ..., "transport_to_next": "25 min drive", "transport_duration_minutes": 25}]
</day-plan>

Output a <day-plan> tag each time you and the traveler agree on a day's activities. Don't wait until the entire trip is confirmed. If the traveler asks to revise a day, emit a new <day-plan> with the same day number (it replaces the previous one).

When the FULL trip is finalized, also output the complete plan in <itinerary-json> tags:
<itinerary-json>
[
  {
    "day": 1,
    "title": "Day title",
    "stops": [
      {"listing_id": "uuid-or-null", "title": "...", "description": "...", "location_name": "...", "latitude": ..., "longitude": ..., "cost_usd": ..., "duration_hours": ..., "transport_to_next": "...", "transport_duration_minutes": ...}
    ]
  }
]
</itinerary-json>

Respond in the same language the user writes in.`;

/**
 * POST /api/itineraries/conversation
 *
 * True streaming conversational planning endpoint. Uses Sonnet for fast responses.
 * Streams text token-by-token via SSE. Emits <day-plan> and <itinerary-json> events.
 */
export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'The AI trip planner is temporarily unavailable. Please try again later.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { messages: inputMessages } = body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
  };

  if (!inputMessages?.length) {
    return new Response(JSON.stringify({ error: 'Messages required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      const client = getAnthropicClient();

      let apiMessages: Anthropic.MessageParam[] = inputMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let iterations = 0;

      try {
        while (iterations < 6) {
          iterations++;

          // True streaming — tokens arrive as they're generated
          const claudeStream = client.messages.stream({
            model: SONNET_MODEL,
            max_tokens: 3000,
            system: PLANNING_SYSTEM_PROMPT,
            tools: tourismTools,
            messages: apiMessages,
          });

          // If the client disconnects, abort the Claude stream
          if (request.signal) {
            request.signal.addEventListener('abort', () => {
              claudeStream.abort();
            }, { once: true });
          }

          let fullText = '';

          // Stream text deltas to the client in real-time
          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                fullText += event.delta.text;
                emit({ type: 'text', text: event.delta.text });
              }
            }
          }

          const finalMessage = await claudeStream.finalMessage();

          // Parse <day-plan> tags from the accumulated text (attribute order agnostic)
          const dayPlanTagRegex = /<day-plan\s([^>]*)>\s*([\s\S]*?)\s*<\/day-plan>/g;
          let dayMatch;
          while ((dayMatch = dayPlanTagRegex.exec(fullText)) !== null) {
            try {
              const attrs = dayMatch[1];
              const dayNum = attrs.match(/day="(\d+)"/)?.[1];
              const title = attrs.match(/title="([^"]*)"/)?.[1];
              if (!dayNum) continue;
              const stops = JSON.parse(dayMatch[2]);
              emit({
                type: 'day-plan',
                data: { day: parseInt(dayNum, 10), title: title || `Day ${dayNum}`, stops },
              });
            } catch {
              // Malformed day-plan JSON — silently skip, text is still shown
            }
          }

          // Parse <itinerary-json> tags (full trip finalization)
          const itineraryMatch = fullText.match(
            /<itinerary-json>([\s\S]*?)<\/itinerary-json>/
          );
          if (itineraryMatch) {
            try {
              const itineraryData = JSON.parse(itineraryMatch[1]);
              emit({ type: 'itinerary', data: itineraryData });
            } catch {
              // JSON parse failed — text is still shown
            }
          }

          // Handle tool use — loop back with tool results
          if (finalMessage.stop_reason === 'tool_use') {
            const toolResultContent: Anthropic.ToolResultBlockParam[] = [];

            for (const block of finalMessage.content) {
              if (block.type === 'tool_use') {
                const result = await handleToolCall(
                  block.name,
                  block.input as Record<string, unknown>,
                  emit
                );
                toolResultContent.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });
              }
            }

            apiMessages = [
              ...apiMessages,
              { role: 'assistant', content: finalMessage.content },
              { role: 'user', content: toolResultContent },
            ];
          } else {
            break;
          }
        }

        emit({ type: 'done' });
      } catch (err) {
        if (request.signal?.aborted) return;
        const message = err instanceof Error ? err.message : 'Conversation failed';
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
