import {
  LISTING_CATEGORIES,
  VENEZUELA_REGIONS,
  SAFETY_LEVELS,
  BOOKING_STATUSES,
  PLATFORM_COMMISSION_RATE,
  VENEZUELA_CENTER,
  VENEZUELA_DEFAULT_ZOOM,
} from '@/lib/constants';

describe('LISTING_CATEGORIES', () => {
  it('has the expected number of categories', () => {
    expect(LISTING_CATEGORIES).toHaveLength(8);
  });

  it('contains beaches category', () => {
    const beaches = LISTING_CATEGORIES.find((c) => c.value === 'beaches');
    expect(beaches).toBeDefined();
    expect(beaches?.label).toBe('Beaches');
  });

  it('contains all expected category values', () => {
    const values = LISTING_CATEGORIES.map((c) => c.value);
    expect(values).toContain('beaches');
    expect(values).toContain('mountains');
    expect(values).toContain('cities');
    expect(values).toContain('eco-tours');
    expect(values).toContain('gastronomy');
    expect(values).toContain('adventure');
    expect(values).toContain('wellness');
    expect(values).toContain('cultural');
  });

  it('each category has icon and description', () => {
    LISTING_CATEGORIES.forEach((cat) => {
      expect(cat.icon).toBeTruthy();
      expect(cat.description).toBeTruthy();
    });
  });
});

describe('VENEZUELA_REGIONS', () => {
  it('has at least 8 regions', () => {
    expect(VENEZUELA_REGIONS.length).toBeGreaterThanOrEqual(8);
  });

  it('contains Los Roques', () => {
    const region = VENEZUELA_REGIONS.find((r) => r.id === 'los-roques');
    expect(region).toBeDefined();
    expect(region?.name).toBe('Los Roques');
  });

  it('contains Mérida', () => {
    const region = VENEZUELA_REGIONS.find((r) => r.id === 'merida');
    expect(region).toBeDefined();
  });

  it('contains Caracas', () => {
    const region = VENEZUELA_REGIONS.find((r) => r.id === 'caracas');
    expect(region).toBeDefined();
  });

  it('each region has lat, lng, safetyLevel, and highlights', () => {
    VENEZUELA_REGIONS.forEach((r) => {
      expect(typeof r.lat).toBe('number');
      expect(typeof r.lng).toBe('number');
      expect(r.safetyLevel).toBeDefined();
      expect(Array.isArray(r.highlights)).toBe(true);
    });
  });

  it('safety levels are valid values', () => {
    const validLevels = ['green', 'yellow', 'orange', 'red'];
    VENEZUELA_REGIONS.forEach((r) => {
      expect(validLevels).toContain(r.safetyLevel);
    });
  });
});

describe('SAFETY_LEVELS', () => {
  it('has green, yellow, orange, and red levels', () => {
    const values = SAFETY_LEVELS.map((s) => s.value);
    expect(values).toContain('green');
    expect(values).toContain('yellow');
    expect(values).toContain('orange');
    expect(values).toContain('red');
  });

  it('each level has label, color, bgColor, and description', () => {
    SAFETY_LEVELS.forEach((level) => {
      expect(level.label).toBeTruthy();
      expect(level.color).toBeTruthy();
      expect(level.bgColor).toBeTruthy();
      expect(level.description).toBeTruthy();
    });
  });

  it('green level is labelled Safe', () => {
    const green = SAFETY_LEVELS.find((s) => s.value === 'green');
    expect(green?.label).toBe('Safe');
  });

  it('red level is labelled Avoid', () => {
    const red = SAFETY_LEVELS.find((s) => s.value === 'red');
    expect(red?.label).toBe('Avoid');
  });
});

describe('BOOKING_STATUSES', () => {
  it('has 5 statuses', () => {
    expect(BOOKING_STATUSES).toHaveLength(5);
  });

  it('contains pending, confirmed, cancelled, completed, refunded', () => {
    const values = BOOKING_STATUSES.map((s) => s.value);
    expect(values).toContain('pending');
    expect(values).toContain('confirmed');
    expect(values).toContain('cancelled');
    expect(values).toContain('completed');
    expect(values).toContain('refunded');
  });
});

describe('PLATFORM_COMMISSION_RATE', () => {
  it('is 12%', () => {
    expect(PLATFORM_COMMISSION_RATE).toBe(0.12);
  });
});

describe('VENEZUELA_CENTER', () => {
  it('is a tuple of [longitude, latitude]', () => {
    expect(Array.isArray(VENEZUELA_CENTER)).toBe(true);
    expect(VENEZUELA_CENTER).toHaveLength(2);
    const [lng, lat] = VENEZUELA_CENTER;
    expect(lng).toBeCloseTo(-66.58);
    expect(lat).toBeCloseTo(8.0);
  });
});

describe('VENEZUELA_DEFAULT_ZOOM', () => {
  it('is a reasonable zoom level', () => {
    expect(VENEZUELA_DEFAULT_ZOOM).toBeGreaterThan(3);
    expect(VENEZUELA_DEFAULT_ZOOM).toBeLessThan(10);
  });
});
