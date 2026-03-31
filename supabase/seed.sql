-- Seed data for Venezuela Tourism SuperApp
-- Note: auth.users must be created via Supabase Auth API in production
-- This seed assumes UUIDs are pre-generated

-- Sample user IDs (would be created via Supabase Auth)
DO $$
DECLARE
  tourist1_id UUID := '11111111-1111-1111-1111-111111111101';
  tourist2_id UUID := '11111111-1111-1111-1111-111111111102';
  provider1_id UUID := '11111111-1111-1111-1111-111111111103';
  provider2_id UUID := '11111111-1111-1111-1111-111111111104';
  provider3_id UUID := '11111111-1111-1111-1111-111111111105';
  admin1_id UUID := '11111111-1111-1111-1111-111111111106';

  prov1_id UUID := uuid_generate_v4();
  prov2_id UUID := uuid_generate_v4();
  prov3_id UUID := uuid_generate_v4();

  listing1_id UUID := uuid_generate_v4();
  listing2_id UUID := uuid_generate_v4();
  listing3_id UUID := uuid_generate_v4();
  listing4_id UUID := uuid_generate_v4();
  listing5_id UUID := uuid_generate_v4();
BEGIN

-- Users
INSERT INTO users (id, email, full_name, role, nationality, preferred_language) VALUES
  (tourist1_id, 'carlos.rodriguez@example.com', 'Carlos Rodríguez', 'tourist', 'VE', 'es'),
  (tourist2_id, 'maria.garcia@example.com', 'María García', 'tourist', 'CO', 'es'),
  (provider1_id, 'luis.mendez@ecolodge.com', 'Luis Méndez', 'provider', 'VE', 'es'),
  (provider2_id, 'ana.morales@divelos.com', 'Ana Morales', 'provider', 'VE', 'es'),
  (provider3_id, 'pedro.castellano@gastrotours.com', 'Pedro Castellano', 'provider', 'VE', 'es'),
  (admin1_id, 'admin@vz-tourism.com', 'Admin User', 'admin', 'VE', 'en')
ON CONFLICT (id) DO NOTHING;

-- Providers
INSERT INTO providers (id, user_id, business_name, description, is_verified, is_approved, region, instagram_handle, rating) VALUES
  (prov1_id, provider1_id, 'Andes EcoLodge Mérida', 'Family-run eco-lodge in the Venezuelan Andes offering authentic mountain experiences, trekking tours, and birdwatching expeditions. We specialize in sustainable tourism and work closely with local communities.', TRUE, TRUE, 'Mérida', 'andesecolodge', 4.8),
  (prov2_id, provider2_id, 'Los Roques Dive School', 'Premier diving school in Los Roques Archipelago. PADI certified instructors, equipment rental, and guided snorkeling tours to the most spectacular reefs in the Caribbean.', TRUE, TRUE, 'Los Roques', 'losroquesdive', 4.9),
  (prov3_id, provider3_id, 'Caracas Gastro Tours', 'Culinary tourism company showcasing the best of Venezuelan gastronomy through immersive food tours, cooking classes, and market visits in Caracas and surroundings.', TRUE, TRUE, 'Caracas', 'caracasgastro', 4.7)
ON CONFLICT (id) DO NOTHING;

-- Listings
INSERT INTO listings (id, provider_id, title, slug, description, short_description, category, tags, region, location_name, latitude, longitude, price_usd, duration_hours, max_guests, min_guests, is_published, is_featured, safety_level, rating, total_reviews, amenities, languages, includes, excludes, cancellation_policy, cover_image_url) VALUES
  (listing1_id, prov1_id, 'Mérida Andes Trek & Waterfall Discovery', 'merida-andes-trek-waterfall-discovery',
   'Explore the breathtaking Andes mountains of Mérida on this full-day trekking adventure. Trek through cloud forests, discover hidden waterfalls, and enjoy panoramic views of the Chama Valley. Our experienced guides will introduce you to local flora, fauna, and the indigenous Timoto-Cuica culture that once thrived in these mountains. The trail moderate difficulty level makes it accessible to most fitness levels while still offering a genuine wilderness experience.',
   'Full-day Andes trekking with waterfalls, cloud forests, and panoramic valley views.',
   'mountains', ARRAY['hiking', 'trekking', 'waterfalls', 'nature', 'photography', 'eco-friendly'],
   'Mérida', 'Sierra Nevada de Mérida', 8.6, -71.15, 65.00, 8, 12, 2,
   TRUE, TRUE, 'green', 4.8, 24,
   ARRAY['Guide included', 'First Aid', 'Equipment rental', 'Photography'],
   ARRAY['es', 'en'],
   ARRAY['Professional guide', 'Hiking poles rental', 'Packed lunch', 'Water', 'Safety equipment'],
   ARRAY['Transportation to meeting point', 'Personal travel insurance', 'Tips'],
   'moderate',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800'),

  (listing2_id, prov2_id, 'Los Roques Snorkeling & Beach Hopping', 'los-roques-snorkeling-beach-hopping',
   'Experience the unparalleled beauty of Los Roques National Park on this full-day water adventure. Visit multiple cays with crystal-clear turquoise waters, snorkel over vibrant coral reefs teeming with tropical fish, and relax on pristine white sand beaches. Our experienced captain knows all the secret spots that most tourists never discover. Perfect for all skill levels - beginners and experienced snorkelers alike will be amazed.',
   'Full-day boat tour of Los Roques with snorkeling over coral reefs and beach exploration.',
   'beaches', ARRAY['snorkeling', 'beaches', 'boat-tour', 'wildlife', 'family-friendly'],
   'Los Roques', 'Los Roques Archipelago', 11.85, -66.75, 120.00, 9, 10, 2,
   TRUE, TRUE, 'green', 4.9, 47,
   ARRAY['Equipment rental', 'Guide included', 'First Aid'],
   ARRAY['es', 'en'],
   ARRAY['Boat transport between islands', 'Full snorkeling equipment', 'Lunch', 'Soft drinks', 'PADI certified guide'],
   ARRAY['Airfare to Los Roques', 'Accommodation', 'Personal expenses'],
   'flexible',
   'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800'),

  (listing3_id, prov3_id, 'Caracas Food Tour: Arepas to Fine Dining', 'caracas-food-tour-arepas-fine-dining',
   'Discover the extraordinary diversity of Venezuelan cuisine on this comprehensive food tour through Caracas. Begin with street food classics like arepas, empanadas, and cachapas in the historic center, then explore the Mercado El Hatillo for artisan cheeses and traditional sweets. End with a seated meal at one of Caracas'' acclaimed restaurants where modern Venezuelan chefs are reinventing traditional recipes. A feast for all the senses that showcases Venezuela''s rich culinary heritage.',
   'Immersive gastronomy tour through Caracas from street food classics to upscale Venezuelan cuisine.',
   'gastronomy', ARRAY['food-tour', 'cultural', 'street-food', 'cooking-class', 'history'],
   'Caracas', 'Altamira, Caracas', 10.48, -66.88, 85.00, 5, 8, 2,
   TRUE, FALSE, 'yellow', 4.7, 31,
   ARRAY['Tour Desk', 'WiFi'],
   ARRAY['es', 'en'],
   ARRAY['All tastings and meals included', 'Expert foodie guide', 'Market visit', 'Recipe booklet'],
   ARRAY['Transportation', 'Beverages beyond included', 'Tips'],
   'moderate',
   'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'),

  (listing4_id, prov1_id, 'Mérida Cable Car & Pico Espejo Sunrise', 'merida-cable-car-pico-espejo-sunrise',
   'Witness one of the most spectacular sunrises in South America from Pico Espejo at 4,765 meters above sea level. Ride the world''s longest aerial cable car system through multiple climate zones, from tropical foothills to high-altitude páramo. Watch the Andes wake up as golden light floods the valleys below. Our guide will explain the unique ecosystem of the Venezuelan páramo and the importance of water conservation in these highlands.',
   'Sunrise cable car experience to Pico Espejo at 4,765m with panoramic Andes views.',
   'mountains', ARRAY['cable-car', 'sunrise', 'hiking', 'photography', 'adventure'],
   'Mérida', 'Teleférico de Mérida', 8.6, -71.16, 95.00, 6, 8, 1,
   TRUE, TRUE, 'green', 4.9, 18,
   ARRAY['Guide included', 'Equipment rental', 'First Aid'],
   ARRAY['es', 'en'],
   ARRAY['Cable car tickets', 'Warm clothing rental', 'Hot chocolate', 'Experienced mountain guide'],
   ARRAY['Transportation to base station', 'Personal medication for altitude'],
   'strict',
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'),

  (listing5_id, prov2_id, 'PADI Open Water Diving Course Los Roques', 'padi-open-water-diving-course-los-roques',
   'Earn your PADI Open Water Diver certification in the crystal-clear waters of Los Roques, one of the Caribbean''s premier dive destinations. Over 4 days, complete your theory, confined water dives, and four open water dives with professional PADI instructors. The exceptional visibility and calm conditions of Los Roques make it an ideal learning environment. Upon completion, you''ll be certified to dive anywhere in the world to 18 meters.',
   'Complete PADI Open Water certification course in 4 days at Los Roques Archipelago.',
   'adventure', ARRAY['diving', 'certification', 'adventure', 'water-sports', 'eco-friendly'],
   'Los Roques', 'Los Roques Dive Center', 11.85, -66.76, 450.00, 32, 4, 1,
   TRUE, FALSE, 'green', 4.8, 12,
   ARRAY['Equipment rental', 'Guide included', 'WiFi', 'First Aid', 'Insurance'],
   ARRAY['es', 'en'],
   ARRAY['PADI certification fees', 'All diving equipment', 'Accommodation 4 nights', 'All meals', 'PADI digital logbook'],
   ARRAY['Flights to Los Roques', 'Personal items', 'Tips'],
   'non-refundable',
   'https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800')
ON CONFLICT (id) DO NOTHING;

-- Safety zones
INSERT INTO safety_zones (name, description, level, region, geometry, tips, emergency_contacts) VALUES
  ('Los Roques Archipelago', 'Protected national park with excellent safety record for tourists. Regular coast guard presence and regulated tourism.',
   'green', 'Los Roques',
   ST_Multi(ST_GeomFromText('POLYGON((-67.5 11.5, -66.0 11.5, -66.0 12.2, -67.5 12.2, -67.5 11.5))', 4326)),
   ARRAY['Always wear lifejackets on boats', 'Register with local authorities', 'Carry sun protection', 'Stay hydrated'],
   '[{"name": "Coast Guard Los Roques", "phone": "+58-212-555-0001", "type": "police"}, {"name": "Los Roques Clinic", "phone": "+58-212-555-0002", "type": "hospital"}]'::jsonb),

  ('Mérida City Center', 'University city with active academic community. Generally safe for tourists with normal precautions.',
   'green', 'Mérida',
   ST_Multi(ST_GeomFromText('POLYGON((-71.25 8.55, -71.05 8.55, -71.05 8.7, -71.25 8.7, -71.25 8.55))', 4326)),
   ARRAY['Keep valuables secure', 'Use official taxis', 'Be aware at night downtown'],
   '[{"name": "Police Mérida", "phone": "+58-274-555-0001", "type": "police"}, {"name": "Hospital Universitario", "phone": "+58-274-555-0002", "type": "hospital"}]'::jsonb),

  ('Gran Sabana', 'Remote wilderness area. Generally safe but requires preparation for long distances and limited services.',
   'yellow', 'Gran Sabana',
   ST_Multi(ST_GeomFromText('POLYGON((-62.0 4.5, -60.5 4.5, -60.5 6.5, -62.0 6.5, -62.0 4.5))', 4326)),
   ARRAY['Travel with experienced guide', 'Carry extra fuel and water', 'Register route with authorities', 'Satellite phone recommended'],
   '[{"name": "GNB Checkpoint Gran Sabana", "phone": "+58-289-555-0001", "type": "police"}]'::jsonb),

  ('Caracas Altamira', 'Upscale area of Caracas with restaurants, hotels and commercial centers. Exercise normal caution.',
   'yellow', 'Caracas',
   ST_Multi(ST_GeomFromText('POLYGON((-66.92 10.48, -66.83 10.48, -66.83 10.53, -66.92 10.53, -66.92 10.48))', 4326)),
   ARRAY['Use app-based transportation', 'Avoid displaying valuables', 'Stay in well-lit areas at night', 'Keep emergency contacts handy'],
   '[{"name": "Police Chacao", "phone": "+58-212-555-0001", "type": "police"}, {"name": "Clinica El Avila", "phone": "+58-212-276-1111", "type": "hospital"}]'::jsonb);

END $$;
