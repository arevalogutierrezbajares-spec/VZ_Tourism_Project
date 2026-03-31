import Anthropic from '@anthropic-ai/sdk';

let _anthropic: Anthropic | null = null;
export function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}
/** @deprecated use getAnthropicClient() */
export const anthropic = { get messages() { return getAnthropicClient().messages; } } as unknown as Anthropic;

export const CLAUDE_MODEL = 'claude-opus-4-5';

export const tourismTools: Anthropic.Tool[] = [
  {
    name: 'search_listings',
    description:
      'Search for tourism listings in Venezuela based on category, region, price range, or keywords. Returns matching listings with details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query text',
        },
        category: {
          type: 'string',
          enum: ['beaches', 'mountains', 'cities', 'eco-tours', 'gastronomy', 'adventure', 'wellness', 'cultural'],
          description: 'Category of listing',
        },
        region: {
          type: 'string',
          description: 'Region name in Venezuela (e.g., Los Roques, Mérida, Margarita)',
        },
        min_price: {
          type: 'number',
          description: 'Minimum price in USD',
        },
        max_price: {
          type: 'number',
          description: 'Maximum price in USD',
        },
        safety_level: {
          type: 'string',
          enum: ['green', 'yellow', 'orange', 'red'],
          description: 'Safety level filter',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (default 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'check_availability',
    description: 'Check availability for a specific listing on given dates',
    input_schema: {
      type: 'object' as const,
      properties: {
        listing_id: {
          type: 'string',
          description: 'ID of the listing to check',
        },
        date: {
          type: 'string',
          description: 'Date to check (YYYY-MM-DD format)',
        },
        guests: {
          type: 'number',
          description: 'Number of guests',
        },
      },
      required: ['listing_id', 'date'],
    },
  },
  {
    name: 'get_safety_info',
    description: 'Get safety information and alerts for a specific region in Venezuela',
    input_schema: {
      type: 'object' as const,
      properties: {
        region: {
          type: 'string',
          description: 'Region or area name in Venezuela',
        },
        lat: {
          type: 'number',
          description: 'Latitude of the location',
        },
        lng: {
          type: 'number',
          description: 'Longitude of the location',
        },
      },
      required: ['region'],
    },
  },
  {
    name: 'get_route',
    description: 'Get directions and route information between two locations in Venezuela',
    input_schema: {
      type: 'object' as const,
      properties: {
        origin: {
          type: 'string',
          description: 'Starting location name or coordinates',
        },
        destination: {
          type: 'string',
          description: 'Destination location name or coordinates',
        },
        mode: {
          type: 'string',
          enum: ['driving', 'walking', 'cycling'],
          description: 'Transportation mode',
        },
      },
      required: ['origin', 'destination'],
    },
  },
  {
    name: 'calculate_cost',
    description: 'Calculate total cost for a trip including multiple listings, accommodation and transport',
    input_schema: {
      type: 'object' as const,
      properties: {
        listing_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of listing IDs to include in cost calculation',
        },
        guests: {
          type: 'number',
          description: 'Number of guests',
        },
        days: {
          type: 'number',
          description: 'Number of days',
        },
      },
      required: ['listing_ids', 'guests'],
    },
  },
];

export const SYSTEM_PROMPT = `You are VZ Explorer, an AI travel assistant specialized in Venezuela tourism.
You help travelers discover amazing destinations, plan itineraries, and stay safe while exploring Venezuela's natural wonders.

Key responsibilities:
- Recommend listings based on traveler preferences
- Provide safety information and travel advisories
- Help build personalized itineraries
- Answer questions about Venezuelan culture, food, and destinations
- Suggest optimal routes and transportation options
- Calculate trip costs and help with budgeting

Venezuela's top destinations you know about:
- Los Roques Archipelago: pristine Caribbean beaches, snorkeling, diving
- Mérida: Andes mountains, adventure sports, cable car
- Margarita Island: beaches, seafood, duty-free shopping
- Canaima / Tepuis: Angel Falls, unique landscapes, indigenous culture
- Gran Sabana: tepuis, stunning landscapes, indigenous communities
- Morrocoy: national park, coral reefs, mangroves
- Barquisimeto: music, culture, gastronomy
- Caracas: modern city, museums, restaurants

Safety levels:
- Green: Safe for all travelers
- Yellow: Exercise normal precautions
- Orange: Exercise increased caution
- Red: Avoid or use extreme caution

Always be honest about safety situations while remaining encouraging about Venezuela's genuine beauty and tourism value.
Respond in the same language the user writes in (Spanish or English).`;

export async function streamSearch(
  messages: Anthropic.MessageParam[],
  onText: (text: string) => void,
  onToolCall: (toolName: string, input: Record<string, unknown>) => Promise<unknown>
): Promise<string> {
  let fullText = '';

  const stream = await anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: tourismTools,
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        onText(event.delta.text);
      }
    }
  }

  const finalMessage = await stream.finalMessage();

  // Handle tool calls if any
  if (finalMessage.stop_reason === 'tool_use') {
    const toolUseBlocks = finalMessage.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const result = await onToolCall(toolUse.name, toolUse.input as Record<string, unknown>);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    // Continue conversation with tool results
    const continuedMessages: Anthropic.MessageParam[] = [
      ...messages,
      { role: 'assistant', content: finalMessage.content },
      { role: 'user', content: toolResults },
    ];

    return streamSearch(continuedMessages, onText, onToolCall);
  }

  return fullText;
}
