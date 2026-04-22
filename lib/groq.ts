import Groq from 'groq-sdk';

const ALLOWED_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
] as const;

let _client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');
    _client = new Groq({ apiKey });
  }
  return _client;
}

const rawModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
if (!ALLOWED_MODELS.includes(rawModel as typeof ALLOWED_MODELS[number])) {
  console.warn(`[groq] GROQ_MODEL "${rawModel}" not in allowlist, defaulting to llama-3.3-70b-versatile`);
}
export const GROQ_MODEL = ALLOWED_MODELS.includes(rawModel as typeof ALLOWED_MODELS[number])
  ? rawModel
  : 'llama-3.3-70b-versatile';
