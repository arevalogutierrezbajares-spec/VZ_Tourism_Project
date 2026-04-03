import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { getAllContent } from '@/lib/discover-store';

export const runtime = 'nodejs';

const MODEL = 'claude-haiku-4-5-20251001';

async function generateText(prompt: string): Promise<string> {
  const client = getAnthropicClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text.trim() : '';
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { action, caption, description, region, category, instagram_caption, location, tags } = body;

    switch (action) {
      case 'generate_caption': {
        const context = [
          instagram_caption && `Instagram caption: "${instagram_caption}"`,
          location && `Location: ${location}`,
          region && `Region: ${region}`,
          category && `Category: ${category}`,
          description && `Description: ${description}`,
        ]
          .filter(Boolean)
          .join('\n');

        const text = await generateText(
          `You are a travel copywriter for a Venezuelan tourism platform. Write a compelling, punchy photo caption (max 80 characters) for a discover feed post.\n\nContext:\n${context}\n\nRules:\n- Evocative, sensory language\n- No hashtags, no emojis\n- Can be a fragment or short sentence\n- Should make people want to visit\n\nReturn ONLY the caption text, nothing else.`
        );
        return NextResponse.json({ result: text });
      }

      case 'write_description': {
        const context = [
          caption && `Caption: "${caption}"`,
          location && `Location: ${location}`,
          region && `Region: ${region}`,
          category && `Category: ${category}`,
        ]
          .filter(Boolean)
          .join('\n');

        const text = await generateText(
          `You are a travel writer for a Venezuelan tourism platform. Write an evocative 2-sentence description for a discover feed post.\n\nContext:\n${context}\n\nRules:\n- First sentence: paint the scene / what makes it special\n- Second sentence: the experience or feeling of being there\n- No clichés like "breathtaking" or "stunning"\n- Present tense\n- Max 200 characters total\n\nReturn ONLY the description text, nothing else.`
        );
        return NextResponse.json({ result: text });
      }

      case 'suggest_tags': {
        const context = [
          caption && `Caption: "${caption}"`,
          description && `Description: "${description}"`,
          region && `Region: ${region}`,
          category && `Category: ${category}`,
          location && `Location: ${location}`,
        ]
          .filter(Boolean)
          .join('\n');

        const text = await generateText(
          `You are a travel content tagger. Suggest 4-6 relevant tags for a Venezuelan tourism discover feed post.\n\nContext:\n${context}\n\nRules:\n- Title case (e.g., "Beach Access", "Coral Reef")\n- Specific and descriptive, not generic\n- Mix of activity, nature, and experience tags\n- No hashtags\n\nReturn ONLY a JSON array of tag strings, e.g. ["Beach Access", "Snorkeling", "Marine Life"]`
        );
        try {
          const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
          return NextResponse.json({ result: Array.isArray(parsed) ? parsed : [] });
        } catch {
          // fallback: extract quoted strings
          const matches = text.match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, '')) ?? [];
          return NextResponse.json({ result: matches });
        }
      }

      case 'suggest_meta': {
        // Given instagram caption + optional context, suggest region, category, tags, location
        const igCaption = instagram_caption || caption || '';
        const text = await generateText(
          `You are a Venezuelan tourism content classifier. Given an Instagram post caption, suggest metadata for a discover feed item.\n\nInstagram caption: "${igCaption}"\n\nVenezuela regions: Los Roques, Mérida, Canaima, Margarita Island, Morrocoy, Gran Sabana, Caracas, Choroní, Falcón, Amazon\nCategories: beach, mountain, city, food, activity, nature\n\nReturn ONLY valid JSON with these fields:\n{\n  "region": "region slug (losroques/merida/canaima/margarita/morrocoy/gransabana/caracas/choroni/falcon/amazon or empty string)",\n  "region_name": "human-readable region name or empty string",\n  "category": "one of: beach/mountain/city/food/activity/nature",\n  "tags": ["array", "of", "4-5", "tags"],\n  "location_name": "specific location name if identifiable, else empty string",\n  "caption": "suggested caption max 80 chars"\n}`
        );
        try {
          const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
          return NextResponse.json({ result: parsed });
        } catch {
          return NextResponse.json({ result: null, raw: text });
        }
      }

      case 'build_collection': {
        // Given a theme string, curate content ids from existing items
        const { theme } = body;
        if (!theme) return NextResponse.json({ error: 'theme required' }, { status: 400 });

        const allItems = getAllContent();
        const itemSummaries = allItems
          .slice(0, 60)
          .map((i) => `id:${i.id} | caption:"${i.caption}" | region:${i.region_name} | category:${i.category} | tags:${i.tags.join(',')}`)
          .join('\n');

        const text = await generateText(
          `You are a travel content curator. Given the collection theme "${theme}", select 8-12 items from this list that best fit the theme.\n\nAvailable content:\n${itemSummaries}\n\nReturn ONLY a JSON array of id strings for items that match the theme, ordered by relevance (best first). Example: ["id1", "id2", "id3"]`
        );
        try {
          const ids = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
          // Suggest a name and description too
          const metaText = await generateText(
            `For a Venezuelan tourism collection themed "${theme}", write a short collection name (max 30 chars) and a 1-sentence description (max 100 chars).\nReturn ONLY JSON: {"name": "...", "description": "..."}`
          );
          let meta = { name: theme, description: '' };
          try {
            meta = JSON.parse(metaText.replace(/```json\n?|\n?```/g, '').trim());
          } catch {}
          return NextResponse.json({ result: { ids: Array.isArray(ids) ? ids : [], ...meta } });
        } catch {
          return NextResponse.json({ result: null, raw: text });
        }
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
