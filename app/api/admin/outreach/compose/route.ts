import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, CLAUDE_MODEL } from '@/lib/claude/client';
import { loadAll } from '@/lib/admin-store';
import { requireAdmin } from '@/lib/api/require-auth';

const COMPOSER_SYSTEM = `Eres un experto en ventas B2B y relaciones con hoteles, restaurantes y operadores turísticos venezolanos.
Tu tarea es redactar mensajes de outreach PERSONALIZADOS para invitar a negocios a unirse a VZ Explorer como socios fundadores.

VZ Explorer es la primera plataforma de turismo digital enfocada en Venezuela. Ofrece:
- Comisiones del 8% (vs 15-20% en plataformas internacionales)
- Panel de gestión propio para el negocio
- Visibilidad en la primera plataforma turística venezolana
- Soporte en español 24/7
- Condiciones de socio fundador: comisión reducida permanente + badge de fundador

REGLAS CRÍTICAS:
- Escribe en español venezolano natural (no formal extremo)
- Menciona UN detalle específico del negocio para demostrar que lo conoces
- Tono: cálido y profesional (no vendedor agresivo)
- NUNCA menciones competidores directamente
- El mensaje debe sentirse personal, no masivo

Para WhatsApp: máximo 3-4 líneas, casual, emoji moderado (1-2 max)
Para Instagram DM: máximo 2-3 líneas, muy breve, 1-2 emojis, call-to-action claro
Para Email: estructura formal breve: saludo, propuesta, beneficio clave, CTA. Máximo 5 párrafos cortos.`;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const { business_id, channels = ['whatsapp', 'instagram', 'email'] } = body;

  if (!business_id) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
  }

  const listings = loadAll();
  const business = listings.find((l) => l.id === business_id);
  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const businessContext = `
Nombre del negocio: ${business.name}
Tipo: ${business.type}
Ciudad: ${business.city}, ${business.region}
Calificación: ${business.avg_rating ?? 'N/A'}/5 (${business.review_count ?? 0} reseñas)
Teléfono: ${business.phone ?? 'No disponible'}
Website: ${business.website ?? 'No disponible'}
Instagram: ${business.instagram_handle ? '@' + business.instagram_handle : 'No disponible'}
Descripción: ${business.description ?? 'Sin descripción'}
Tags: ${(business.category_tags ?? []).join(', ') || 'Sin tags'}
`.trim();

  const client = getAnthropicClient();
  const results: Record<string, string> = {};

  const channelPrompts: Record<string, string> = {
    whatsapp: `Redacta un mensaje de WhatsApp para invitar a "${business.name}" a ser socio fundador de VZ Explorer. Máximo 4 líneas, casual pero profesional, 1-2 emojis.`,
    instagram: `Redacta un Instagram DM para invitar a "${business.name}" a ser socio fundador de VZ Explorer. Máximo 3 líneas, muy conciso, 1-2 emojis, CTA claro.`,
    email: `Redacta un email completo para invitar a "${business.name}" a ser socio fundador de VZ Explorer. Incluye: línea de asunto (prefix con "Asunto:"), saludo, propuesta personalizada, 1-2 beneficios clave, CTA y firma "Equipo VZ Explorer". Máximo 200 palabras.`,
  };

  for (const channel of channels) {
    if (!channelPrompts[channel]) continue;

    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system: COMPOSER_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Información del negocio:\n${businessContext}\n\n${channelPrompts[channel]}`,
        },
      ],
    });

    const text = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    results[channel] = text.trim();
  }

  // Parse email subject if present
  let emailSubject = `Invitación a ser Socio Fundador de VZ Explorer — ${business.name}`;
  let emailBody = results.email ?? '';
  if (emailBody.startsWith('Asunto:')) {
    const lines = emailBody.split('\n');
    emailSubject = lines[0].replace('Asunto:', '').trim();
    emailBody = lines.slice(1).join('\n').trim();
    results.email = emailBody;
  }

  return NextResponse.json({
    business_id,
    business_name: business.name,
    whatsapp_message: results.whatsapp ?? null,
    instagram_dm: results.instagram ?? null,
    email_subject: emailSubject,
    email_body: emailBody,
  });
}
