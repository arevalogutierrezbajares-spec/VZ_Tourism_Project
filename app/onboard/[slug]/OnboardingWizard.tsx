'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Star,
  MapPin,
  Phone,
  AtSign,
  Camera,
  RefreshCw,
  Plus,
  Minus,
  X,
  Copy,
  Share2,
  ExternalLink,
  Wifi,
  Wind,
  Droplets,
  Zap,
  Waves,
  Car,
  UtensilsCrossed,
  Plane,
  Mountain,
  Eye,
  DollarSign,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { ScrapedListing } from '@/lib/local-listings';
import type { OnboardingSession, RoomType, PaymentMethod } from '@/lib/onboarding-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingWithPhotos = ScrapedListing & { photos?: string[] };

interface WizardData {
  // Step 1
  owner_name: string;
  owner_phone: string;
  owner_instagram: string;
  verification_method: 'phone' | 'instagram' | 'photo';
  verification_status: 'pending' | 'verified' | 'manual_review';
  // Step 2
  listing_name: string;
  listing_description: string;
  listing_category: string;
  selected_photos: string[];
  amenities: string[];
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_website: string;
  contact_instagram: string;
  // Step 3
  rooms: RoomType[];
  // Step 4
  availability_type: 'always' | 'specific';
  blocked_dates: string[];
  min_stay: number;
  max_guests_total: number;
  // Step 5
  booking_type: 'instant' | 'request';
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
  checkin_time: string;
  checkout_time: string;
  payment_methods: PaymentMethod[];
}

interface Props {
  listing: ListingWithPhotos;
  initialSession: OnboardingSession | null;
  priceSuggestion: { min: number; max: number };
}

// ─── Amenities config ─────────────────────────────────────────────────────────

const AMENITIES = [
  { id: 'wifi', label: 'WiFi', icon: Wifi, critical: true },
  { id: 'ac', label: 'Air Conditioning', icon: Wind, critical: true },
  { id: 'hot_water', label: 'Hot Water', icon: Droplets, critical: true },
  { id: 'generator', label: 'Generator', icon: Zap, critical: true },
  { id: 'pool', label: 'Pool', icon: Waves, critical: false },
  { id: 'parking', label: 'Parking', icon: Car, critical: false },
  { id: 'restaurant', label: 'Restaurant On-Site', icon: UtensilsCrossed, critical: false },
  { id: 'airport_transfer', label: 'Airport Transfer', icon: Plane, critical: false },
  { id: 'ocean_view', label: 'Ocean View', icon: Eye, critical: false },
  { id: 'mountain_view', label: 'Mountain View', icon: Mountain, critical: false },
];

const CANCELLATION_POLICIES = [
  {
    id: 'flexible' as const,
    label: 'Flexible',
    icon: '✅',
    desc: 'Free cancellation up to 24h before check-in',
  },
  {
    id: 'moderate' as const,
    label: 'Moderate',
    icon: '⚖️',
    desc: 'Free cancellation up to 5 days before check-in',
  },
  {
    id: 'strict' as const,
    label: 'Strict',
    icon: '🔒',
    desc: 'Non-refundable once booked',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(str: string): string {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPriceLevel(price: number): string {
  if (price < 40) return '$';
  if (price < 80) return '$$';
  if (price < 150) return '$$$';
  return '$$$$';
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingWizard({ listing, initialSession, priceSuggestion }: Props) {
  const slug = listing.slug;
  const allPhotos = listing.photos ?? (listing.cover_image_url ? [listing.cover_image_url] : []);

  const [step, setStep] = useState<number>(initialSession?.step && initialSession.step < 7 ? initialSession.step : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; manual_review?: boolean } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(!!initialSession);

  const [data, setData] = useState<WizardData>({
    owner_name: initialSession?.owner_name ?? '',
    owner_phone: initialSession?.owner_phone ?? '',
    owner_instagram: initialSession?.owner_instagram ?? '',
    verification_method: 'phone',
    verification_status: (initialSession?.verification_status as WizardData['verification_status']) ?? 'pending',
    listing_name: initialSession?.listing_name ?? capitalize(listing.name),
    listing_description: initialSession?.listing_description ?? listing.description ?? '',
    listing_category: initialSession?.listing_category ?? listing.type ?? 'hotel',
    selected_photos: initialSession?.selected_photos ?? allPhotos.slice(0, 5),
    amenities: initialSession?.amenities ?? ['wifi', 'hot_water'],
    contact_phone: listing.phone ?? '',
    contact_whatsapp: listing.phone ?? '',
    contact_email: '',
    contact_website: listing.website ?? '',
    contact_instagram: listing.instagram_handle ?? '',
    rooms: initialSession?.rooms ?? [
      { id: '1', name: 'Standard Room', max_guests: 2, price_usd: 0, photo_url: undefined },
    ],
    availability_type: (initialSession?.availability_type as WizardData['availability_type']) ?? 'always',
    blocked_dates: initialSession?.blocked_dates ?? [],
    min_stay: initialSession?.min_stay ?? 1,
    max_guests_total: initialSession?.max_guests_total ?? 10,
    booking_type: (initialSession?.booking_type as WizardData['booking_type']) ?? 'instant',
    cancellation_policy: (initialSession?.cancellation_policy as WizardData['cancellation_policy']) ?? 'flexible',
    checkin_time: initialSession?.checkin_time ?? '14:00',
    checkout_time: initialSession?.checkout_time ?? '11:00',
    payment_methods: initialSession?.payment_methods ?? [],
  });

  const update = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  const startSession = useCallback(async () => {
    if (sessionStarted) return;
    try {
      await fetch(`/api/onboard/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      setSessionStarted(true);
    } catch {
      // Non-fatal
    }
  }, [slug, sessionStarted]);

  useEffect(() => {
    startSession();
  }, [startSession]);

  const saveStep = useCallback(async (stepData: Partial<OnboardingSession>) => {
    setSaving(true);
    setError(null);
    try {
      await fetch(`/api/onboard/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_step', ...stepData }),
      });
    } catch {
      setError('Failed to save. Your progress is stored locally.');
    } finally {
      setSaving(false);
    }
  }, [slug]);

  const goNext = useCallback(async () => {
    const nextStep = step + 1;
    const stepPayload = buildStepPayload(step, data, nextStep);
    await saveStep(stepPayload);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, data, saveStep]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleVerify = useCallback(async () => {
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const value =
        data.verification_method === 'phone'
          ? data.owner_phone
          : data.verification_method === 'instagram'
          ? data.owner_instagram
          : 'photo';

      const res = await fetch(`/api/onboard/${slug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: data.verification_method,
          value,
          owner_name: data.owner_name,
        }),
      });
      const json = await res.json() as { verified: boolean; manual_review?: boolean };
      setVerifyResult(json);
      if (json.verified) {
        update('verification_status', 'verified');
      } else {
        update('verification_status', 'manual_review');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  }, [slug, data, update]);

  const generateDescription = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/onboard/${slug}/ai-description`, {
        method: 'POST',
      });
      const json = await res.json() as { description: string };
      if (json.description) update('listing_description', json.description);
    } catch {
      setError('Could not generate description. Please write one manually.');
    } finally {
      setAiLoading(false);
    }
  }, [slug, update]);

  const completeListing = useCallback(async () => {
    setSaving(true);
    try {
      // Final save
      await saveStep({
        payment_methods: data.payment_methods,
        booking_type: data.booking_type,
        cancellation_policy: data.cancellation_policy,
        checkin_time: data.checkin_time,
        checkout_time: data.checkout_time,
        step: 6,
      });
      // Complete
      await fetch(`/api/onboard/${slug}`, { method: 'PUT' });
      setStep(7);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Failed to go live. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [slug, data, saveStep]);

  const listingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/listing/${slug}`
    : `/listing/${slug}`;

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(listingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [listingUrl]);

  const TOTAL_STEPS = 6;
  const progress = Math.min(((step - 1) / TOTAL_STEPS) * 100, 100);

  if (step === 7) {
    return <StepGoLive listing={listing} slug={slug} copied={copied} copyLink={copyLink} listingUrl={listingUrl} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {step > 1 && (
            <button onClick={goBack} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Step {step} of {TOTAL_STEPS}
              </span>
              <span className="text-xs text-gray-400">{Math.round(progress)}% complete</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Step dots */}
            <div className="flex items-center gap-1.5 mt-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    s < step ? 'bg-blue-600' : s === step ? 'bg-blue-400' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {step === 1 && (
          <Step1Verify
            listing={listing}
            data={data}
            update={update}
            onVerify={handleVerify}
            verifyLoading={verifyLoading}
            verifyResult={verifyResult}
          />
        )}
        {step === 2 && (
          <Step2Review
            listing={listing}
            data={data}
            update={update}
            allPhotos={allPhotos}
            onGenerateDescription={generateDescription}
            aiLoading={aiLoading}
          />
        )}
        {step === 3 && (
          <Step3Rooms
            data={data}
            update={update}
            region={listing.city ?? listing.region}
            priceSuggestion={priceSuggestion}
          />
        )}
        {step === 4 && (
          <Step4Availability data={data} update={update} />
        )}
        {step === 5 && (
          <Step5Booking data={data} update={update} />
        )}
      </div>

      {/* Footer CTA */}
      {step < 6 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 max-w-lg mx-auto w-full">
          <button
            onClick={goNext}
            disabled={saving || !canProceed(step, data, verifyResult)}
            className="w-full bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {step === 1 ? 'Verify & Continue' : 'Continue'}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
      {step === 5 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 max-w-lg mx-auto w-full">
          <button
            onClick={completeListing}
            disabled={saving || data.payment_methods.length === 0}
            className="w-full bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                🚀 Go Live!
              </>
            )}
          </button>
          {data.payment_methods.length === 0 && (
            <p className="text-center text-xs text-gray-400 mt-2">Add at least one payment method to continue</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── canProceed logic ─────────────────────────────────────────────────────────

function canProceed(
  step: number,
  data: WizardData,
  verifyResult: { verified: boolean; manual_review?: boolean } | null
): boolean {
  if (step === 1) {
    if (!data.owner_name.trim()) return false;
    if (data.verification_method === 'phone' && !data.owner_phone.trim()) return false;
    if (data.verification_method === 'instagram' && !data.owner_instagram.trim()) return false;
    return verifyResult !== null; // must have attempted verification
  }
  if (step === 2) {
    return data.listing_name.trim().length > 0 && data.listing_description.trim().length > 0;
  }
  if (step === 3) {
    return data.rooms.length > 0 && data.rooms.every((r) => r.name.trim() && r.price_usd > 0);
  }
  if (step === 4) return true;
  return true;
}

// ─── buildStepPayload ─────────────────────────────────────────────────────────

function buildStepPayload(step: number, data: WizardData, nextStep: number): Partial<OnboardingSession> {
  const base: Partial<OnboardingSession> = { step: nextStep };
  if (step === 1) {
    return {
      ...base,
      owner_name: data.owner_name,
      owner_phone: data.owner_phone,
      owner_instagram: data.owner_instagram,
      verification_status: data.verification_status,
    };
  }
  if (step === 2) {
    return {
      ...base,
      listing_name: data.listing_name,
      listing_description: data.listing_description,
      listing_category: data.listing_category,
      selected_photos: data.selected_photos,
      amenities: data.amenities,
    };
  }
  if (step === 3) {
    return { ...base, rooms: data.rooms };
  }
  if (step === 4) {
    return {
      ...base,
      availability_type: data.availability_type,
      blocked_dates: data.blocked_dates,
      min_stay: data.min_stay,
      max_guests_total: data.max_guests_total,
    };
  }
  return base;
}

// ─── Step 1: Verify ───────────────────────────────────────────────────────────

function Step1Verify({
  listing,
  data,
  update,
  onVerify,
  verifyLoading,
  verifyResult,
}: {
  listing: ListingWithPhotos;
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
  onVerify: () => void;
  verifyLoading: boolean;
  verifyResult: { verified: boolean; manual_review?: boolean } | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Verify Your Business</h2>
        <p className="text-sm text-gray-500 mt-1">Confirm this is your business to claim your listing.</p>
      </div>

      {/* Business card */}
      <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        {listing.cover_image_url && (
          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
            <Image src={listing.cover_image_url} alt={listing.name} fill className="object-cover" />
          </div>
        )}
        <div>
          <div className="font-semibold text-gray-900 text-sm">{capitalize(listing.name)}</div>
          {listing.city && (
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {listing.city}, Venezuela
            </div>
          )}
          {listing.avg_rating && (
            <div className="text-xs text-amber-500 flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 fill-amber-500" />
              {listing.avg_rating} ({listing.review_count.toLocaleString()} reviews)
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your name *</label>
        <input
          type="text"
          placeholder="María González"
          value={data.owner_name}
          onChange={(e) => update('owner_name', e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Method tabs */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Verify with</label>
        <div className="flex gap-2 mb-4">
          {(['phone', 'instagram', 'photo'] as const).map((m) => (
            <button
              key={m}
              onClick={() => update('verification_method', m)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                data.verification_method === m
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {m === 'phone' ? (
                <><Phone className="w-3.5 h-3.5 inline mr-1" />WhatsApp</>
              ) : m === 'instagram' ? (
                <><AtSign className="w-3.5 h-3.5 inline mr-1" />Instagram</>
              ) : (
                <><Camera className="w-3.5 h-3.5 inline mr-1" />Photo</>
              )}
            </button>
          ))}
        </div>

        {data.verification_method === 'phone' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Enter your WhatsApp number
              {listing.phone && (
                <span className="ml-2 text-gray-400">(We&apos;ll check if it matches {listing.phone.slice(0, 6)}…)</span>
              )}
            </label>
            <input
              type="tel"
              placeholder="+58 412 555 1234"
              value={data.owner_phone}
              onChange={(e) => update('owner_phone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {data.verification_method === 'instagram' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Enter your Instagram handle</label>
            <input
              type="text"
              placeholder="@yourhandle"
              value={data.owner_instagram}
              onChange={(e) => update('owner_instagram', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {data.verification_method === 'photo' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            <Camera className="w-4 h-4 inline mr-1" />
            Upload a photo of yourself at the business. Our team will verify within 24h.
            <p className="text-xs mt-1 text-amber-600">You can continue setting up your listing in the meantime.</p>
          </div>
        )}
      </div>

      {/* Verify button */}
      <button
        onClick={onVerify}
        disabled={verifyLoading || !data.owner_name.trim() || (
          data.verification_method === 'phone' ? !data.owner_phone.trim() :
          data.verification_method === 'instagram' ? !data.owner_instagram.trim() : false
        )}
        className="w-full bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-gray-800"
      >
        {verifyLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : 'Verify Ownership'}
      </button>

      {/* Result */}
      {verifyResult && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          verifyResult.verified
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {verifyResult.verified ? (
            <><Check className="w-4 h-4" /> Identity verified! You can continue.</>
          ) : (
            <><AlertCircle className="w-4 h-4" /> We&apos;ll verify your ownership manually within 24h. You can continue setting up.</>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Review Listing ───────────────────────────────────────────────────

function Step2Review({
  listing,
  data,
  update,
  allPhotos,
  onGenerateDescription,
  aiLoading,
}: {
  listing: ListingWithPhotos;
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
  allPhotos: string[];
  onGenerateDescription: () => void;
  aiLoading: boolean;
}) {
  const togglePhoto = (url: string) => {
    const selected = data.selected_photos;
    if (selected.includes(url)) {
      update('selected_photos', selected.filter((p) => p !== url));
    } else {
      update('selected_photos', [...selected, url]);
    }
  };

  const toggleAmenity = (id: string) => {
    const ams = data.amenities;
    if (ams.includes(id)) {
      update('amenities', ams.filter((a) => a !== id));
    } else {
      update('amenities', [...ams, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Your Listing</h2>
        <p className="text-sm text-gray-500 mt-1">We pre-filled everything from Google. Just confirm or edit.</p>
      </div>

      {/* Photos */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Photos <span className="text-gray-400 font-normal">({data.selected_photos.length} selected)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {allPhotos.slice(0, 6).map((url, i) => {
            const selected = data.selected_photos.includes(url);
            return (
              <button
                key={i}
                onClick={() => togglePhoto(url)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selected ? 'border-blue-500' : 'border-transparent opacity-60'
                }`}
              >
                <Image src={url} alt="" fill className="object-cover" />
                {selected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {allPhotos.length === 0 && (
          <div className="h-24 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            No photos available
          </div>
        )}
      </section>

      {/* Name */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Name</label>
        <input
          type="text"
          value={data.listing_name}
          onChange={(e) => update('listing_name', e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </section>

      {/* Category */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
        <select
          value={data.listing_category}
          onChange={(e) => update('listing_category', e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="hotel">Hotel</option>
          <option value="posada">Posada</option>
          <option value="hostal">Hostal</option>
          <option value="casa_vacacional">Casa Vacacional</option>
          <option value="restaurant">Restaurant</option>
          <option value="tour">Tour / Experience</option>
        </select>
      </section>

      {/* Description */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-gray-700">Description</label>
          <button
            onClick={onGenerateDescription}
            disabled={aiLoading}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {aiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {aiLoading ? 'Generating…' : '✨ Generate with AI'}
          </button>
        </div>
        <textarea
          value={data.listing_description}
          onChange={(e) => update('listing_description', e.target.value)}
          rows={5}
          placeholder="Describe your property…"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </section>

      {/* Amenities */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Amenities
          <span className="ml-1 text-xs text-gray-400 font-normal">(Venezuela essentials highlighted)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AMENITIES.map(({ id, label, icon: Icon, critical }) => {
            const active = data.amenities.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleAmenity(id)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  active
                    ? critical
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left text-xs">{label}</span>
                {critical && active && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">VZ</span>}
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Contact */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Contact Info</label>
        <div className="space-y-2">
          {[
            { key: 'contact_phone' as const, label: 'Phone', placeholder: '+58 212 555 1234' },
            { key: 'contact_whatsapp' as const, label: 'WhatsApp', placeholder: '+58 412 555 1234' },
            { key: 'contact_email' as const, label: 'Email', placeholder: 'info@hotel.com' },
            { key: 'contact_website' as const, label: 'Website', placeholder: 'https://hotel.com' },
            { key: 'contact_instagram' as const, label: 'Instagram', placeholder: '@hotelname' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 shrink-0 text-right">{label}</span>
              <input
                type="text"
                placeholder={placeholder}
                value={data[key] as string}
                onChange={(e) => update(key, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Step 3: Rooms & Pricing ──────────────────────────────────────────────────

function Step3Rooms({
  data,
  update,
  region,
  priceSuggestion,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
  region: string;
  priceSuggestion: { min: number; max: number };
}) {
  const addRoom = () => {
    const newRoom: RoomType = {
      id: String(Date.now()),
      name: '',
      max_guests: 2,
      price_usd: 0,
    };
    update('rooms', [...data.rooms, newRoom]);
  };

  const removeRoom = (id: string) => {
    update('rooms', data.rooms.filter((r) => r.id !== id));
  };

  const updateRoom = <K extends keyof RoomType>(id: string, key: K, value: RoomType[K]) => {
    update(
      'rooms',
      data.rooms.map((r) => (r.id === id ? { ...r, [key]: value } : r))
    );
  };

  const avgPrice =
    data.rooms.length > 0
      ? Math.round(data.rooms.reduce((sum, r) => sum + r.price_usd, 0) / data.rooms.length)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Rooms & Pricing</h2>
        <p className="text-sm text-gray-500 mt-1">Set up your room types and nightly rates.</p>
      </div>

      {/* Price suggestion */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <DollarSign className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <span className="font-semibold text-blue-800">Market rate in {region}:</span>
          <span className="text-blue-700 ml-1">
            ${priceSuggestion.min}–${priceSuggestion.max}/night
          </span>
          <p className="text-xs text-blue-500 mt-0.5">Based on similar properties in the area</p>
        </div>
      </div>

      {/* Rooms */}
      <div className="space-y-4">
        {data.rooms.map((room, idx) => (
          <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Room {idx + 1}</span>
              {data.rooms.length > 1 && (
                <button
                  onClick={() => removeRoom(room.id)}
                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Room name (e.g. Double Room, Suite)"
                value={room.name}
                onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="grid grid-cols-2 gap-3">
                {/* Max guests */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Max guests</label>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateRoom(room.id, 'max_guests', Math.max(1, room.max_guests - 1))}
                      className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-center text-sm font-medium">{room.max_guests}</span>
                    <button
                      onClick={() => updateRoom(room.id, 'max_guests', Math.min(8, room.max_guests + 1))}
                      className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {/* Price */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Price per night (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={room.price_usd || ''}
                      onChange={(e) => updateRoom(room.id, 'price_usd', parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              {room.price_usd > 0 && (
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  Price level: <span className="text-amber-500 font-bold">{getPriceLevel(room.price_usd)}</span>
                  {room.price_usd >= priceSuggestion.min && room.price_usd <= priceSuggestion.max && (
                    <span className="text-green-500 ml-1">✓ In market range</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRoom}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Another Room Type
      </button>

      {avgPrice > 0 && (
        <div className="p-3 bg-gray-50 rounded-xl text-center text-sm text-gray-600">
          Average nightly rate: <span className="font-bold text-gray-900">${avgPrice}</span>
          <span className="ml-2 text-amber-500 font-bold">{getPriceLevel(avgPrice)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Availability ─────────────────────────────────────────────────────

function Step4Availability({
  data,
  update,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
}) {
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [displayYear, setDisplayYear] = useState(today.getFullYear());

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const toggleDate = (dateStr: string) => {
    const blocked = data.blocked_dates;
    if (blocked.includes(dateStr)) {
      update('blocked_dates', blocked.filter((d) => d !== dateStr));
    } else {
      update('blocked_dates', [...blocked, dateStr]);
    }
  };

  const goNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear((y) => y + 1);
    } else {
      setDisplayMonth((m) => m + 1);
    }
  };
  const goPrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear((y) => y - 1);
    } else {
      setDisplayMonth((m) => m - 1);
    }
  };

  const monthName = new Date(displayYear, displayMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = getDaysInMonth(displayMonth, displayYear);
  const firstDay = getFirstDayOfMonth(displayMonth, displayYear);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Availability & Calendar</h2>
        <p className="text-sm text-gray-500 mt-1">When are you available for bookings?</p>
      </div>

      {/* Toggle */}
      <div className="space-y-2">
        {[
          { id: 'always' as const, label: 'Available every day', sub: 'Guests can book any date (recommended)' },
          { id: 'specific' as const, label: 'I want to block specific dates', sub: 'Tap dates on the calendar to block them' },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => update('availability_type', opt.id)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              data.availability_type === opt.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              data.availability_type === opt.id ? 'border-blue-500' : 'border-gray-300'
            }`}>
              {data.availability_type === opt.id && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Calendar */}
      {data.availability_type === 'specific' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900">{monthName}</span>
            <button onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isBlocked = data.blocked_dates.includes(dateStr);
              const isPast = new Date(dateStr + 'T12:00:00') < today;
              return (
                <button
                  key={day}
                  disabled={isPast}
                  onClick={() => !isPast && toggleDate(dateStr)}
                  className={`aspect-square rounded-lg text-xs font-medium transition-colors ${
                    isPast
                      ? 'text-gray-200 cursor-not-allowed'
                      : isBlocked
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {data.blocked_dates.length > 0 && (
            <div className="mt-3 text-xs text-gray-500 text-center">
              {data.blocked_dates.length} date{data.blocked_dates.length !== 1 ? 's' : ''} blocked
              {data.blocked_dates.slice(0, 3).map((d) => (
                <span key={d} className="ml-1 bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{formatDate(d)}</span>
              ))}
              {data.blocked_dates.length > 3 && <span className="ml-1">+{data.blocked_dates.length - 3} more</span>}
            </div>
          )}
        </div>
      )}

      {/* Min stay & max guests */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min stay</label>
          <select
            value={data.min_stay}
            onChange={(e) => update('min_stay', parseInt(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>1 night</option>
            <option value={2}>2 nights</option>
            <option value={3}>3 nights</option>
            <option value={7}>7 nights</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max guests total</label>
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => update('max_guests_total', Math.max(1, data.max_guests_total - 1))}
              className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="flex-1 text-center text-sm font-medium">{data.max_guests_total}</span>
            <button
              onClick={() => update('max_guests_total', Math.min(100, data.max_guests_total + 1))}
              className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Booking & Payment ────────────────────────────────────────────────

function Step5Booking({
  data,
  update,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
}) {
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({
    zelle: '',
    usdt: '',
    binance: '',
    bank: '',
  });

  const togglePayment = (type: PaymentMethod['type']) => {
    const existing = data.payment_methods.find((p) => p.type === type);
    if (existing) {
      update('payment_methods', data.payment_methods.filter((p) => p.type !== type));
    } else {
      if (type === 'cash') {
        update('payment_methods', [...data.payment_methods, { type: 'cash', details: 'Cash on arrival' }]);
      } else {
        // Only add once input is provided
        const val = paymentInputs[type];
        if (val.trim()) {
          update('payment_methods', [...data.payment_methods, { type, details: val.trim() }]);
        }
      }
    }
  };

  const updatePaymentInput = (type: string, value: string) => {
    setPaymentInputs((p) => ({ ...p, [type]: value }));
    // Update in payment_methods if already added
    const existing = data.payment_methods.find((p) => p.type === type);
    if (existing) {
      update('payment_methods', data.payment_methods.map((p) => p.type === type ? { ...p, details: value } : p));
    }
  };

  const isMethodActive = (type: string) => data.payment_methods.some((p) => p.type === type);

  const PAYMENT_OPTIONS = [
    { type: 'zelle' as const, label: 'Zelle', icon: '💳', placeholder: 'Email or phone number', needsInput: true },
    { type: 'usdt' as const, label: 'USDT TRC-20', icon: '🔐', placeholder: 'Wallet address (TRC-20)', needsInput: true },
    { type: 'binance' as const, label: 'Binance Pay', icon: '🟡', placeholder: 'Binance username', needsInput: true },
    { type: 'bank' as const, label: 'Bank Transfer', icon: '🏦', placeholder: 'Account details', needsInput: true },
    { type: 'cash' as const, label: 'Cash on Arrival', icon: '💵', placeholder: '', needsInput: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Booking & Payment</h2>
        <p className="text-sm text-gray-500 mt-1">Set how guests book and how you get paid.</p>
      </div>

      {/* Booking type */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-2">How should guests book?</label>
        <div className="space-y-2">
          {[
            { id: 'instant' as const, label: 'Instant Book', sub: 'Guests book immediately — no approval needed', badge: 'Recommended' },
            { id: 'request' as const, label: 'Request to Book', sub: 'You review and approve each booking', badge: null },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => update('booking_type', opt.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                data.booking_type === opt.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                data.booking_type === opt.id ? 'border-blue-500' : 'border-gray-300'
              }`}>
                {data.booking_type === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {opt.label}
                  {opt.badge && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Cancellation policy */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Cancellation Policy</label>
        <div className="grid grid-cols-3 gap-2">
          {CANCELLATION_POLICIES.map((pol) => (
            <button
              key={pol.id}
              onClick={() => update('cancellation_policy', pol.id)}
              className={`flex flex-col items-center p-3 rounded-xl border-2 text-center transition-all ${
                data.cancellation_policy === pol.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-xl mb-1">{pol.icon}</span>
              <span className="text-xs font-bold text-gray-900">{pol.label}</span>
              <span className="text-[10px] text-gray-400 mt-1 leading-tight">{pol.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Check-in / Check-out */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in & Check-out</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Check-in</label>
            <select
              value={data.checkin_time}
              onChange={(e) => update('checkin_time', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Check-out</label>
            <select
              value={data.checkout_time}
              onChange={(e) => update('checkout_time', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Payment methods */}
      <section>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Payment Methods <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-3">Select at least one method and enter your details.</p>
        <div className="space-y-2">
          {PAYMENT_OPTIONS.map(({ type, label, icon, placeholder, needsInput }) => {
            const active = isMethodActive(type);
            return (
              <div
                key={type}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  active ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
                }`}
              >
                <button
                  onClick={() => togglePayment(type)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-semibold text-gray-900 flex-1">{label}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    active ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {active && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
                {needsInput && (
                  <div className="px-3 pb-3">
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={paymentInputs[type] ?? ''}
                      onChange={(e) => updatePaymentInput(type, e.target.value)}
                      onBlur={() => {
                        const val = paymentInputs[type];
                        if (val?.trim() && !active) {
                          update('payment_methods', [...data.payment_methods, { type, details: val.trim() }]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ─── Step 7: Go Live! (confetti) ──────────────────────────────────────────────

function StepGoLive({
  listing,
  slug,
  copied,
  copyLink,
  listingUrl,
}: {
  listing: ListingWithPhotos;
  slug: string;
  copied: boolean;
  copyLink: () => void;
  listingUrl: string;
}) {
  const confettiRef = useRef<HTMLDivElement>(null);
  const name = capitalize(listing.name);

  // Trigger animation on mount
  useEffect(() => {
    const el = confettiRef.current;
    if (!el) return;
    el.style.opacity = '1';
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Confetti overlay */}
      <div
        ref={confettiRef}
        className="fixed inset-0 pointer-events-none z-0 opacity-0 transition-opacity duration-500"
        style={{ opacity: 1 }}
      >
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'][i % 5],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random() * 2}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-10 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold mb-2">Your listing is live!</h1>
          <p className="text-blue-100 text-sm">{name} is now on VZ Explorer</p>
        </div>

        {/* Founding Partner badge */}
        <div className="mx-4 -mt-4 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-2xl p-5 text-center shadow-lg">
          <div className="text-2xl mb-1">🏆</div>
          <div className="font-bold text-amber-900 text-base">You&apos;re a Founding Partner!</div>
          <div className="text-sm text-amber-800 mt-1">
            <strong>0% commission</strong> for the next 6 months
          </div>
          <div className="text-xs text-amber-700 mt-1">Then just 8% — lowest in the industry</div>
        </div>

        {/* Listing preview card */}
        <div className="mx-4 mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {listing.cover_image_url && (
            <div className="relative h-36">
              <Image src={listing.cover_image_url} alt={listing.name} fill className="object-cover" />
            </div>
          )}
          <div className="p-4">
            <div className="font-semibold text-gray-900">{name}</div>
            {listing.city && (
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {listing.city}, Venezuela
              </div>
            )}
            {listing.avg_rating && (
              <div className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                <Star className="w-3 h-3 fill-amber-500" />
                {listing.avg_rating} · {listing.review_count.toLocaleString()} reviews
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mx-4 mt-4 space-y-3">
          <Link
            href={`/listing/${slug}`}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View My Listing
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={copyLink}
            className={`flex items-center justify-center gap-2 w-full border-2 font-bold py-3.5 rounded-xl transition-all ${
              copied
                ? 'border-green-400 text-green-600 bg-green-50'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {copied ? (
              <><Check className="w-4 h-4" />Link Copied!</>
            ) : (
              <><Copy className="w-4 h-4" />Copy Listing Link</>
            )}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check out my listing on VZ Explorer: ${listingUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full border-2 border-green-400 text-green-700 font-bold py-3.5 rounded-xl hover:bg-green-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share on WhatsApp
          </a>
        </div>

        {/* QR Code placeholder */}
        <div className="mx-4 mt-4 p-5 bg-gray-50 rounded-2xl text-center border border-gray-200">
          <div className="w-32 h-32 bg-gray-900 rounded-xl mx-auto flex items-center justify-center mb-3">
            <div className="grid grid-cols-5 gap-0.5">
              {Array.from({ length: 25 }, (_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-sm ${
                    [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,7,12,17][i % 19] !== undefined
                      ? 'bg-white'
                      : 'bg-gray-900'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-700 mb-1">QR Code for your property</div>
          <div className="text-xs text-gray-400 mb-3">Print and display at your reception</div>
          <button className="text-sm text-blue-600 font-medium hover:text-blue-700">
            Download QR Code (PNG)
          </button>
        </div>

        {/* What happens next */}
        <div className="mx-4 mt-4 mb-8 p-5 bg-blue-50 rounded-2xl border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-3 text-sm">What happens next</h3>
          <div className="space-y-3">
            {[
              { emoji: '📱', time: 'Today', text: 'Welcome WhatsApp message with your dashboard link' },
              { emoji: '👀', time: 'Within 24h', text: 'Our team reviews your listing for quality' },
              { emoji: '🔔', time: 'First booking', text: 'Instant WhatsApp notification when a guest books' },
              { emoji: '💰', time: 'After check-out', text: 'Payment confirmed directly to your Zelle/USDT' },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{item.emoji}</span>
                <div>
                  <span className="text-xs font-bold text-blue-800">{item.time}: </span>
                  <span className="text-xs text-blue-700">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
