import { NextRequest } from 'next/server';
import { getAnthropicClient, tourismTools } from '@/lib/claude/client';
import { handleToolCall } from '@/lib/claude/tool-handlers';
import type Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SONNET_MODEL = 'claude-sonnet-4-5-20241022';

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

When the traveler is happy with a plan, output a STRUCTURED ITINERARY wrapped in <itinerary-json> tags:
<itinerary-json>
[
  {
    "day": 1,
    "title": "Day title",
    "stops": [
      {"listing_id": "uuid-or-null", "title": "...", "description": "...", "location_name": "...", "latitude": ..., "longitude": ..., "cost_usd": ..., "duration_hours": ...}
    ]
  }
]
</itinerary-json>

Only output the <itinerary-json> block when the user explicitly confirms they want to build/create/finalize the itinerary. During normal conversation, just chat naturally.

Respond in the same language the user writes in.`;

/**
 * POST /api/itineraries/conversation
 *
 * Streaming conversational planning endpoint. Uses Sonnet for fast responses.
 * When the user confirms a plan, Claude outputs structured itinerary JSON.
 */
export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), {
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

      // Build properly typed messages
      let apiMessages: Anthropic.MessageParam[] = inputMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let iterations = 0;

      try {
        while (iterations < 6) {
          iterations++;

          const response = await client.messages.create({
            model: SONNET_MODEL,
            max_tokens: 3000,
            system: PLANNING_SYSTEM_PROMPT,
            tools: tourismTools,
            messages: apiMessages,
          });

          // Stream text blocks to the client
          let fullText = '';
          for (const block of response.content) {
            if (block.type === 'text') {
              fullText += block.text;
              const words = block.text.split(/(\s+)/);
              for (const word of words) {
                emit({ type: 'text', text: word });
              }
            }
          }

          // Check for itinerary JSON in the response
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

          // Handle tool use with properly typed messages
          if (response.stop_reason === 'tool_use') {
            const toolResultContent: Anthropic.ToolResultBlockParam[] = [];

            for (const block of response.content) {
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
              { role: 'assistant', content: response.content },
              { role: 'user', content: toolResultContent },
            ];
          } else {
            break;
          }
        }

        emit({ type: 'done' });
      } catch (err) {
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
