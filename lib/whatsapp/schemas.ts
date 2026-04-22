import { z } from 'zod';

export const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().min(1).max(4096),
});

export const ConfigUpdateSchema = z.object({
  phone_number_id: z.string().optional(),
  access_token: z.string().optional(),
  persona_name: z.string().max(100).optional(),
  persona_bio: z.string().max(500).optional(),
  greeting_style: z.enum(['friendly', 'professional', 'warm']).optional(),
  custom_greeting: z.string().max(500).nullable().optional(),
  tone_formality: z.enum(['formal', 'casual', 'neutral']).optional(),
  tone_language: z.enum(['es', 'en', 'bilingual', 'auto']).optional(),
  response_length: z.enum(['brief', 'standard', 'detailed']).optional(),
  booking_pressure: z.enum(['soft', 'direct']).optional(),
  emoji_style: z.enum(['none', 'moderate', 'heavy']).optional(),
  upsell_enabled: z.boolean().optional(),
  sentiment_threshold: z.number().min(0).max(1).optional(),
  value_escalation_usd: z.number().min(0).optional(),
  escalation_keywords: z.array(z.string()).optional(),
  response_delay_ms: z.number().min(0).max(30000).optional(),
  working_hours_enabled: z.boolean().optional(),
  working_hours: z.record(z.string(), z.unknown()).nullable().optional(),
  after_hours_message: z.string().max(500).nullable().optional(),
  custom_instructions: z.string().max(2000).nullable().optional(),
  ai_enabled: z.boolean().optional(),
  verify_token: z.string().optional(),
});

export const EmbeddedSignupSchema = z.object({
  code: z.string().min(1),
  phone_number_id: z.string().min(1),
  waba_id: z.string().min(1),
});

export const TestReplySchema = z.object({
  message: z.string().min(1).max(1000),
  config: z.record(z.string(), z.unknown()).optional(),
  knowledge: z.record(z.string(), z.unknown()).optional(),
  provider_name: z.string().optional(),
});

export const KnowledgeUpdateSchema = z.object({
  property_description: z.string().nullable().optional(),
  location_details: z.string().nullable().optional(),
  room_types: z.array(z.record(z.string(), z.unknown())).optional(),
  amenities: z.array(z.string()).optional(),
  policies: z.record(z.string(), z.unknown()).optional(),
  faqs: z.array(z.record(z.string(), z.unknown())).optional(),
  booking_process: z.string().nullable().optional(),
  payment_methods: z.array(z.string()).optional(),
  nearby_attractions: z.string().nullable().optional(),
  languages_spoken: z.array(z.string()).optional(),
  special_notes: z.string().nullable().optional(),
  pricing_rules: z.record(z.string(), z.unknown()).optional(),
});
