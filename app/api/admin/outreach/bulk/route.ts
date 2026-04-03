import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, CLAUDE_MODEL } from '@/lib/claude/client';
import { loadAll } from '@/lib/admin-store';
import { bulkCreate } from '@/lib/outreach-store';

const COMPOSER_SYSTEM = `Eres un experto en ventas B2B especializado en turismo venezolano.
Redacta mensajes de outreach personalizados para invitar a negocios a unirse a VZ Explorer como socios fundadores.
VZ Explorer es la primera plataforma de turismo digital de Venezuela con comisiones del 8%.
Escribe en español venezolano natural. Tono cálido y profesional.
Responde ÚNICAMENTE con el texto del mensaje, sin explicaciones adicionales.`;

async function composeMessage(
  business: { name: string; type: string; city: string; region: string; avg_rating: number | null; review_count: number },
  channel: string
): Promise<string> {
  const client = getAnthropicClient();
  const prompts: Record<string, string> = {
    whatsapp: `Redacta un WhatsApp (máx 4 líneas, 1-2 emojis) para invitar a "${business.name}" (${business.type} en ${business.city}) a ser socio fundador de VZ Explorer.`,
    instagram: `Redacta un Instagram DM (máx 3 líneas, 1-2 emojis) para invitar a "${business.name}" (${business.type} en ${business.city}) a VZ Explorer.`,
    email: `Redacta email breve (máx 150 palabras) para invitar a "${business.name}" (${business.type} en ${business.city}, ${business.avg_rating ?? 'N/A'}★) a ser socio fundador de VZ Explorer. Incluye asunto en primera línea con prefix "Asunto:".`,
  };

  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 400,
    system: COMPOSER_SYSTEM,
    messages: [{ role: 'user', content: prompts[channel] ?? prompts.whatsapp }],
  });

  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    business_ids,
    channel = 'whatsapp',
    schedule = 'immediate',
    preview = false,
  } = body;

  if (!business_ids || !Array.isArray(business_ids) || business_ids.length === 0) {
    return NextResponse.json({ error: 'business_ids array required' }, { status: 400 });
  }

  const listings = loadAll();
  const businesses = listings.filter((l) => business_ids.includes(l.id));

  if (businesses.length === 0) {
    return NextResponse.json({ error: 'No businesses found for given IDs' }, { status: 404 });
  }

  const results: Array<{
    business_id: string;
    business_name: string;
    channel: string;
    message_preview: string;
    status: string;
  }> = [];

  for (const business of businesses) {
    const message = await composeMessage(business, channel);
    results.push({
      business_id: business.id,
      business_name: business.name,
      channel,
      message_preview: message.slice(0, 120) + (message.length > 120 ? '...' : ''),
      status: 'ready',
    });
  }

  if (preview) {
    return NextResponse.json({ preview: results, total: results.length });
  }

  // Queue all messages
  const records = await bulkCreate(
    results.map((r, i) => {
      const biz = businesses.find((b) => b.id === r.business_id)!;
      const delayDays = schedule === 'daily_10' ? Math.floor(i / 10) : 0;
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + delayDays);

      return {
        business_id: r.business_id,
        business_name: r.business_name,
        business_type: biz.type,
        business_region: biz.region,
        channel: channel as 'whatsapp' | 'instagram' | 'email',
        status: 'queued' as const,
        message_text: r.message_preview,
        response_text: null,
        response_classification: null,
        sequence_step: 1,
        sequence_name: 'founding_partner_v1',
        sent_at: null,
        responded_at: null,
        notes: '',
      };
    })
  );

  return NextResponse.json({
    queued: records.length,
    records: records.map((r) => ({ id: r.id, business_name: r.business_name, channel: r.channel })),
  });
}
