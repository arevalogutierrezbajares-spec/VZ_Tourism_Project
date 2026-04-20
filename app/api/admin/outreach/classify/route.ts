import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, CLAUDE_MODEL } from '@/lib/claude/client';
import { getById, updateRecord } from '@/lib/outreach-store';
import { requireAdmin } from '@/lib/api/require-auth';

const CLASSIFIER_SYSTEM = `Eres un experto en análisis de respuestas B2B para ventas SaaS de turismo.
Tu tarea: clasificar respuestas de negocios venezolanos a mensajes de outreach de VZ Explorer.

Clasificaciones:
- "interested": muestran interés, piden más info, quieren reunión, preguntan sobre precios con intención de avanzar
- "question": tienen preguntas neutrales (precios, cómo funciona, diferencias con otras plataformas) sin señales claras de rechazo
- "not_interested": rechazan, no tienen tiempo, no les interesa, ya tienen suficientes canales
- "uncertain": respuesta ambigua, necesita seguimiento, no está claro

Responde ÚNICAMENTE con JSON válido en este formato exacto:
{
  "classification": "interested|question|not_interested|uncertain",
  "confidence": 0.0-1.0,
  "reasoning": "breve explicación en español",
  "suggested_reply": "respuesta sugerida en español venezolano, máx 4 líneas, apropiada para el canal"
}`;

// Simulated responses for demo
const SAMPLE_RESPONSES = [
  {
    text: '¡Hola! Nos interesa mucho su propuesta. ¿Cuándo podemos tener una reunión virtual para conocer más detalles?',
    expected: 'interested',
  },
  {
    text: 'Buenos días. ¿Cuál es la comisión exacta? ¿Cómo se compara con Booking.com en términos de visibilidad?',
    expected: 'question',
  },
  {
    text: 'Gracias por contactarnos, pero no estamos interesados en este momento.',
    expected: 'not_interested',
  },
  {
    text: 'Interesante. Déjanos pensarlo y te contactamos.',
    expected: 'uncertain',
  },
  {
    text: '¡Me parece excelente la idea! Somos un hotel boutique y siempre buscamos nuevos canales. ¿Tienen alguna presentación?',
    expected: 'interested',
  },
];

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const { outreach_id, response_text, simulate = false } = body;

  if (!outreach_id) {
    return NextResponse.json({ error: 'outreach_id is required' }, { status: 400 });
  }

  const record = getById(outreach_id);
  if (!record) {
    return NextResponse.json({ error: 'Outreach record not found' }, { status: 404 });
  }

  let textToClassify = response_text;

  // Simulation mode: generate a random response
  if (simulate) {
    const sample = SAMPLE_RESPONSES[Math.floor(Math.random() * SAMPLE_RESPONSES.length)];
    textToClassify = sample.text;
  }

  if (!textToClassify) {
    return NextResponse.json({ error: 'response_text is required (or use simulate: true)' }, { status: 400 });
  }

  const client = getAnthropicClient();
  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: CLASSIFIER_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Negocio: ${record.business_name}
Canal: ${record.channel}
Mensaje enviado: ${record.message_text}

Respuesta recibida: ${textToClassify}

Clasifica esta respuesta y genera un reply sugerido.`,
      },
    ],
  });

  const rawText = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  let parsed: {
    classification: string;
    confidence: number;
    reasoning: string;
    suggested_reply: string;
  };

  try {
    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 });
  }

  // Update the outreach record
  const updated = await updateRecord(outreach_id, {
    response_text: textToClassify,
    response_classification: parsed.classification as 'interested' | 'question' | 'not_interested' | 'uncertain',
    status: 'responded',
    responded_at: new Date().toISOString(),
  });

  return NextResponse.json({
    classification: parsed.classification,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    suggested_reply: parsed.suggested_reply,
    response_text: textToClassify,
    record: updated,
  });
}
