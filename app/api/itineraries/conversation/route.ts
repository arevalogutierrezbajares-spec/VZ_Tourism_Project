import { NextRequest } from 'next/server';
import { getAnthropicClient, tourismTools } from '@/lib/claude/client';
import { handleToolCall } from '@/lib/claude/tool-handlers';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SONNET_MODEL = 'claude-sonnet-4-5';

const conversationSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.string().max(10000, 'Message content must be 10,000 characters or fewer'),
      })
    )
    .min(1, 'At least one message is required')
    .max(50, 'Conversation exceeds maximum length of 50 messages'),
});

const PLANNING_SYSTEM_PROMPT = `You are VZ, a Venezuela trip planner. Be SHORT and PUNCHY.

RULES (non-negotiable):
- ONE question per reply. Never list multiple questions.
- Max 3 short sentences total. No walls of text.
- Use **bold** for destination names. One emoji per reply max.
- Once you know destination + duration → call search_listings, then BUILD the itinerary. Stop asking.
- Format suggestions as short lines: "**Los Roques** — snorkeling, posadas, 40-min flight"

Destinations quick-ref:
- **Los Roques**: Caribbean, snorkeling, posadas, remote cays
- **Mérida**: Andes, cable car, páramo, adventure sports
- **Canaima**: Angel Falls, tepuis, indigenous culture
- **Margarita**: beaches, nightlife, duty-free
- **Morrocoy**: coral cays, flamingos, easy from Caracas
- **Choroní**: colonial, cacao, hidden beaches
- **Caracas**: Ávila mountain, museums, restaurants

PROGRESSIVE BUILDING — emit <day-plan> immediately when a day is agreed on:
<day-plan day="1" title="Arrival & Gran Roque">
[{"listing_id":"uuid-or-null","title":"...","description":"...","location_name":"...","latitude":null,"longitude":null,"cost_usd":0,"duration_hours":2,"transport_to_next":"20 min walk","transport_duration_minutes":20}]
</day-plan>

When the full trip is done, emit the complete plan inside <itinerary-json>[...]</itinerary-json>.

Match the user's language.`;

/**
 * POST /api/itineraries/conversation
 *
 * True streaming conversational planning endpoint. Uses Sonnet for fast responses.
 * Streams text token-by-token via SSE. Emits <day-plan> and <itinerary-json> events.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(getClientIp(request), 10);
  if (limited) return limited;

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'The AI trip planner is temporarily unavailable. Please try again later.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const parsed = conversationSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return new Response(JSON.stringify({ error: firstError }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages: inputMessages } = parsed.data;

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
        role: m.role as 'user' | 'assistant',
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
