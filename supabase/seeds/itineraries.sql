-- Seed itineraries for the Itineraries Marketplace
-- 5 detailed itineraries with real hotels, restaurants, and activities

DO $$
DECLARE
  tourist1_id UUID := '11111111-1111-1111-1111-111111111101';
  tourist2_id UUID := '11111111-1111-1111-1111-111111111102';
  creator1_id UUID := '22222222-2222-2222-2222-222222222201';
  creator2_id UUID := '22222222-2222-2222-2222-222222222202';
  creator3_id UUID := '22222222-2222-2222-2222-222222222203';

  itin_canaima UUID := '33333333-3333-3333-3333-333333333301';
  itin_roques UUID := '33333333-3333-3333-3333-333333333302';
  itin_caracas UUID := '33333333-3333-3333-3333-333333333303';
  itin_margarita UUID := '33333333-3333-3333-3333-333333333304';
  itin_morrocoy UUID := '33333333-3333-3333-3333-333333333305';
BEGIN

-- Creator users
INSERT INTO users (id, email, full_name, role, nationality, preferred_language) VALUES
  (creator1_id, 'venezolanaviajera@example.com', 'Valentina Rojas', 'creator', 'VE', 'es'),
  (creator2_id, 'backpackerben@example.com', 'Ben Thompson', 'creator', 'GB', 'en'),
  (creator3_id, 'luxelatam@example.com', 'Sofia Mendez', 'creator', 'US', 'en')
ON CONFLICT (id) DO NOTHING;

INSERT INTO creator_profiles (user_id, username, bio, instagram_handle, youtube_handle, followers, is_verified) VALUES
  (creator1_id, 'venezolanaviajera', 'Venezuelan travel creator showing the world the beauty of my country. Born in Caracas, based everywhere.', '@venezolanaviajera', '@venezolanaviajera', 125000, TRUE),
  (creator2_id, 'backpackerben', 'Adventure traveler from London. South America specialist. Budget trips that feel like luxury.', '@backpackerben', NULL, 89000, TRUE),
  (creator3_id, 'luxelatam', 'Luxury travel curator for Latin America. Founder of LuxeLatam. Based in Miami.', '@luxelatam', '@luxelatam', 210000, TRUE)
ON CONFLICT (user_id) DO NOTHING;

----------------------------------------------------------------------
-- 1. CANAIMA & ANGEL FALLS (5 days) — creator1, influencer pick
----------------------------------------------------------------------
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, is_influencer_pick, referral_code, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin_canaima, creator1_id,
   'Canaima & Angel Falls: Complete 5-Day Adventure',
   'The definitive Canaima experience. Stay at Campamento Tapuy Lodge on the lagoon, take a curiara upriver to Angel Falls, walk behind Salto El Sapo, and explore the Gran Sabana by 4x4. Real Pemon indigenous guides, real campfire nights under the world''s tallest waterfall.',
   'https://images.unsplash.com/photo-1580767733747-e17c7c72de44?w=800',
   TRUE, TRUE, TRUE, 'venezolanaviajera-canaima',
   5, 1350, ARRAY['Canaima', 'Gran Sabana'], ARRAY['adventure', 'nature', 'waterfall', 'indigenous'],
   487, 802, 6100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours, transport_to_next, notes) VALUES
  -- Day 1
  (itin_canaima, 1, 0,
   'Fly to Canaima + Lagoon Tour',
   'Fly Conviasa from Caracas (CCS to CAJ, ~1hr). Check into Campamento Tapuy Lodge, a 16-room lodge right on Canaima Lagoon built in indigenous Pemon style. All-inclusive meals. Afternoon canoe ride across the lagoon to see the Hacha Falls up close. Dinner at the lodge: grilled chicken with yuca and fresh fruit.',
   'Canaima Lagoon', 6.2386, -62.8433, 350, 5, 'Canoe',
   'Stay: Campamento Tapuy Lodge (~$120/night all-inclusive). Alt: Campamento Canaima (~$150/night). Conviasa flight ~$200 round-trip.'),

  (itin_canaima, 2, 0,
   'Salto El Sapo + Salto El Sapito',
   'Morning boat ride to Salto El Sapo (Frog Falls). Walk BEHIND the curtain of water on a rocky path, you will get soaked. Then visit Salto El Sapito nearby. Lunch on the island: packed lunch from the lodge (fresh bread, ham, tropical fruit). Afternoon free to swim in the lagoon. Dinner at lodge.',
   'Isla Anatoly', 6.2350, -62.8500, 80, 7, 'Motorized canoe',
   'Bring waterproof bags for cameras. The walk behind Sapo is ~100m, slippery but incredible. Pemon guides required.'),

  (itin_canaima, 3, 0,
   'River Journey to Angel Falls Base Camp',
   'Full day upriver in a curiara (motorized dugout canoe) with Pemon guides. 4-5 hours through jungle canyons to Isla Ratoncito camp at the base of Angel Falls. Stops at rapids where you portage the canoe. Camp dinner: fresh fish, rice, beans cooked over fire. Sleep in hammocks at the riverside camp.',
   'Isla Ratoncito', 5.9800, -62.5300, 200, 10, 'Curiara canoe',
   'Hammock camp (bring sleeping bag liner). Basic but magical. You can hear the falls from camp. Guides provide all meals.'),

  (itin_canaima, 4, 0,
   'Angel Falls Hike + Return to Canaima',
   'Early morning 1.5hr hike to the Angel Falls (Salto Angel) viewpoint and natural pool at the base. The world''s tallest waterfall at 979m. Mist spray is constant. Swim in the natural pool if water level allows. Return to camp, pack up, 4-5 hours downriver back to Canaima. Farewell dinner at Campamento Tapuy.',
   'Angel Falls', 5.9701, -62.5362, 200, 10, 'Flight',
   'The viewpoint trail is muddy but manageable. Best photos in the morning before clouds form. Total Angel Falls excursion package ~$300-400pp.'),

  (itin_canaima, 5, 0,
   'Gran Sabana Drive + Departure',
   'If schedule allows, morning 4x4 drive into the Gran Sabana to see Quebrada de Jaspe (a creek flowing over red jasper stone, sacred to the Pemon). Stop at an indigenous community for handmade crafts. Flight back to Caracas in the afternoon.',
   'Gran Sabana', 5.5000, -61.5000, 120, 6, NULL,
   'Quebrada de Jaspe is ~2hrs from Canaima by road. Alt: Waku Lodge also runs Gran Sabana day trips.')
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 2. LOS ROQUES (5 days) — creator3, influencer pick
----------------------------------------------------------------------
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, is_influencer_pick, referral_code, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin_roques, creator3_id,
   'Los Roques: Caribbean Paradise Island Hopping',
   'Five days exploring the most beautiful archipelago in the Caribbean. Stay at Posada Piano y Papaya in Gran Roque, hop between turquoise cays by peñero boat, snorkel pristine reefs, try kitesurfing, and eat fresh lobster on the beach. This is the trip that ruined every other beach for me.',
   'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800',
   TRUE, TRUE, TRUE, 'luxelatam-roques',
   5, 1600, ARRAY['Los Roques'], ARRAY['beach', 'snorkeling', 'luxury', 'kitesurfing'],
   512, 735, 5200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours, transport_to_next, notes) VALUES
  (itin_roques, 1, 0,
   'Arrive Gran Roque + Village Walk',
   'Fly from Caracas to Los Roques (35 min, Conviasa ~$220 roundtrip, max 10kg luggage). Check into Posada Piano y Papaya in Gran Roque village. Afternoon walk through the colorful sandy streets. Sunset from the lighthouse (El Faro) on the hill. Dinner at Restaurante Aquarena on the waterfront: grilled red snapper with tostones.',
   'Gran Roque', 11.9467, -66.6706, 380, 5, 'Peñero boat',
   'Stay: Posada Piano y Papaya (~$143-162/night). Alt: Posada Lagunita (~$309/night luxury). Alt: Posada Acuarela (~$180/night). Restaurant: Aquarena, Bora La Mar, Cafe del Mar.'),

  (itin_roques, 1, 1,
   'Dinner at Bora La Mar',
   'Evening at Bora La Mar restaurant. Fresh lobster pasta, ceviche, and local rum cocktails. One of the best restaurants in Los Roques, right on the beach.',
   'Gran Roque', 11.9467, -66.6706, 55, 2, NULL,
   'Reservations recommended. Lobster pasta ~$25, ceviche ~$15. Cash preferred.'),

  (itin_roques, 2, 0,
   'Cayo de Agua Full Day',
   'Peñero boat to Cayo de Agua (~45 min), the archipelago''s most photographed island. Famous sandbar connecting two islands you can walk across at low tide. Crystal-clear water, perfect snorkeling. Packed lunch on the beach (posada prepares it). Return to Gran Roque for dinner at Cafe del Mar.',
   'Cayo de Agua', 11.8333, -66.8833, 120, 8, 'Peñero boat',
   'Boat transfer ~$30-50pp depending on group size. Bring reef-safe sunscreen. No shade, bring a hat.'),

  (itin_roques, 3, 0,
   'Francisqui + Kitesurfing Lesson',
   'Morning boat to Francisqui, the closest major cay. Snorkeling the reef wall. Then to Madrisqui for a 2-hour kitesurfing intro lesson at Play Los Roques kite school. Lunch: fresh lobster grilled on the beach (the peñero captains cook it). Afternoon swimming at Madrisqui''s calm lagoon.',
   'Francisqui', 11.9000, -66.7500, 250, 8, 'Peñero boat',
   'Kite lesson ~$100-150 for 2hrs at Play Los Roques or Palafito Kiteschool. Lobster lunch ~$20-30pp. Francisqui has a small bar/shack for drinks.'),

  (itin_roques, 4, 0,
   'Crasqui + Noronqui Snorkeling',
   'Full day at the remote western cays. Crasqui has pristine white sand beaches and almost no one else. Noronqui has the best reef snorkeling: sea turtles, rays, tropical fish. Lunch on the boat. Afternoon scuba dive option at Dive Center Los Roques (~$35/dive). Return for farewell dinner at Restaurante Aquarena.',
   'Crasqui', 11.9833, -66.9167, 180, 8, 'Peñero boat',
   'Dive Center Los Roques and Ecobuzos offer 2-tank dives. $10 kitesurfing tax per person. Best snorkeling in the whole archipelago.'),

  (itin_roques, 5, 0,
   'Morning Swim + Departure',
   'Early morning swim at Playa Gran Roque. Last coffee at Cafe del Mar. Buy handmade jewelry from local artisans. Flight back to Caracas.',
   'Gran Roque', 11.9467, -66.6706, 50, 4, NULL,
   'Flight departs early. Pack night before. Max 10kg luggage for return flight. Stock up on rum at the airport shop.')
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 3. CARACAS (4 days) — creator2, influencer pick
----------------------------------------------------------------------
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, is_influencer_pick, referral_code, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin_caracas, creator2_id,
   'Caracas: The Real City Behind the Headlines',
   'Four days discovering a city the world thinks it knows but doesn''t. Hike El Avila at sunrise, eat arepas in every barrio, explore street art in Chacao, and escape to Choroni''s cacao beaches. Stay at Hotel Cayena in Las Mercedes. Caracas is intense, beautiful, and nothing like the news.',
   'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
   TRUE, TRUE, TRUE, 'backpackerben-caracas',
   4, 580, ARRAY['Caracas'], ARRAY['city', 'food', 'culture', 'art', 'hiking'],
   298, 467, 3400)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours, transport_to_next, notes) VALUES
  (itin_caracas, 1, 0,
   'Arrive + Altamira & Las Mercedes Evening',
   'Check into Hotel Cayena in Las Mercedes, one of the safest and most walkable neighborhoods. Walk Altamira''s Plaza Francia and the boulevard. Dinner at La Casa Bistro in Las Mercedes: modern Venezuelan cuisine (pabellon deconstructed, tequeños with guasacaca). After dinner, craft beer at Social Club Cerveceria.',
   'Las Mercedes', 10.4861, -66.8667, 150, 5, 'Metro/taxi',
   'Stay: Hotel Cayena (~$90/night). Alt: Lidotel Hotel Boutique (~$120/night). Alt: Renaissance Caracas (~$110/night). Restaurants: La Casa Bistro, Astrid y Gaston.'),

  (itin_caracas, 1, 1,
   'Dinner at La Casa Bistro',
   'Modern Venezuelan gastropub in Las Mercedes. Try the pabellon criollo with a twist, yuca fries, and passion fruit cheesecake. Great cocktail menu with Venezuelan rum.',
   'Las Mercedes', 10.4861, -66.8667, 35, 2, NULL,
   'Mains ~$12-18. Reservations for weekends. Walkable from Hotel Cayena.'),

  (itin_caracas, 2, 0,
   'El Avila Sunrise Hike + Chacao Food Tour',
   'Early morning hike up El Avila (Waraira Repano National Park) via Sabas Nieves trail. 1.5hr to the viewpoint overlooking the whole city. Descend and head to Chacao for breakfast at Arepera Socialista (best arepas in Caracas: Reina Pepiada, Domino, Pabellon). Walk through Mercado de Chacao for tropical fruits. Afternoon street art walk through Los Palos Grandes.',
   'El Avila', 10.5333, -66.8667, 60, 8, 'Metro',
   'Avila hike: free, start by 6am for sunrise. Arepera Socialista: arepas ~$3-5 each. Mercado de Chacao: sample mamey, guanabana, chirimoya. Street art best in Los Palos Grandes and Bello Campo.'),

  (itin_caracas, 3, 0,
   'Choroni Day Trip: Cacao + Beach',
   'Day trip to Choroni (2.5hr drive through Henri Pittier National Park). Stop at Hacienda Chuao for a cacao plantation tour and chocolate tasting. Continue to Playa Grande for Caribbean beach time. Lunch at Sabor del Mar: fried whole fish, patacones, coconut water straight from the shell. Return to Caracas evening.',
   'Choroni', 10.4933, -67.5933, 140, 10, 'Hired car/tour',
   'Hacienda Chuao tour ~$25pp. Sabor del Mar: fish plate ~$10-12. Transport: hire driver ~$80 roundtrip or join group tour ~$40pp. Henri Pittier drive is stunning, look for toucans.'),

  (itin_caracas, 4, 0,
   'Museums + El Hatillo + Departure',
   'Morning at Museo de Arte Contemporaneo (MACSI), free entry, world-class collection. Then to El Hatillo colonial village for coffee at Cafe El Hatillo and handicraft shopping. Lunch at Mokambo Restaurant in El Hatillo: cachapas con queso de mano, hallacas if in season. Afternoon departure.',
   'El Hatillo', 10.4300, -66.8200, 70, 6, NULL,
   'MACSI: free entry, allow 1.5hrs. El Hatillo: 20min taxi from city center, charming colonial streets. Mokambo: cachapas ~$5, excellent craft chocolate shop next door.')
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 4. MARGARITA ISLAND (5 days) — tourist1
----------------------------------------------------------------------
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin_margarita, tourist1_id,
   'Margarita Island: Beaches, Culture & Nightlife',
   'Five days on the Pearl of the Caribbean. Stay at Hotel Hesperia Isla Margarita, surf at Playa Parguito, kitesurf at El Yaque, kayak through La Restinga mangroves with flamingos, explore the colonial fortress in La Asuncion, and eat the freshest seafood of your life.',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
   TRUE, FALSE,
   5, 780, ARRAY['Margarita'], ARRAY['beach', 'culture', 'surf', 'nightlife', 'food'],
   245, 367, 3100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours, transport_to_next, notes) VALUES
  (itin_margarita, 1, 0,
   'Arrive + Playa El Agua',
   'Fly into Santiago Marino Airport. Check into Hotel Hesperia Isla Margarita near Playa El Agua. Afternoon at Playa El Agua, the island''s most famous beach: 4km of golden sand, warm Caribbean water, beach bars every 50m. Sunset mojitos at Guacuco Beach Bar. Dinner at Restaurante El Paraiso: grilled lobster tail, fried calamari, coconut rice.',
   'Playa El Agua', 11.1167, -63.8667, 160, 6, 'Taxi',
   'Stay: Hotel Hesperia Isla Margarita (~$90-130/night). Alt: Sunsol Isla Caribe (~$70/night). Alt: Lidotel Margarita (~$100/night). Guacuco Beach Bar: cocktails ~$5-8.'),

  (itin_margarita, 2, 0,
   'Playa Parguito Surf + Porlamar',
   'Morning surf lesson at Playa Parguito (the island''s surf beach, consistent waves). Lunch at Tasca de Cocody in Porlamar: empanadas de cazon (shark), arepas, fresh juices. Afternoon exploring Porlamar: Mercado de Conejeros for local crafts, Boulevar Guevara for street food. Evening at Porlamar''s nightlife strip.',
   'Playa Parguito', 11.0833, -63.8333, 110, 8, 'Taxi',
   'Surf lesson ~$25-40/hr. Tasca de Cocody: empanadas ~$2-3 each, famous locally. Mercado de Conejeros: hammocks, crafts, hot sauce. Porlamar is the commercial hub.'),

  (itin_margarita, 3, 0,
   'La Restinga Mangroves + La Asuncion',
   'Morning boat tour through La Restinga National Park: kayak through mangrove tunnels, spot flamingos, pelicans, and crabs. Beach at the end of the mangrove channel. Afternoon visit La Asuncion: Castillo de Santa Rosa fortress, colonial church, traditional ice cream shop. Dinner at El Fondeadero in Juan Griego: watch the sunset (famous as one of the best in the Caribbean) with grilled mahi-mahi.',
   'La Restinga', 11.0167, -63.9500, 100, 8, 'Taxi',
   'La Restinga boat tour ~$15-20pp. Kayak rental ~$10/hr. Castillo de Santa Rosa: free entry. Juan Griego sunset is legendary. El Fondeadero: fish plates ~$10-15.'),

  (itin_margarita, 4, 0,
   'Playa El Yaque Kitesurfing + Macanao',
   'Morning at Playa El Yaque, world-famous for kitesurfing and windsurfing. Take a 3-hour kite lesson or just watch the pros. Lunch at Yaque Motion restaurant by the beach. Afternoon drive to the Macanao Peninsula: wild desert landscape, abandoned beaches, Boca del Rio fishing village for the freshest ceviche you''ll ever eat.',
   'Playa El Yaque', 10.9667, -63.9500, 150, 8, 'Rental car',
   'El Yaque kite lesson ~$50-80 for 3hrs. Yaque Motion: burgers and smoothies ~$8-12. Macanao is rural and beautiful. Boca del Rio ceviche ~$6-8.'),

  (itin_margarita, 5, 0,
   'Isla de Coche Day Trip + Departure',
   'Boat trip to Isla de Coche (30 min ferry from Margarita). Pristine quieter beaches, fewer tourists, excellent snorkeling. Lunch at a local fisherman''s shack: fried red snapper with arroz con coco. Return to Margarita, shopping at duty-free shops in Porlamar. Departure.',
   'Isla de Coche', 10.9833, -63.9667, 100, 7, NULL,
   'Coche ferry ~$10pp roundtrip. The island is much quieter than Margarita. Great for snorkeling and hammock time. Duty-free: rum, chocolate, electronics.')
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 5. MORROCOY NATIONAL PARK (3 days) — creator1
----------------------------------------------------------------------
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, is_influencer_pick, referral_code, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin_morrocoy, creator1_id,
   'Morrocoy: Venezuela''s Secret Caribbean Cayos',
   'Three days exploring the stunning cayos of Morrocoy National Park from the beach town of Chichiriviche. Boat-hop between deserted islands, snorkel coral gardens, eat fresh fish on stilts over the water, and watch flamingos in the mangroves. Less touristy than Los Roques, a fraction of the cost.',
   'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
   TRUE, TRUE, TRUE, 'venezolanaviajera-morrocoy',
   3, 320, ARRAY['Morrocoy'], ARRAY['beach', 'snorkeling', 'budget', 'cayos', 'nature'],
   178, 312, 2400)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours, transport_to_next, notes) VALUES
  (itin_morrocoy, 1, 0,
   'Arrive Chichiriviche + Cayo Sombrero',
   'Drive from Caracas to Chichiriviche (3.5hrs on the coastal highway). Check into Posada La Montanita or Posada Villa Gregoria in town. Hire a peñero boat to Cayo Sombrero, the most popular cay: white sand, palm trees, turquoise water. Snorkeling right off the beach. Lunch at a palapa on the cay: fried fish, patacones, cold Polar beer. Return to Chichiriviche. Dinner at Restaurant Miramar on the waterfront.',
   'Cayo Sombrero', 10.8833, -68.2500, 100, 7, 'Peñero boat',
   'Stay: Posada La Montanita (~$30-40/night). Alt: Posada Villa Gregoria (~$35/night). Alt: Hotel Morrocoy in Tucacas (~$50/night). Peñero boat ~$10-15pp roundtrip. Cayo Sombrero has basic food stalls.'),

  (itin_morrocoy, 2, 0,
   'Cayo Borracho + Playuela',
   'Full day island hopping. Start at Cayo Borracho (great reef snorkeling, fewer people than Sombrero). Then Playuela/Playa Azul, a secluded beach accessed only by boat. Bring snorkel gear. Packed lunch from posada. Afternoon at Cayo Sal, a tiny white-sand island with no facilities, just you and the sea. Return for dinner at El Ancla in Chichiriviche: pargo rojo (red snapper), arroz con coco.',
   'Cayo Borracho', 10.8667, -68.2333, 80, 8, 'Peñero boat',
   'Cayo Borracho has the best reef for snorkeling in Morrocoy. Bring your own snorkel gear, rental is overpriced. El Ancla: fish plates ~$8-10. Pack sunscreen, no shade on the cayos.'),

  (itin_morrocoy, 3, 0,
   'Cuare Wildlife Refuge + Departure',
   'Morning boat tour through the Cuare Wildlife Refuge: mangrove channels, flamingos, scarlet ibis, pelicans. Birdwatching paradise. Then a final swim at Cayo Muerto (small island close to shore). Lunch at a parador on the highway: cachapas con queso de mano and fresh coconut water. Drive back to Caracas.',
   'Cuare Wildlife Refuge', 10.9167, -68.2667, 60, 5, NULL,
   'Cuare boat tour ~$15-20pp, best early morning for birds. Flamingos are seasonal (best Dec-Apr). Highway paradores: look for ones with crowds, food is freshest. Total trip cost is very budget-friendly.')
ON CONFLICT DO NOTHING;

END $$;
