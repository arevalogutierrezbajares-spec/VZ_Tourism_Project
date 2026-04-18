-- Itinerary Planning: Google Places integration, source tracking, conversations
-- Migration 009

-- Track where listings were sourced from
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'creator_import', 'scraped', 'admin', 'google_places')),
  ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update existing scraped listings to have correct source
UPDATE listings SET source = 'scraped' WHERE platform_status = 'scraped' AND source = 'manual';

-- Track how each itinerary stop was added + video embeds
ALTER TABLE itinerary_stops
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual'
    CHECK (source_type IN ('social_import', 'document_import', 'ai_suggested', 'manual', 'google_places')),
  ADD COLUMN IF NOT EXISTS video_embed_url TEXT;

-- Track how the itinerary itself was created
ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS creation_method TEXT DEFAULT 'scratch'
    CHECK (creation_method IN ('social_import', 'document_import', 'conversation', 'scratch', 'clone'));

-- Conversation history for client conversational planning (Mode 2)
CREATE TABLE IF NOT EXISTS itinerary_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_conversations_user ON itinerary_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_conversations_itinerary ON itinerary_conversations(itinerary_id);

-- RLS for itinerary_conversations
ALTER TABLE itinerary_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own conversations" ON itinerary_conversations
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all conversations" ON itinerary_conversations
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to update timestamps on conversations
DO $$ BEGIN
  CREATE TRIGGER update_itinerary_conversations_updated_at
    BEFORE UPDATE ON itinerary_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow creators/tourists to insert listings (for Google Places spot creation)
-- They get added with platform_status='scraped' and source='google_places'
DO $$ BEGIN
  CREATE POLICY "Authenticated users can create google_places listings" ON listings
    FOR INSERT WITH CHECK (
      auth.uid() IS NOT NULL
      AND source = 'google_places'
      AND platform_status = 'scraped'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
