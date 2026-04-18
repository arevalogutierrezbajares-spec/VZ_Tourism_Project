/**
 * Editorial content for category and destination landing pages.
 * Kept static so pages are fully server-renderable with zero API latency.
 */

export interface GuideArticle {
  title: string;
  teaser: string;
  tag: string;
  readTime: string;
  image: string;
}

export interface QuickStat {
  label: string;
  value: string;
}

export interface CategoryContent {
  heroImage: string;
  headline: string;
  tagline: string;
  intro: string[];           // 2-3 short paragraphs
  highlights: string[];      // 4-5 bullet points, what to expect
  quickStats: QuickStat[];   // 3 at-a-glance stats
  guides: GuideArticle[];    // 3-4 curated articles
}

export interface ActivityTile {
  icon: string;
  name: string;
  desc: string;
}

export interface DestinationContent {
  heroImage: string;
  headline: string;
  tagline: string;
  intro: string[];
  quickFacts: QuickStat[];   // 4 practical facts
  topActivities: ActivityTile[];
  guides: GuideArticle[];
}

// ─────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────

export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  beaches: {
    heroImage: '/hero/beach.jpg',
    headline: 'Where the Caribbean meets the rainforest',
    tagline: '2,800 km of coastline — most of it still undiscovered',
    intro: [
      'Venezuela holds one of the most diverse coastlines in the Caribbean, stretching from the turquoise archipelagos of Los Roques to the mangrove-fringed cays of Morrocoy National Park. Unlike the crowded resort strips of other destinations, most of Venezuela\'s beaches require a little effort — and reward you with near-total solitude.',
      'The water here runs unusually warm year-round, fed by the Caribbean current, and visibility in the outer archipelagos regularly exceeds 30 metres. Coral reefs, seagrass meadows, and pelagic drop-offs sit within a short boat ride of each other.',
      'Beach season runs year-round, but December through April brings the driest weather and calmest seas. Venezuelans take to the coast during Semana Santa and the July school holidays — plan accordingly if you prefer quiet.',
    ],
    highlights: [
      'Los Roques: 350 islands in a protected UNESCO-nominated biosphere',
      'Morrocoy: coral cays by day, flamingo lagoons at sunset',
      'Margarita Island: kite surfing hub with reliable trade winds',
      'Choroní: colonial village 10 minutes from black-sand beaches',
      'Most remote beaches require boat access — that\'s what keeps them pristine',
    ],
    quickStats: [
      { label: 'Best season', value: 'Dec – Apr' },
      { label: 'Top spot', value: 'Los Roques' },
      { label: 'Starting from', value: '$45/person' },
    ],
    guides: [
      {
        title: 'Los Roques: A First-Timer\'s Complete Guide',
        teaser: 'Everything you need to know before flying into Gran Roque — posadas, boats, snorkelling spots, and what not to miss.',
        tag: 'Destination Guide',
        readTime: '8 min read',
        image: '/destinations/los roques1.jpg',
      },
      {
        title: 'Morrocoy vs Los Roques: Which Should You Choose?',
        teaser: 'Both are stunning. One is closer, cheaper, and driveable. The other is remoter, pricier, and unforgettable. Here\'s how to decide.',
        tag: 'Comparison',
        readTime: '5 min read',
        image: '/destinations/morrocoy.jpg',
      },
      {
        title: 'The Best Snorkelling Sites in Venezuela',
        teaser: 'From the outer reefs of Crasqui to the shallow seagrass beds of Francisquí — a ranked guide to the clearest water.',
        tag: 'Activity Guide',
        readTime: '6 min read',
        image: '/hero/beach.jpg',
      },
    ],
  },

  mountains: {
    heroImage: '/destinations/merida.jpg',
    headline: 'The Andes at their wildest',
    tagline: 'Cloud forests, glacial peaks, and world-class paragliding',
    intro: [
      'The Venezuelan Andes sweep down from Colombia into Mérida state, reaching their climax at Pico Bolívar — at 4,978 metres, the country\'s highest point. The range is compact by Andean standards but dramatic in profile, rising from tropical lowlands to alpine páramo within a single day\'s drive.',
      'Mérida city serves as base camp for everything in the region. At 1,600 metres, it has a permanent spring climate and the infrastructure of a university town: good restaurants, knowledgeable guides, and equipment rental shops on every corner. The world\'s highest cable car once climbed from here to 4,765 metres — restoration work is ongoing.',
      'The best time to visit is the dry season from December to April, when the peaks clear and the trekking trails dry out. Cloud forest routes in the lower elevations remain accessible year-round, though afternoon showers are common from May onwards.',
    ],
    highlights: [
      'Pico Bolívar at 4,978 m — the highest point in Venezuela',
      'Paragliding from Teleférico launch sites (one of the best in South America)',
      'Los Nevados: a 16th-century mountain village at 2,700 m',
      'Chorros de Milla: waterfalls 10 minutes from the city centre',
      'Cloud forest biodiversity: over 500 orchid species in the state',
    ],
    quickStats: [
      { label: 'Best season', value: 'Dec – Apr' },
      { label: 'Hub city', value: 'Mérida' },
      { label: 'Starting from', value: '$35/person' },
    ],
    guides: [
      {
        title: 'Trekking in Mérida: Routes for Every Level',
        teaser: 'From the family-friendly Camino Real to the multi-day approach to Pico Bolívar — a practical route planner.',
        tag: 'Trekking',
        readTime: '9 min read',
        image: '/destinations/merida.jpg',
      },
      {
        title: 'Paragliding the Venezuelan Andes',
        teaser: 'What to expect, which operators to trust, and why the Mérida thermals draw pilots from around the world.',
        tag: 'Adventure',
        readTime: '6 min read',
        image: '/hero/adventure.jpg',
      },
      {
        title: 'Los Nevados: The Village the Road Forgot',
        teaser: 'A colonial-era settlement above 2,700 m, reached by mule track or a very rough jeep road. Worth every hour of the journey.',
        tag: 'Culture',
        readTime: '5 min read',
        image: '/destinations/merida.jpg',
      },
    ],
  },

  cities: {
    heroImage: '/hero/city_skyline.jpg',
    headline: 'Urban Venezuela, unfiltered',
    tagline: 'Capital energy, Andean culture, Caribbean swagger',
    intro: [
      'Venezuelan cities are contradictions lived at full volume — freeways that end abruptly, colonial squares packed at midnight, food scenes that could compete with any major metropolis. They\'re not the reason most people come to Venezuela, but they\'re often what visitors remember most vividly.',
      'Caracas sits in a narrow valley at 900 metres, with El Ávila mountain forming an improbable green wall behind every rooftop. The city\'s energy is kinetic: jazz bars in Altamira, world-class contemporary art in Chacao, the chaotic sensory overload of Mercado de Chacao on a Saturday morning.',
      'Mérida offers a different rhythm — a university city at 1,600 metres where students and outdoor guides share the same streets, and helado de paila (hand-churned ice cream) comes in 860 flavours at a single shop on Plaza Bolívar.',
    ],
    highlights: [
      'Caracas: El Ávila National Park starts at the edge of the city',
      'Mérida: university town with the best restaurant-to-resident ratio in Venezuela',
      'Maracaibo: Catatumbo lightning viewable from the lakeside promenade',
      'Colonia Tovar: a Bavarian village at 1,800 m, one hour from Caracas',
      'Food scene: arepas, cachapas, and pabellón criollo done properly',
    ],
    quickStats: [
      { label: 'Main gateway', value: 'Maiquetía Airport' },
      { label: 'Best base', value: 'Caracas or Mérida' },
      { label: 'Starting from', value: '$30/person' },
    ],
    guides: [
      {
        title: '48 Hours in Caracas: A Practical City Guide',
        teaser: 'Neighbourhoods worth knowing, restaurants that are actually open, and the El Ávila hike every visitor should do.',
        tag: 'City Guide',
        readTime: '10 min read',
        image: '/hero/city_skyline.jpg',
      },
      {
        title: 'Colonia Tovar: Venezuela\'s Little Bavaria',
        teaser: 'A 19th-century German settlement in the coastal mountain range, complete with half-timbered houses and strawberry farms.',
        tag: 'Day Trip',
        readTime: '5 min read',
        image: '/hero/Colonia_Tovar.jpg',
      },
      {
        title: 'Maracaibo Beyond the Stereotypes',
        teaser: 'Venezuela\'s most misunderstood city has one of the country\'s richest food cultures, a dramatic lake, and the world\'s most reliable lightning storm.',
        tag: 'Destination Guide',
        readTime: '7 min read',
        image: '/destinations/maracaibo.jpg',
      },
    ],
  },

  'eco-tours': {
    heroImage: '/hero/nature_tour.webp',
    headline: 'Into the wildest biodiversity on earth',
    tagline: 'Tepuis, orinoco delta, and savannas that go on forever',
    intro: [
      'Venezuela is one of the most biologically diverse countries on the planet — 1,417 recorded bird species, the world\'s highest waterfall, an ancient plateau landscape that inspired Conan Doyle\'s The Lost World, and a river delta the size of a small country. Most of it receives fewer visitors in a year than a minor European museum gets in a week.',
      'The Gran Sabana in the southeast is the centrepiece: a rolling savanna dotted with tepuis — flat-topped sandstone mountains that have been isolated for 1.8 billion years, evolving their own endemic species on every summit. Angel Falls drops off the edge of Auyán-tepui with a 979-metre freefall, the longest uninterrupted waterfall on earth.',
      'Los Llanos in the west and centre is Venezuela\'s answer to the African savanna: during the dry season, wildlife concentrates around shrinking waterholes and anacondas are spotted from horseback. Orinoco River delta expeditions take you into indigenous Warao communities and a maze of channels where freshwater dolphins surface alongside your dugout canoe.',
    ],
    highlights: [
      'Gran Sabana: 3 million hectares of ancient tepui landscape',
      'Angel Falls (Salto Ángel): 979 m — the world\'s highest waterfall',
      'Los Llanos: capybara, anaconda, giant anteater, and 300+ bird species',
      'Orinoco Delta: largest river delta in the Caribbean basin',
      'Henri Pittier National Park: the most biodiverse place per km² on earth',
    ],
    quickStats: [
      { label: 'Best season', value: 'Jun – Nov (waterfalls)' },
      { label: 'Key region', value: 'Gran Sabana' },
      { label: 'Starting from', value: '$80/person' },
    ],
    guides: [
      {
        title: 'Angel Falls: The Complete Expedition Guide',
        teaser: 'How to get to Canaima, when to go for the best falls, what to pack, and which tour operators are worth trusting.',
        tag: 'Expedition Guide',
        readTime: '11 min read',
        image: '/destinations/angel-falls-tour.jpg',
      },
      {
        title: 'Los Llanos Safari: Venezuela\'s Serengeti',
        teaser: 'Horseback rides through flooded savanna, capybara at every turn, and anacondas the guides photograph like it\'s routine.',
        tag: 'Wildlife',
        readTime: '8 min read',
        image: '/hero/nature_tour.webp',
      },
      {
        title: 'Trekking to the Summit of Roraima',
        teaser: 'The world\'s oldest plateau. Six days on the trail. Endemic species found nowhere else. One of South America\'s great adventures.',
        tag: 'Trekking',
        readTime: '12 min read',
        image: '/hero/adventure.jpg',
      },
    ],
  },

  gastronomy: {
    heroImage: '/hero/gastronomy.jpg',
    headline: 'The flavors of Venezuela',
    tagline: 'Arepas for breakfast, pabellón for lunch, and everything in between',
    intro: [
      'Venezuelan food is built on corn, beans, and plantain — a culinary trio that anchors everything from street breakfasts to elaborate Sunday lunches. The arepa is the national staple: a thick corn flatbread griddled and stuffed with cheese, shredded beef, black beans, or anything else available. Every Venezuelan household has its own recipe.',
      'The pabellón criollo is the unofficial national dish — shredded beef (carne mechada), black beans (caraotas negras), white rice, and sweet plantains on a single plate. It is simultaneously humble and deeply satisfying, and the best versions are found not in restaurants but in the comedores (informal lunch spots) that dot every Venezuelan town.',
      'Venezuela also grows some of the world\'s finest cacao and coffee, though both are frustratingly underexported. Single-origin Venezuelan chocolate and micro-roasted mountain coffee are available in speciality shops in Caracas and Mérida, and increasingly finding their way onto international menus.',
    ],
    highlights: [
      'Arepa: the national staple — griddled, baked, or fried, stuffed with everything',
      'Pabellón criollo: the complete Venezuelan plate in one dish',
      'Hallacas: the traditional Christmas dish, wrapped in banana leaf',
      'Tequeños: cheese-filled dough sticks, served at every Venezuelan gathering',
      'Venezuelan cacao: some of the finest in the world, grown in Barlovento and Choroní',
    ],
    quickStats: [
      { label: 'Must-eat', value: 'Arepa reina pepiada' },
      { label: 'Food capital', value: 'Caracas' },
      { label: 'Starting from', value: '$15/person' },
    ],
    guides: [
      {
        title: 'The Arepa Bible: Venezuela\'s National Dish Explained',
        teaser: 'From the corn to the comal to the 47 possible fillings — a complete guide to Venezuela\'s most essential food.',
        tag: 'Food Culture',
        readTime: '7 min read',
        image: '/hero/gastronomy.jpg',
      },
      {
        title: 'A Food Tour of Caracas: Markets, Restaurants, Street Food',
        teaser: 'The Mercado de Chacao, the areperas of Sabana Grande, and the fine-dining scene that most travellers miss entirely.',
        tag: 'City Food',
        readTime: '9 min read',
        image: '/hero/city_skyline.jpg',
      },
      {
        title: 'Venezuelan Cacao: The World\'s Best Chocolate Nobody Talks About',
        teaser: 'Barlovento and Choroní produce cacao that European chocolatiers quietly call irreplaceable. Here\'s how to taste it at the source.',
        tag: 'Artisan Food',
        readTime: '6 min read',
        image: '/destinations/choroni.jpg',
      },
    ],
  },

  adventure: {
    heroImage: '/hero/adventure.jpg',
    headline: 'Where the continent gets extreme',
    tagline: 'From Andean paragliding to Roraima summit — Venezuela\'s hardest playgrounds',
    intro: [
      'Venezuela\'s geography is an adventure sport atlas: a Caribbean coast for kite surfers, Andean thermals for paragliders, ancient tepui summits for trekkers, and river systems that range from Class II floats to Class V white-water. Most of it is remarkably uncrowded — world-class terrain without the queues.',
      'Mérida is the undisputed adventure capital. The cable car launch sites above the city produce thermals that draw paragliding pilots from across South America, and the surrounding valleys offer white-water rafting, via ferrata, canyoning, and multi-day horse treks. Guides are experienced and locally certified.',
      'For serious mountaineers, Pico Bolívar (4,978 m) presents a technical challenge — the final approach crosses a glaciated ridge. Roraima in the Gran Sabana is a six-day round trip to the summit of the world\'s oldest plateau, a genuinely other-worldly landscape that justifies the effort entirely.',
    ],
    highlights: [
      'Paragliding: some of the longest cross-country flights in South America from Mérida',
      'Kite surfing: El Yaque on Margarita Island — consistent trade winds, flat water',
      'Roraima Trek: 6 days, 2,810 m summit, endemic species found nowhere else',
      'White-water rafting: Río Orinoco and Río Apure tributaries',
      'Caving: Cueva del Guácharo — Venezuela\'s largest and most accessible cave system',
    ],
    quickStats: [
      { label: 'Adventure hub', value: 'Mérida' },
      { label: 'Top activity', value: 'Paragliding & Trekking' },
      { label: 'Starting from', value: '$50/person' },
    ],
    guides: [
      {
        title: 'Paragliding the Venezuelan Andes: A Pilot\'s Guide',
        teaser: 'Launch sites, thermal windows, landing fields, and the operators who have been flying this sky for decades.',
        tag: 'Adventure',
        readTime: '8 min read',
        image: '/hero/adventure.jpg',
      },
      {
        title: 'Trek to Roraima: The World\'s Oldest Plateau',
        teaser: 'Six days on a trail first walked by the Pemon people. Waterfalls, quartz plains, and species that exist nowhere else on earth.',
        tag: 'Trekking',
        readTime: '13 min read',
        image: '/destinations/angel-falls-tour.jpg',
      },
      {
        title: 'Kite Surfing Margarita: Complete Beginner\'s Guide',
        teaser: 'El Yaque beach has been a world kite surfing championship venue. Here\'s how to make the most of it, whether you\'re a beginner or an expert.',
        tag: 'Water Sports',
        readTime: '7 min read',
        image: '/destinations/margarita.jpeg',
      },
    ],
  },

  wellness: {
    heroImage: '/hero/vzla_retreat.avif',
    headline: 'Disconnect to reconnect',
    tagline: 'Cloud forest retreats, hot springs, and coastal yoga — at a fraction of other destinations\' prices',
    intro: [
      'Wellness tourism in Venezuela is still emerging, which means the experiences feel genuine rather than packaged. The posadas (family-run guesthouses) that have evolved into retreat centres did so organically — owners who practice yoga themselves, cooks who source from their own gardens, guides who have been walking the cloud forest trails since childhood.',
      'The Mérida region offers the most concentrated wellness infrastructure: mountain-air altitude, Andean hot springs at Agua Caliente, and a food culture built on fresh produce at altitude. Several posadas in the surrounding valleys now run structured yoga and meditation programmes alongside their standard accommodation.',
      'On the coast, Choroní and the more remote beaches of Henri Pittier National Park offer a simpler form of wellness — no itinerary, no wifi, just the rhythm of a small fishing village and water warm enough to swim in at midnight.',
    ],
    highlights: [
      'Mérida hot springs: thermal baths in the Andes, some at over 60°C',
      'Cloud forest retreats: yoga and meditation with mountain views at 2,000+ m',
      'Coastal posadas: boutique accommodation with in-house chefs and gardens',
      'Digital detox by design: remote access means no signal in many areas',
      'Local cuisine: Andean produce, fresh seafood, and Venezuelan cacao',
    ],
    quickStats: [
      { label: 'Top region', value: 'Mérida & Coast' },
      { label: 'Best for', value: 'Retreat stays' },
      { label: 'Starting from', value: '$60/night' },
    ],
    guides: [
      {
        title: 'The Best Eco-Retreats in Mérida\'s Cloud Forest',
        teaser: 'Posadas that have quietly evolved into serious wellness destinations — yoga platforms, farm kitchens, and Andean silence.',
        tag: 'Retreat Guide',
        readTime: '7 min read',
        image: '/hero/vzla_retreat.avif',
      },
      {
        title: 'Hot Springs in the Venezuelan Andes',
        teaser: 'From the roadside pools at Agua Caliente to the more remote thermal vents deep in the mountains. What to expect and how to get there.',
        tag: 'Wellness',
        readTime: '5 min read',
        image: '/destinations/merida.jpg',
      },
      {
        title: 'Choroní and Beyond: Coastal Wellness at Its Most Honest',
        teaser: 'A colonial village with no ATMs, unreliable signal, and some of the most relaxing days you will spend anywhere in Latin America.',
        tag: 'Slow Travel',
        readTime: '6 min read',
        image: '/destinations/choroni.jpg',
      },
    ],
  },

  cultural: {
    heroImage: '/hero/Colonia_Tovar.jpg',
    headline: 'Five centuries, many cultures',
    tagline: 'Colonial towns, indigenous ceremonies, and one of the world\'s great music programmes',
    intro: [
      'Venezuela\'s cultural depth is easy to underestimate. The country sits at the convergence of Caribbean, Andean, Amazonian, and Llanos traditions — each with its own music, food, craft, and ceremony. Indigenous Wayuu weavings from the Guajira, Pemón basket work from the Gran Sabana, and the hammered silver filigree of Mérida are all living craft traditions, not museum artefacts.',
      'El Sistema — the state music programme that launched Gustavo Dudamel and hundreds of other world-class musicians — is headquartered in Caracas but visible across the country. Free concerts in provincial music centres happen weekly; the standard is often extraordinary.',
      'Colonial architecture is concentrated in Coro (a UNESCO World Heritage City), Mérida\'s pedestrian centre, and the small towns of the Andes like Bailadores and Tovar. The most unlikely cultural landmark is Colonia Tovar, a 19th-century German settlement in the coastal mountains above Caracas, which still holds an annual Oktoberfest and produces its own sausages and beer.',
    ],
    highlights: [
      'Coro: UNESCO World Heritage colonial city, the oldest in western Venezuela',
      'El Sistema concerts: world-class orchestras in provincial venues, often free',
      'Los Diablos Danzantes: UNESCO Intangible Heritage festival in June',
      'Colonia Tovar: Bavarian architecture and strawberry festivals above Caracas',
      'Pemón and Wayuu indigenous cultures: living traditions open to respectful visitors',
    ],
    quickStats: [
      { label: 'UNESCO sites', value: 'Coro + El Sistema' },
      { label: 'Best festival', value: 'Carnival (Feb/Mar)' },
      { label: 'Starting from', value: '$25/person' },
    ],
    guides: [
      {
        title: 'Venezuela\'s UNESCO World Heritage Sites',
        teaser: 'Coro and its port, El Sistema, and the candidates waiting in line — a guide to Venezuela\'s formally protected cultural landmarks.',
        tag: 'Heritage',
        readTime: '7 min read',
        image: '/hero/Colonia_Tovar.jpg',
      },
      {
        title: 'El Sistema: The World\'s Greatest Music Programme',
        teaser: 'How a 1975 project in a parking garage became the most influential music education system on earth — and how to experience it in person.',
        tag: 'Music',
        readTime: '8 min read',
        image: '/hero/city_skyline.jpg',
      },
      {
        title: 'Colonia Tovar: Bavaria in the Venezuelan Mountains',
        teaser: 'In 1843, a group of German colonists founded a village in the coastal range above Caracas. Their descendants are still there. So is the schnitzel.',
        tag: 'Day Trip',
        readTime: '6 min read',
        image: '/hero/Colonia_Tovar.jpg',
      },
    ],
  },
};

// ─────────────────────────────────────────────
// DESTINATIONS
// ─────────────────────────────────────────────

export const DESTINATION_CONTENT: Record<string, DestinationContent> = {
  'los-roques': {
    heroImage: '/destinations/los roques1.jpg',
    headline: 'Los Roques',
    tagline: '350 islands. One national park. Zero cars.',
    intro: [
      'Los Roques Archipelago National Park sits 166 km north of Caracas in the southern Caribbean — a 40-minute charter flight into a world of bone-white sand, neon-blue water, and the kind of quiet that feels almost confrontational after any time in a city.',
      'The archipelago covers 225,000 hectares, making it the largest marine national park in the Caribbean. Gran Roque, the main island, has one paved road (short enough to walk end-to-end in seven minutes) and roughly 200 posadas. Everything else is reef, lagoon, and open ocean.',
      'Come for the snorkelling and diving — visibility regularly exceeds 30 metres in the outer cays. Stay for the bonefish flats, which attract fly-fishing fanatics from around the world. Leave with sun damage you will not regret.',
    ],
    quickFacts: [
      { label: 'How to get there', value: 'Charter flight from Caracas (35 min)' },
      { label: 'Best season', value: 'Year-round; Dec–Apr calmest' },
      { label: 'Typical budget', value: '$150–300/day all-in' },
      { label: 'Language tip', value: 'Spanish only on the islands' },
    ],
    topActivities: [
      { icon: '🤿', name: 'Snorkelling', desc: '30m+ visibility in the outer cays' },
      { icon: '🎣', name: 'Bonefishing', desc: 'World-class fly fishing on the flats' },
      { icon: '🪂', name: 'Kite surfing', desc: 'Trade winds from November to April' },
      { icon: '⛵', name: 'Island hopping', desc: 'Francisquí, Cayo de Agua, Piritu' },
      { icon: '🐢', name: 'Turtle watching', desc: 'Nesting season June to October' },
    ],
    guides: [
      {
        title: 'Los Roques: A First-Timer\'s Complete Guide',
        teaser: 'Everything you need to know before flying in — posadas, boat captains, snorkelling spots, and the islands that are worth the extra detour.',
        tag: 'Destination Guide',
        readTime: '8 min read',
        image: '/destinations/los roques1.jpg',
      },
      {
        title: 'Fly Fishing Los Roques: One of the World\'s Best Bonefish Destinations',
        teaser: 'The flats around Crasqui and Noronquises hold some of the largest bonefish in the Caribbean. What to bring, who to hire, and when to go.',
        tag: 'Fishing Guide',
        readTime: '7 min read',
        image: '/destinations/los roques1.jpg',
      },
    ],
  },

  merida: {
    heroImage: '/destinations/merida.jpg',
    headline: 'Mérida',
    tagline: 'The Andes, a university town, and 860 flavours of ice cream',
    intro: [
      'Mérida sits at 1,625 metres in a narrow valley between two Andean ridges, the city\'s colonial streets fanning out from Plaza Bolívar while the peaks of the Sierra Nevada rise immediately to the south. It is Venezuela\'s most outdoor-focused city — the kind of place where paragliding helmets share shelf space with university textbooks.',
      'The Universidad de Los Andes, founded in 1785, gives Mérida its energy: cheap food, late nights, good bookshops, and the particular intellectual restlessness of a town where almost everyone is studying something. The city\'s food scene has benefited accordingly.',
      'The cable car (teleférico) that once climbed to 4,765 metres — the world\'s highest, by some measures — has been under restoration for years but remains a symbol of Mérida\'s ambitions. The trails it served are still walkable with a guide.',
    ],
    quickFacts: [
      { label: 'How to get there', value: 'Flight from Caracas (1 hr) or bus (8 hrs)' },
      { label: 'Best season', value: 'Dec – Apr (dry season)' },
      { label: 'Typical budget', value: '$40–80/day' },
      { label: 'Altitude', value: '1,625 m above sea level' },
    ],
    topActivities: [
      { icon: '🪂', name: 'Paragliding', desc: 'Some of the best thermals in South America' },
      { icon: '🥾', name: 'Trekking', desc: 'Routes from easy cloud forest to Pico Bolívar' },
      { icon: '♨️', name: 'Hot springs', desc: 'Thermal baths at Agua Caliente, 40 min away' },
      { icon: '🍦', name: 'Heladería Coromoto', desc: '860 flavours — a Guinness World Record' },
      { icon: '🌿', name: 'Cloud forest', desc: 'Henri Pittier & La Culata day hikes' },
    ],
    guides: [
      {
        title: 'Trekking in Mérida: Routes for Every Level',
        teaser: 'Day hikes to multi-day expeditions — a practical route planner for the Venezuelan Andes.',
        tag: 'Trekking',
        readTime: '9 min read',
        image: '/destinations/merida.jpg',
      },
      {
        title: 'Mérida\'s Food Scene: Beyond the Tourist Track',
        teaser: 'The comedores (lunch counters), the best arepas in the city, and where to find Venezuelan coffee done properly.',
        tag: 'Food Guide',
        readTime: '6 min read',
        image: '/hero/gastronomy.jpg',
      },
    ],
  },

  margarita: {
    heroImage: '/destinations/margarita.jpeg',
    headline: 'Margarita Island',
    tagline: 'The Pearl of the Caribbean — beaches, kite surfing, and fresh seafood',
    intro: [
      'Isla Margarita is the largest island in Venezuela, lying 38 km off the northeastern coast. It has the infrastructure of a proper tourist destination — airport, resort hotels, and a reliable ferry connection from Puerto La Cruz — without the overdevelopment of more heavily marketed Caribbean islands.',
      'El Yaque beach on the south coast has established itself as one of the world\'s premier kite surfing spots: flat water lagoon, consistent trade winds from November through April, and a community of international riders who have made it their annual base. Beginners take lessons here; experts set records.',
      'The island divides naturally into the arid western half (Macanao Peninsula, rugged and largely undeveloped) and the greener, more populated eastern half where most beaches, restaurants, and posadas are concentrated. La Restinga National Park, a mangrove lagoon in the middle of the island, is the ecological centrepiece.',
    ],
    quickFacts: [
      { label: 'How to get there', value: 'Flight from Caracas (1 hr) or ferry' },
      { label: 'Best season', value: 'Nov – Apr (kite season)' },
      { label: 'Typical budget', value: '$50–120/day' },
      { label: 'Top beach', value: 'El Yaque (kite), Playa El Agua (swimming)' },
    ],
    topActivities: [
      { icon: '🪁', name: 'Kite surfing', desc: 'World-class flat water at El Yaque' },
      { icon: '🐚', name: 'Shell collecting', desc: 'La Restinga lagoon boat tours' },
      { icon: '🍤', name: 'Seafood', desc: 'Fresh catch at Puerto Fermín and Juangriego' },
      { icon: '🏊', name: 'Beach hopping', desc: 'Playa El Agua, Caribe, Parguito' },
      { icon: '🦩', name: 'Birdwatching', desc: 'Flamingos in La Restinga lagoon' },
    ],
    guides: [
      {
        title: 'Kite Surfing Margarita: The Complete Guide',
        teaser: 'El Yaque\'s wind window, the best schools, equipment hire, and what to do on the days the wind drops.',
        tag: 'Water Sports',
        readTime: '7 min read',
        image: '/destinations/margarita.jpeg',
      },
      {
        title: 'Margarita Island in 4 Days: A Practical Itinerary',
        teaser: 'West to east, beach to mangrove — a day-by-day guide that covers the island without wasting a single morning.',
        tag: 'Itinerary',
        readTime: '6 min read',
        image: '/destinations/margarita.jpeg',
      },
    ],
  },

  canaima: {
    heroImage: '/destinations/angel-falls-tour.jpg',
    headline: 'Canaima',
    tagline: 'Angel Falls and the ancient world of the tepuis',
    intro: [
      'Canaima National Park covers 30,000 km² of the Gran Sabana — an area larger than Belgium — and contains the highest waterfall on earth, one of the world\'s oldest geological formations, and a Pemón indigenous culture that has inhabited this landscape for centuries. It is a UNESCO World Heritage Site, and one of the few places on earth that justifies the description "otherworldly."',
      'Angel Falls (Salto Ángel) drops 979 metres off the edge of Auyán-tepui, the largest of the region\'s flat-topped sandstone mountains. The falls are best visited from June to November when water flow is highest; the dry season (January to May) offers clearer skies but a thinner cascade.',
      'Canaima lagoon is the base camp: a pink-tinted lake fed by tannin-rich rivers, flanked by smaller waterfalls you can swim behind, and ringed by posadas and Pemón craft stalls. Access is by small plane only — no road connects Canaima to the outside world.',
    ],
    quickFacts: [
      { label: 'How to get there', value: 'Flight from Puerto Ordaz or Caracas (1–2 hrs)' },
      { label: 'Best for falls', value: 'Jun – Nov (high water)' },
      { label: 'Typical budget', value: '$100–200/day (tours required)' },
      { label: 'Guided access', value: 'All tepui approaches need Pemón guides' },
    ],
    topActivities: [
      { icon: '🌊', name: 'Angel Falls tour', desc: '2-day river journey + overland to the base' },
      { icon: '🚣', name: 'Canaima lagoon', desc: 'Swim behind the Hacha and Golondrina falls' },
      { icon: '🥾', name: 'Roraima trek', desc: '6-day expedition to the world\'s oldest plateau' },
      { icon: '🎒', name: 'Tepui climbing', desc: 'Technical routes up Auyán with Pemón guides' },
      { icon: '📸', name: 'Sunrise overflight', desc: 'Small-plane flights over the tepui at dawn' },
    ],
    guides: [
      {
        title: 'Angel Falls: The Complete Expedition Guide',
        teaser: 'Which operator, which season, what to pack, and whether the river trip or the overflight is worth it (answer: both).',
        tag: 'Expedition Guide',
        readTime: '11 min read',
        image: '/destinations/angel-falls-tour.jpg',
      },
      {
        title: 'Trek to Roraima: Step-by-Step',
        teaser: 'The six-day route to the summit of the world\'s oldest plateau — permits, guides, gear list, and what it actually feels like up there.',
        tag: 'Trekking',
        readTime: '14 min read',
        image: '/hero/adventure.jpg',
      },
    ],
  },

  choroni: {
    heroImage: '/destinations/choroni.jpg',
    headline: 'Choroní',
    tagline: 'Colonial village. No ATMs. No signal. Perfect.',
    intro: [
      'Choroní sits on the Caribbean coast of Henri Pittier National Park, two hours from Maracay by a spectacular mountain road that climbs through cloud forest before descending to the sea. The journey itself is reason enough to come: the Portachuelo Pass cuts through one of the highest concentrations of biodiversity on earth.',
      'The town is a single colonial street of brightly painted houses, an 18th-century church, and a handful of restaurants that depend entirely on what arrived from the fishing boats that morning. The beach — Puerto Colombia, a short walk from the town centre — is a working fishing beach with a few colourful launches and enough shade from almond trees to spend a full day without burning.',
      'Choroní has no ATMs and unreliable phone signal, which is, for many visitors, its primary appeal. The posadas here are family-run; the cacao grown in the surrounding hills supplies some of Europe\'s finest chocolate makers; and the Afro-Venezuelan musical tradition of tambor is still performed in the central plaza on significant dates.',
    ],
    quickFacts: [
      { label: 'How to get there', value: 'Drive from Maracay (2 hrs over mountain)' },
      { label: 'Best season', value: 'Dec – Apr (dry)' },
      { label: 'Typical budget', value: '$30–60/day' },
      { label: 'Practical note', value: 'Bring cash — no ATMs in town' },
    ],
    topActivities: [
      { icon: '🏖️', name: 'Puerto Colombia beach', desc: 'Shade, fishing boats, and calm water' },
      { icon: '🎵', name: 'Tambor music', desc: 'Afro-Venezuelan drum tradition in the plaza' },
      { icon: '🌿', name: 'Cloud forest hiking', desc: 'Portachuelo Pass birdwatching trails' },
      { icon: '🍫', name: 'Cacao tours', desc: 'Visit working cacao farms in the valley' },
      { icon: '⛵', name: 'Boat to Cuyagua', desc: 'Surf beach accessible by sea only' },
    ],
    guides: [
      {
        title: 'Choroní: The Perfect Two-Day Escape',
        teaser: 'What to eat, where to stay, the hikes worth doing, and why you should budget an extra day just in case you cannot leave.',
        tag: 'Weekend Guide',
        readTime: '7 min read',
        image: '/destinations/choroni.jpg',
      },
      {
        title: 'Venezuelan Cacao: Taste It at the Source in Choroní',
        teaser: 'The farms that supply European chocolatiers are a short ride from the colonial square. Here\'s how to visit them.',
        tag: 'Food & Culture',
        readTime: '5 min read',
        image: '/hero/gastronomy.jpg',
      },
    ],
  },

  morrocoy: {
    heroImage: '/destinations/morrocoy.jpg',
    headline: 'Morrocoy',
    tagline: '20 coral cays, flamingo lagoons, and no-queue snorkelling',
    intro: [
      'Morrocoy National Park covers 32,000 hectares of Caribbean coastline in Falcón State, most of it water: a shallow inner lagoon fringed by mangroves, and beyond it a scattering of coral cays (cayos) with white sand beaches and calm, reef-protected water. The park is reachable by road from Valencia or Caracas, which makes it more accessible than Los Roques — and occasionally more crowded on holiday weekends.',
      'Each cay has its own character. Cayo Borracho is the most visited — developed enough to have a restaurant, quiet enough on weekdays to feel private. Cayo Peraza is smaller and wilder, with better snorkelling. Cayo Muerto (despite the name) is the preferred anchorage for yachters passing through.',
      'The Cuare Wildlife Refuge adjacent to the park is worth a morning: boat tours through the mangroves pass through roosting colonies of scarlet ibis and pink flamingos — the kind of spectacle that makes people put their phones down.',
    ],
    quickFacts: [
      { label: 'How to get there', value: 'Drive from Valencia (2 hrs) or Caracas (3 hrs)' },
      { label: 'Best season', value: 'Year-round; avoid Easter week' },
      { label: 'Typical budget', value: '$40–80/day + boat hire' },
      { label: 'Boat access', value: 'Required to reach the cays (hire at Tucacas)' },
    ],
    topActivities: [
      { icon: '🤿', name: 'Snorkelling', desc: 'Coral reefs at Cayo Peraza and Cayo Sombrero' },
      { icon: '🦩', name: 'Flamingo watching', desc: 'Cuare Wildlife Refuge boat tours' },
      { icon: '⛵', name: 'Cay hopping', desc: '20 cays, each with different character' },
      { icon: '🦜', name: 'Birdwatching', desc: 'Scarlet ibis roosting at sunset' },
      { icon: '🏄', name: 'Kayaking', desc: 'Through mangrove channels in the inner lagoon' },
    ],
    guides: [
      {
        title: 'Morrocoy National Park: A Complete Visitor Guide',
        teaser: 'Which cays are worth the boat fare, what to bring, where to stay in Tucacas, and how to avoid the holiday weekend crowds.',
        tag: 'Park Guide',
        readTime: '8 min read',
        image: '/destinations/morrocoy.jpg',
      },
      {
        title: 'Morrocoy vs Los Roques: Making the Choice',
        teaser: 'Two very different Caribbean experiences at two very different price points. How to decide which one belongs on your itinerary.',
        tag: 'Comparison',
        readTime: '5 min read',
        image: '/destinations/los roques1.jpg',
      },
    ],
  },

  caracas: {
    heroImage: '/destinations/caracas1.jpg',
    headline: 'Caracas',
    tagline: 'The capital that refuses to be straightforward',
    intro: [
      'Caracas divides opinions sharply. Critics point to its density, its noise, its traffic. People who know it point to El Ávila — the 2,765-metre mountain that forms the city\'s northern wall, visible from almost any rooftop and reachable on foot in two hours — and to the quality of a restaurant scene that has been forced, by adversity, to become genuinely creative.',
      'The city sits in a narrow east-west valley at around 900 metres, which gives it a permanent mild climate quite unlike the tropical heat of the coast. The neighbourhoods that matter most for visitors are concentrated in the eastern half: Altamira, Las Mercedes, Chacao, and El Hatillo (a colonial town on the southern periphery).',
      'The art scene is serious. The Museo de Arte Contemporáneo Sofía Imber, the Museo de Bellas Artes, and the Galería de Arte Nacional are all within walking distance of each other in the Parque Los Caobos complex — a remarkable concentration of Venezuelan and international work.',
    ],
    quickFacts: [
      { label: 'How to get there', value: 'Maiquetía Simón Bolívar International Airport' },
      { label: 'Best base', value: 'Altamira or Chacao neighbourhoods' },
      { label: 'Typical budget', value: '$40–100/day' },
      { label: 'El Ávila access', value: 'Sabas Nieves trailhead, 2 hrs to the ridge' },
    ],
    topActivities: [
      { icon: '⛰️', name: 'El Ávila hike', desc: 'Up to the ridge for views over the city and coast' },
      { icon: '🎨', name: 'Museum circuit', desc: 'Parque Los Caobos — 3 major museums in one park' },
      { icon: '🍽️', name: 'Restaurant scene', desc: 'Altamira and Las Mercedes for the best tables' },
      { icon: '🎵', name: 'El Sistema concert', desc: 'Check FESNOJIV schedule for public performances' },
      { icon: '🏘️', name: 'El Hatillo', desc: 'Colonial town with craft market on the city fringe' },
    ],
    guides: [
      {
        title: '48 Hours in Caracas: A Practical City Guide',
        teaser: 'Where to stay, what to eat, which museums to visit, and the El Ávila hike every visitor should do at least once.',
        tag: 'City Guide',
        readTime: '10 min read',
        image: '/destinations/caracas1.jpg',
      },
      {
        title: 'The El Ávila Hike: Caracas\'s Best Urban Escape',
        teaser: 'Trail conditions, what to bring, best time of day, and the view that makes the city finally make sense.',
        tag: 'Hiking',
        readTime: '6 min read',
        image: '/hero/amacer-en-el-avila-vista.jpg',
      },
    ],
  },

  maracaibo: {
    heroImage: '/destinations/maracaibo.jpg',
    headline: 'Maracaibo',
    tagline: 'Oil city on a lake, with the world\'s most reliable lightning storm',
    intro: [
      'Maracaibo is Venezuela\'s second city — hotter, louder, and more self-assured than Caracas. It sits on the western shore of Lake Maracaibo, the largest lake in South America, and its economic history has been written entirely in petroleum: the first oil well was drilled near here in 1914, and the lake\'s underwater reserves are among the largest in the world.',
      'The Catatumbo Lightning — relámpago del Catatumbo — is the city\'s most extraordinary natural phenomenon. At the mouth of the Catatumbo River, where it meets the lake\'s southwestern shore, an electrical storm occurs on approximately 260 nights per year. The storms are visible from 400 km away, last up to 10 hours, and produce up to 280 lightning bolts per hour. It is the most reliable lightning show on earth.',
      'The old colonial quarter of El Saladillo has been undergoing restoration and reveals the city\'s pre-oil character: tiled colonial houses, a waterfront promenade, and the Rafael Urdaneta Bridge — at 8.7 km, the longest pre-stressed concrete bridge in the world — visible across the lake.',
    ],
    quickFacts: [
      { label: 'How to get there', value: 'Direct flight from Caracas (1 hr)' },
      { label: 'Best for lightning', value: 'Sep – Nov (peak season)' },
      { label: 'Typical budget', value: '$30–70/day' },
      { label: 'Temperature', value: 'Hot year-round — 28–35°C average' },
    ],
    topActivities: [
      { icon: '⚡', name: 'Catatumbo Lightning', desc: 'Boat tour to the mouth of the Catatumbo River' },
      { icon: '🌉', name: 'Rafael Urdaneta Bridge', desc: 'Longest pre-stressed concrete bridge in the world' },
      { icon: '🏛️', name: 'El Saladillo', desc: 'Colonial quarter with restored 19th-century buildings' },
      { icon: '🐟', name: 'Lake Maracaibo', desc: 'Freshwater fishing and lakeside boat tours' },
      { icon: '🍖', name: 'Maracucho food', desc: 'Mandoca, mojito en coco, and pabellón zuliano' },
    ],
    guides: [
      {
        title: 'Catatumbo Lightning: The World\'s Most Reliable Storm',
        teaser: 'When to go, how to get to the viewing point, and why this natural phenomenon still doesn\'t get the attention it deserves.',
        tag: 'Natural Wonder',
        readTime: '7 min read',
        image: '/destinations/maracaibo.jpg',
      },
      {
        title: 'Maracaibo Food: A Guide to Zulia State Cuisine',
        teaser: 'Mandoca, patacón zuliano, and the breakfasts that explain why Maracuchos are obsessed with their own food culture.',
        tag: 'Food Guide',
        readTime: '6 min read',
        image: '/hero/gastronomy.jpg',
      },
    ],
  },
};
