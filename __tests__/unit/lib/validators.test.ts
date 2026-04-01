import {
  loginSchema,
  registerSchema,
  bookingSchema,
  listingSchema,
  reviewSchema,
} from '@/lib/validators';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'securePassword123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'securePassword123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('requires both email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validData = {
    email: 'user@example.com',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
    full_name: 'Maria García',
    acceptTerms: true,
  };

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('requires full_name', () => {
    const result = registerSchema.safeParse({ ...validData, full_name: '' });
    expect(result.success).toBe(false);
  });

  it('requires acceptTerms to be true', () => {
    const result = registerSchema.safeParse({ ...validData, acceptTerms: false });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      ...validData,
      confirmPassword: 'differentPassword',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten();
      expect(errors.fieldErrors.confirmPassword).toBeDefined();
    }
  });

  it('requires name with at least 2 characters', () => {
    const result = registerSchema.safeParse({ ...validData, full_name: 'A' });
    expect(result.success).toBe(false);
  });
});

describe('bookingSchema', () => {
  const validBooking = {
    listing_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    check_in: '2026-04-15',
    guests: 2,
  };

  it('accepts valid booking data', () => {
    const result = bookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it('requires listing_id as UUID', () => {
    const result = bookingSchema.safeParse({ ...validBooking, listing_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('requires check_in date', () => {
    const result = bookingSchema.safeParse({ ...validBooking, check_in: '' });
    expect(result.success).toBe(false);
  });

  it('requires positive guests count', () => {
    const result = bookingSchema.safeParse({ ...validBooking, guests: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts optional check_out and notes', () => {
    const result = bookingSchema.safeParse({
      ...validBooking,
      check_out: '2026-04-16',
      notes: 'Special request',
    });
    expect(result.success).toBe(true);
  });
});

describe('listingSchema', () => {
  const validListing = {
    title: 'Mérida Mountain Trek Adventure',
    description: 'A beautiful trek through the Venezuelan Andes mountains with expert guides providing equipment and local knowledge. This experience is perfect for adventure seekers.',
    short_description: 'Trek through the Venezuelan Andes with local guides.',
    category: 'mountains' as const,
    tags: ['hiking'],
    region: 'Mérida',
    location_name: 'Sierra Nevada',
    latitude: 8.6,
    longitude: -71.15,
    price_usd: 85,
    max_guests: 10,
    min_guests: 2,
    safety_level: 'green' as const,
    amenities: [],
    languages: ['es'],
    includes: [],
    excludes: [],
    cancellation_policy: 'moderate' as const,
  };

  it('accepts valid listing data', () => {
    const result = listingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it('requires title with at least 5 characters', () => {
    const result = listingSchema.safeParse({ ...validListing, title: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('requires description with at least 100 characters', () => {
    const result = listingSchema.safeParse({ ...validListing, description: 'Too short.' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = listingSchema.safeParse({ ...validListing, category: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('requires at least one tag', () => {
    const result = listingSchema.safeParse({ ...validListing, tags: [] });
    expect(result.success).toBe(false);
  });

  it('requires positive price', () => {
    const result = listingSchema.safeParse({ ...validListing, price_usd: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid safety_level', () => {
    const result = listingSchema.safeParse({ ...validListing, safety_level: 'unsafe' });
    expect(result.success).toBe(false);
  });
});

describe('reviewSchema', () => {
  const validReview = {
    booking_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    listing_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    rating: 5,
    body: 'Absolutely incredible experience, highly recommended to everyone visiting Venezuela!',
  };

  it('accepts valid review data', () => {
    const result = reviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it('rejects rating below 1', () => {
    const result = reviewSchema.safeParse({ ...validReview, rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = reviewSchema.safeParse({ ...validReview, rating: 6 });
    expect(result.success).toBe(false);
  });

  it('requires body with at least 20 characters', () => {
    const result = reviewSchema.safeParse({ ...validReview, body: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('accepts all integer ratings 1-5', () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      const result = reviewSchema.safeParse({ ...validReview, rating });
      expect(result.success).toBe(true);
    }
  });
});
