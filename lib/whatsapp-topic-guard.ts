/**
 * Topic guard — blocks off-topic, adversarial, and harmful messages
 * BEFORE they reach the AI. Returns a canned deflection or null (= allow).
 *
 * Defense-in-depth: this runs in addition to prompt-level instructions,
 * because LLMs (especially smaller ones) are unreliable at self-policing.
 */

// ─── Blocked content patterns ────────────────────────────────────────────────
// Each entry: [regex, category]. Categories help with logging / escalation.

const BLOCKED_PATTERNS: [RegExp, string][] = [
  // Prompt injection / jailbreak attempts
  [/ignore\s+(all\s+)?(previous\s+)?instructions?/i, 'injection'],
  [/disregard\s+(all\s+)?(previous\s+)?instructions?/i, 'injection'],
  [/forget\s+(all\s+)?(previous\s+)?(your\s+)?instructions?/i, 'injection'],
  [/new\s+instructions?\s*:/i, 'injection'],
  [/you\s+are\s+now\s+/i, 'injection'],
  [/pretend\s+(you\s+are|to\s+be)/i, 'injection'],
  [/act\s+as\s+(if\s+you\s+are\s+)?(a\s+)?(an\s+)?(my\s+)?\w+\s*(assistant|ai|bot|gpt|chatbot|system|model)/i, 'injection'],
  [/roleplay\s+as/i, 'injection'],
  [/switch\s+to\s+.*mode/i, 'injection'],
  [/enter\s+.*mode/i, 'injection'],
  [/developer\s+mode/i, 'injection'],
  [/dan\s+mode/i, 'injection'],
  [/jailbreak/i, 'injection'],
  [/bypass\s+(your\s+)?(rules|filters|restrictions)/i, 'injection'],
  [/what\s+are\s+your\s+(system\s+)?instructions/i, 'injection'],
  [/show\s+(me\s+)?your\s+(system\s+)?prompt/i, 'injection'],
  [/reveal\s+your\s+(system\s+)?prompt/i, 'injection'],
  [/repeat\s+(your\s+)?(system\s+)?prompt/i, 'injection'],
  // Spanish injection
  [/ignora\s+(todas?\s+)?(las?\s+)?instrucciones/i, 'injection'],
  [/olvida\s+(todas?\s+)?(las?\s+)?instrucciones/i, 'injection'],
  [/ahora\s+eres\s+/i, 'injection'],
  [/finge\s+(que\s+)?eres/i, 'injection'],
  [/muestra\s+(tu\s+)?prompt/i, 'injection'],

  // Requests to generate code
  [/write\s+(me\s+)?(a\s+)?(python|javascript|java|code|script|program|function|class)/i, 'code'],
  [/generate\s+(a\s+)?(python|javascript|code|script|program|sql|html|css)/i, 'code'],
  [/escribe\s+(un\s+)?(código|script|programa|función)/i, 'code'],
  [/programa\s+en\s+(python|java|c\+\+)/i, 'code'],
  [/debug\s+(this|my)\s+code/i, 'code'],
  [/fix\s+(this|my)\s+code/i, 'code'],

  // Requests for creative writing (non-hospitality)
  [/write\s+(me\s+)?(a\s+)?(poem|essay|story|song|rap|letter|speech)\b/i, 'creative'],
  [/escribe\s+(me\s+)?(un\s+)?(poema|ensayo|cuento|canción|carta|discurso)\b/i, 'creative'],
  [/compose\s+(a\s+)?(poem|essay|story|song|letter)/i, 'creative'],

  // Harmful content requests
  [/\b(hitler|nazi|holocaust|genocide|terrorism|terroris[tm])\b/i, 'harmful'],
  [/how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|explosive|drug|poison)/i, 'harmful'],
  [/como\s+(hacer|fabricar|crear)\s+(una?\s+)?(bomba|arma|explosivo|droga|veneno)/i, 'harmful'],
  [/\b(suicide|suicid[aio])\b/i, 'harmful'],
  [/\b(kill|murder|asesinar|matar)\s+(someone|people|persona|gente)/i, 'harmful'],

  // Off-topic general knowledge probes
  [/what\s+is\s+the\s+(capital|population|president)\s+of\s+(?!venezuela|vzla)/i, 'offtopic'],
  [/solve\s+(this\s+)?(math|equation|problem)/i, 'offtopic'],
  [/calculate\s+/i, 'offtopic'],
  [/what\s+is\s+\d+\s*[\+\-\*\/×÷]\s*\d+/i, 'offtopic'],
  [/explain\s+(quantum|relativity|blockchain|crypto|bitcoin)/i, 'offtopic'],
  [/tell\s+me\s+(a\s+)?joke/i, 'offtopic'],
  [/cuéntame\s+un\s+chiste/i, 'offtopic'],
  [/who\s+won\s+the\s+/i, 'offtopic'],
  [/quién\s+ganó\s+/i, 'offtopic'],
];

// ─── On-topic signals ────────────────────────────────────────────────────────
// If ANY of these match, the message is likely on-topic and we skip blocking.
// This prevents false positives (e.g. "can you calculate the total for 3 nights?").

const ON_TOPIC_SIGNALS = [
  // Accommodation
  /\b(room|rooms|habitaci[oó]n|habitaciones|suite|cama|bed|cabin|cabaña)\b/i,
  /\b(book|booking|reserv|check.?in|check.?out|stay|night|noche|noches)\b/i,
  /\b(price|precio|rate|tarifa|cost|costo|per\s+night|por\s+noche|disponib)/i,
  /\b(availab|vacancy|vacante|libre)\b/i,
  // Property / hospitality
  /\b(hotel|posada|inn|lodge|hostel|accommodation|alojamiento)\b/i,
  /\b(amenit|wifi|pool|piscina|breakfast|desayuno|parking|restaurant)\b/i,
  /\b(guest|huésped|visitor|visitante)\b/i,
  // Tourism / Venezuela
  /\b(venezuela|vzla|caracas|mérida|merida|margarita|los\s+roques|canaima|angel\s+falls)\b/i,
  /\b(tour|excursion|excursión|trip|viaje|travel|viajar|visit|visitar|turismo|tourism)\b/i,
  /\b(beach|playa|mountain|montaña|park|parque|museum|museo|restaurant|restaurante)\b/i,
  /\b(transport|taxi|bus|flight|vuelo|airport|aeropuerto)\b/i,
  // Logistics
  /\b(address|dirección|location|ubicación|how\s+to\s+get|cómo\s+llegar|map|mapa)\b/i,
  /\b(weather|clima|pack|llevar|season|temporada)\b/i,
  /\b(payment|pago|deposit|depósito|cancel|cancela|refund|reembolso)\b/i,
  // Greetings & polite
  /^(hi|hello|hey|hola|buenos?\s+d[ií]as?|buenas?\s+(tardes?|noches?)|saludos|ciao|bonjour|buongiorno|bom\s+dia)/i,
  /\b(thank|graci|merci|grazie|obrigad)\b/i,
];

export interface TopicGuardResult {
  blocked: boolean;
  category: string | null;  // injection | code | creative | harmful | offtopic
  deflection: string | null;
}

/**
 * Check if a message should be blocked before reaching the AI.
 * Returns { blocked: false } for on-topic messages.
 */
export function checkTopicGuard(
  text: string,
  providerName: string,
  detectedLang?: string | null,
): TopicGuardResult {
  const PASS: TopicGuardResult = { blocked: false, category: null, deflection: null };

  if (!text || text.trim().length < 3) return PASS;

  // Check on-topic signals first — if present, allow the message through
  const hasOnTopicSignal = ON_TOPIC_SIGNALS.some(re => re.test(text));

  // Check blocked patterns
  for (const [pattern, category] of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      // If it's merely off-topic but has hospitality context, allow it
      if (category === 'offtopic' && hasOnTopicSignal) continue;

      // Harmful content is always blocked regardless of context
      // Injection and code are always blocked
      // Creative is blocked unless it has on-topic signal
      if (category === 'creative' && hasOnTopicSignal) continue;

      return {
        blocked: true,
        category,
        deflection: getDeflection(category, providerName, detectedLang),
      };
    }
  }

  return PASS;
}

function getDeflection(
  category: string,
  providerName: string,
  detectedLang?: string | null,
): string {
  // Build response in the guest's language (Spanish is the default fallback)
  const isEn = detectedLang === 'en';
  const isIt = detectedLang === 'it';
  const isPt = detectedLang === 'pt';
  const isFr = detectedLang === 'fr';

  if (category === 'harmful') {
    if (isEn) return `I'm not able to help with that. I'm here to assist with your stay at ${providerName} and travel in Venezuela. How can I help you?`;
    if (isIt) return `Non posso aiutarti con questo. Sono qui per assisterti con il tuo soggiorno a ${providerName} e i viaggi in Venezuela. Come posso aiutarti?`;
    if (isPt) return `Não posso ajudar com isso. Estou aqui para ajudar com sua estadia em ${providerName} e viagens na Venezuela. Como posso ajudá-lo?`;
    if (isFr) return `Je ne peux pas vous aider avec cela. Je suis ici pour vous aider avec votre séjour à ${providerName} et vos voyages au Venezuela. Comment puis-je vous aider ?`;
    return `No puedo ayudarte con eso. Estoy aquí para asistirte con tu estadía en ${providerName} y viajes en Venezuela. ¿En qué puedo ayudarte?`;
  }

  // Default: polite redirect for injection, code, creative, offtopic
  if (isEn) return `I'm here to help with your stay at ${providerName} and travel in Venezuela. Do you have any questions about the property, rooms, or your trip?`;
  if (isIt) return `Sono qui per aiutarti con il tuo soggiorno a ${providerName} e i viaggi in Venezuela. Hai domande sulla struttura, le camere o il tuo viaggio?`;
  if (isPt) return `Estou aqui para ajudar com sua estadia em ${providerName} e viagens na Venezuela. Tem alguma pergunta sobre a propriedade, quartos ou sua viagem?`;
  if (isFr) return `Je suis ici pour vous aider avec votre séjour à ${providerName} et vos voyages au Venezuela. Avez-vous des questions sur l'établissement, les chambres ou votre voyage ?`;
  return `Estoy aquí para ayudarte con tu estadía en ${providerName} y turismo en Venezuela. ¿Tienes alguna pregunta sobre la posada, habitaciones o tu viaje?`;
}
