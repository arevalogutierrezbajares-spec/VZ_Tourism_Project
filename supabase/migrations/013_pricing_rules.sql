-- Migration 013: Add pricing rules to posada knowledge base
-- Adds structured pricing configuration (seasonal, weekend, long-stay, last-minute)
-- so the AI concierge can quote accurate, dynamic prices to guests.

ALTER TABLE posada_knowledge
  ADD COLUMN IF NOT EXISTS pricing_rules JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN posada_knowledge.pricing_rules IS
  'Structured pricing rules: seasonal periods, weekend premium, long-stay discounts, last-minute discounts.';
