// Lightweight sentiment / control filter — no external API, zero cost.
// Scores inbound messages and flags rude, threatening, or abusive content.
// Bilingual (ES + EN) — covers the main VZ posada guest languages.

const RUDE_ES = [
  'idiota','imbécil','estúpido','estupida','maldito','maldita','carajo','coño',
  'puta','puto','marico','marica','pendejo','pendeja','joder','cállate',
  'mentiroso','mentirosa','ladrón','ladrona','fraude','estafa','estafador',
  'inútil','inutil','basura','asco','asqueroso','desgraciado',
];

const RUDE_EN = [
  'idiot','stupid','moron','asshole','bastard','bitch','shit','crap','damn',
  'scam','fraud','liar','useless','garbage','disgusting','terrible','worst',
  'horrible','pathetic','incompetent','rip-off','ripoff','con','cheat',
];

const THREAT_ES = [
  'te voy a denunciar','voy a demandar','llamo a la policía','llamo a policia',
  'te mato','te voy a matar','destruiré','te destruyo','publicaré',
];

const THREAT_EN = [
  'sue you','lawyer','police','report you','destroy you','kill you',
  'i will kill','going to kill','blast you','expose you',
];

const BOT_QUESTIONS_ES = [
  'eres un bot','eres humano','eres una ia','eres inteligencia artificial',
  'estoy hablando con','hablas con robot','es automatico','es automático',
];

const BOT_QUESTIONS_EN = [
  'are you a bot','are you human','are you ai','are you real','talking to a robot',
  'is this automated','is this a bot','are you automated',
];

export interface SentimentResult {
  score: number;           // 0.0 (very negative) → 1.0 (very positive)
  flagged: boolean;
  flag_reason: string | null;
  is_bot_question: boolean;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function countMatches(text: string, terms: string[]): number {
  return terms.reduce((n, term) => n + (text.includes(normalize(term)) ? 1 : 0), 0);
}

export function analyzeMessage(content: string): SentimentResult {
  const t = normalize(content);

  const rudeHits   = countMatches(t, [...RUDE_ES,   ...RUDE_EN]);
  const threatHits  = countMatches(t, [...THREAT_ES,  ...THREAT_EN]);
  const botHits     = countMatches(t, [...BOT_QUESTIONS_ES, ...BOT_QUESTIONS_EN]);

  // Score: start at 0.8 (neutral-positive baseline), penalize negatives
  let score = 0.8 - rudeHits * 0.15 - threatHits * 0.25;
  score = Math.max(0, Math.min(1, score));

  const flagged = score < 0.45 || threatHits > 0;
  let flag_reason: string | null = null;

  if (threatHits > 0) {
    flag_reason = 'threatening_language';
  } else if (rudeHits >= 2) {
    flag_reason = 'abusive_language';
  } else if (rudeHits === 1) {
    flag_reason = 'rude_language';
  }

  return { score, flagged, flag_reason, is_bot_question: botHits > 0 };
}
