import {
  normalizeCategory,
  getCategoryColor,
  CATEGORY_COLORS,
  BUSINESS_CATEGORIES,
  calculateBounds,
  buildGeoJSON,
  getSafetyColor,
} from '@/lib/mapbox/helpers';

// ── normalizeCategory ──────────────────────────────────────────────

describe('normalizeCategory', () => {
  it('maps "restaurants" to "gastronomy"', () => {
    expect(normalizeCategory('restaurants')).toBe('gastronomy');
  });

  it('maps "culture" to "cultural"', () => {
    expect(normalizeCategory('culture')).toBe('cultural');
  });

  it('maps "cities" to "accommodation"', () => {
    expect(normalizeCategory('cities')).toBe('accommodation');
  });

  it('passes through canonical categories unchanged', () => {
    expect(normalizeCategory('accommodation')).toBe('accommodation');
    expect(normalizeCategory('gastronomy')).toBe('gastronomy');
    expect(normalizeCategory('adventure')).toBe('adventure');
    expect(normalizeCategory('beaches')).toBe('beaches');
    expect(normalizeCategory('eco-tours')).toBe('eco-tours');
    expect(normalizeCategory('mountains')).toBe('mountains');
    expect(normalizeCategory('cultural')).toBe('cultural');
    expect(normalizeCategory('wellness')).toBe('wellness');
  });

  it('returns "other" for undefined', () => {
    expect(normalizeCategory(undefined)).toBe('other');
  });

  it('passes through unknown categories unchanged', () => {
    expect(normalizeCategory('nightlife')).toBe('nightlife');
  });
});

// ── getCategoryColor ───────────────────────────────────────────────

describe('getCategoryColor', () => {
  it('returns the correct color for canonical categories', () => {
    expect(getCategoryColor('accommodation')).toBe('#3B82F6');
    expect(getCategoryColor('gastronomy')).toBe('#F97316');
    expect(getCategoryColor('beaches')).toBe('#0EA5E9');
  });

  it('resolves aliases before looking up color', () => {
    expect(getCategoryColor('restaurants')).toBe(CATEGORY_COLORS.gastronomy);
    expect(getCategoryColor('culture')).toBe(CATEGORY_COLORS.cultural);
    expect(getCategoryColor('cities')).toBe(CATEGORY_COLORS.accommodation);
  });

  it('returns default gray for unknown categories', () => {
    expect(getCategoryColor('nightlife')).toBe('#6B7280');
    expect(getCategoryColor('other')).toBe('#6B7280');
  });
});

// ── BUSINESS_CATEGORIES ────────────────────────────────────────────

describe('BUSINESS_CATEGORIES', () => {
  it('has 8 categories', () => {
    expect(BUSINESS_CATEGORIES).toHaveLength(8);
  });

  it('every category key exists in CATEGORY_COLORS', () => {
    for (const cat of BUSINESS_CATEGORIES) {
      expect(CATEGORY_COLORS[cat.key]).toBeDefined();
      expect(cat.color).toBe(CATEGORY_COLORS[cat.key]);
    }
  });

  it('keys are unique', () => {
    const keys = BUSINESS_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ── buildGeoJSON ───────────────────────────────────────────────────

describe('buildGeoJSON', () => {
  const pins = [
    { id: '1', lat: 10.5, lng: -66.9, title: 'Hotel A', category: 'accommodation', city: 'Caracas', region: 'Miranda' },
    { id: '2', lat: 10.6, lng: -67.0, title: 'Beach B', category: 'beaches', city: 'Choroní', region: 'Aragua' },
    { id: '3', lat: 8.3, lng: -62.6, title: 'Tour C', category: 'adventure', city: 'Canaima', region: 'Bolívar' },
    { id: '4', lat: 10.4, lng: -67.1, title: 'Restaurant D', category: 'restaurants', city: 'Caracas', region: 'Miranda' },
  ];

  it('returns all pins when no categories are hidden', () => {
    const geo = buildGeoJSON(pins, new Set());
    expect(geo.type).toBe('FeatureCollection');
    expect(geo.features).toHaveLength(4);
  });

  it('filters out hidden categories', () => {
    const geo = buildGeoJSON(pins, new Set(['accommodation']));
    expect(geo.features).toHaveLength(3);
    expect(geo.features.find((f) => f.properties.id === '1')).toBeUndefined();
  });

  it('normalizes category aliases when filtering', () => {
    // "restaurants" normalizes to "gastronomy", so hiding "gastronomy" should remove pin 4
    const geo = buildGeoJSON(pins, new Set(['gastronomy']));
    expect(geo.features).toHaveLength(3);
    expect(geo.features.find((f) => f.properties.id === '4')).toBeUndefined();
  });

  it('hides multiple categories at once', () => {
    const geo = buildGeoJSON(pins, new Set(['accommodation', 'beaches', 'adventure']));
    expect(geo.features).toHaveLength(1);
    expect(geo.features[0].properties.id).toBe('4');
  });

  it('returns empty features when all categories are hidden', () => {
    const geo = buildGeoJSON(pins, new Set(['accommodation', 'beaches', 'adventure', 'gastronomy']));
    expect(geo.features).toHaveLength(0);
  });

  it('sets coordinates as [lng, lat] (GeoJSON standard)', () => {
    const geo = buildGeoJSON([pins[0]], new Set());
    const coords = geo.features[0].geometry.coordinates;
    expect(coords).toEqual([-66.9, 10.5]);
  });

  it('maps properties correctly', () => {
    const geo = buildGeoJSON([{ ...pins[0], slug: 'hotel-a', rating: 4.5, reviewCount: 12, listingId: '1', isVerified: true }], new Set());
    const props = geo.features[0].properties;
    expect(props.id).toBe('1');
    expect(props.title).toBe('Hotel A');
    expect(props.slug).toBe('hotel-a');
    expect(props.rating).toBe(4.5);
    expect(props.reviewCount).toBe(12);
    expect(props.isVerified).toBe(1);
  });

  it('defaults optional properties', () => {
    const geo = buildGeoJSON([{ id: '5', lat: 10, lng: -66, title: 'Minimal' }], new Set());
    const props = geo.features[0].properties;
    expect(props.slug).toBe('');
    expect(props.category).toBe('other');
    expect(props.rating).toBeNull();
    expect(props.reviewCount).toBe(0);
    expect(props.isVerified).toBe(0);
  });
});

// ── calculateBounds ────────────────────────────────────────────────

describe('calculateBounds', () => {
  it('returns null for empty array', () => {
    expect(calculateBounds([])).toBeNull();
  });

  it('returns correct bounds for single coordinate', () => {
    const bounds = calculateBounds([{ lat: 10, lng: -66 }]);
    expect(bounds).toEqual({ north: 10, south: 10, east: -66, west: -66 });
  });

  it('returns correct bounds for multiple coordinates', () => {
    const coords = [
      { lat: 10, lng: -66 },
      { lat: 8, lng: -62 },
      { lat: 12, lng: -70 },
    ];
    const bounds = calculateBounds(coords);
    expect(bounds).toEqual({ north: 12, south: 8, east: -62, west: -70 });
  });
});

// ── getSafetyColor ─────────────────────────────────────────────────

describe('getSafetyColor', () => {
  it('returns correct colors for known levels', () => {
    expect(getSafetyColor('green')).toBe('#22C55E');
    expect(getSafetyColor('yellow')).toBe('#EAB308');
    expect(getSafetyColor('orange')).toBe('#F97316');
    expect(getSafetyColor('red')).toBe('#EF4444');
  });

  it('returns default gray for unknown levels', () => {
    expect(getSafetyColor('purple')).toBe('#6B7280');
    expect(getSafetyColor('')).toBe('#6B7280');
  });
});
