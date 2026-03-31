import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    phone: z.string().optional(),
    nationality: z.string().optional(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const providerRegisterSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    business_name: z.string().min(2, 'Business name must be at least 2 characters').max(200),
    description: z.string().min(50, 'Description must be at least 50 characters').max(1000),
    region: z.string().min(1, 'Region is required'),
    phone: z.string().optional(),
    rif: z.string().optional(),
    instagram_handle: z.string().optional(),
    website_url: z.string().url('Invalid URL').optional().or(z.literal('')),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(100, 'Description must be at least 100 characters').max(5000),
  short_description: z.string().min(20, 'Short description must be at least 20 characters').max(300),
  category: z.enum(['beaches', 'mountains', 'cities', 'eco-tours', 'gastronomy', 'adventure', 'wellness', 'cultural']),
  tags: z.array(z.string()).min(1, 'Select at least one tag').max(10),
  region: z.string().min(1, 'Region is required'),
  location_name: z.string().min(2, 'Location name is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  price_usd: z.number().positive('Price must be positive').max(100000),
  duration_hours: z.number().positive().optional(),
  max_guests: z.number().int().positive().max(1000),
  min_guests: z.number().int().min(1),
  safety_level: z.enum(['green', 'yellow', 'orange', 'red']),
  amenities: z.array(z.string()),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  includes: z.array(z.string()),
  excludes: z.array(z.string()),
  cancellation_policy: z.enum(['flexible', 'moderate', 'strict', 'non-refundable']),
  meeting_point: z.string().optional(),
  is_published: z.boolean().default(false),
  cover_image_url: z.string().optional(),
  photos: z.array(z.string()).default([]),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
});

export const bookingSchema = z.object({
  listing_id: z.string().uuid(),
  check_in: z.string().min(1, 'Check-in date is required'),
  check_out: z.string().optional(),
  guests: z.number().int().positive('Number of guests is required'),
  notes: z.string().max(500).optional(),
  special_requests: z.string().max(500).optional(),
});

export const reviewSchema = z.object({
  booking_id: z.string().uuid(),
  listing_id: z.string().uuid(),
  rating: z.number().int().min(1, 'Rating is required').max(5),
  title: z.string().max(100).optional(),
  body: z.string().min(20, 'Review must be at least 20 characters').max(2000),
  photos: z.array(z.string().url()).optional(),
});

export const itinerarySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000).optional(),
  cover_image_url: z.string().url().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_public: z.boolean().default(false),
  is_template: z.boolean().default(false),
  tags: z.array(z.string()).max(10).default([]),
});

export const itineraryStopSchema = z.object({
  listing_id: z.string().uuid().optional(),
  day: z.number().int().positive(),
  order: z.number().int().min(0),
  title: z.string().min(2, 'Stop title is required').max(200),
  description: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location_name: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_hours: z.number().positive().optional(),
  cost_usd: z.number().min(0).default(0),
  transport_to_next: z.string().optional(),
  transport_duration_minutes: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const providerSchema = z.object({
  business_name: z.string().min(2, 'Business name is required').max(200),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000),
  region: z.string().min(1, 'Region is required'),
  logo_url: z.string().url().optional(),
  website_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  instagram_handle: z.string().optional(),
  whatsapp_number: z.string().optional(),
  rif: z.string().optional(),
});

export const searchSchema = z.object({
  query: z.string().max(500),
  category: z.enum(['beaches', 'mountains', 'cities', 'eco-tours', 'gastronomy', 'adventure', 'wellness', 'cultural']).optional(),
  region: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  safetyLevel: z.enum(['green', 'yellow', 'orange', 'red']).optional(),
  tags: z.array(z.string()).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ProviderRegisterFormData = z.infer<typeof providerRegisterSchema>;
export type ListingFormData = z.infer<typeof listingSchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
export type ItineraryFormData = z.infer<typeof itinerarySchema>;
export type ItineraryStopFormData = z.infer<typeof itineraryStopSchema>;
export type ProviderFormData = z.infer<typeof providerSchema>;
export type SearchFormData = z.infer<typeof searchSchema>;
