'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Tag,
  ChevronRight,
  Globe,
  Lock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpotReviewCard, type SpotState } from '@/components/itinerary/SpotReviewCard';
import type { DiscountCode } from '@/types/database';
import toast from 'react-hot-toast';

interface DraftData {
  spots: Array<{
    extracted_name: string;
    matched_listing_id: string | null;
    matched_listing_title: string | null;
    confidence: 'high' | 'medium' | 'low';
    region: string | null;
    day_hint: number | null;
    order_hint: number | null;
    source_url: string;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    video_embed_url: string | null;
    thumbnail_url: string | null;
  }>;
  urls: string[];
  creator_text: string | null;
  created_at: string;
}

interface ReviewSpot extends SpotState {
  day: number;
  order: number;
  source_url: string;
  video_embed_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function ReviewItineraryPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  const router = useRouter();

  const [draft, setDraft] = useState<DraftData | null>(null);
  const [spots, setSpots] = useState<ReviewSpot[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Load draft from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem(`creator_draft_${draftId}`);
    if (!raw) {
      setNotFound(true);
      return;
    }
    try {
      const data: DraftData = JSON.parse(raw);
      setDraft(data);
      setSpots(
        data.spots.map((s, idx) => ({
          extracted_name: s.extracted_name,
          matched_listing_id: s.matched_listing_id,
          matched_listing_title: s.matched_listing_title,
          confidence: s.confidence,
          region: s.region,
          description: s.description,
          included: true,
          resolved_listing_id: s.matched_listing_id,
          resolved_title: s.matched_listing_title,
          resolving: false,
          showGoogleSearch: false,
          thumbnail_url: s.thumbnail_url,
          source_url: s.source_url,
          day: s.day_hint ?? 1,
          order: s.order_hint ?? idx,
          video_embed_url: s.video_embed_url,
          latitude: s.latitude,
          longitude: s.longitude,
        }))
      );

      // Auto-generate title from first 2-3 spot names
      const names = data.spots
        .slice(0, 3)
        .map((s) => s.extracted_name)
        .join(', ');
      setTitle(`My Venezuela Trip: ${names}`);
      if (data.creator_text) setDescription(data.creator_text);
    } catch {
      setNotFound(true);
    }
  }, [draftId]);

  // Load creator's discount codes
  useEffect(() => {
    fetch('/api/discount-codes')
      .then((r) => r.json())
      .then((d) => {
        const active = (d.data || []).filter(
          (c: DiscountCode) => c.status === 'active'
        );
        setDiscountCodes(active);
      })
      .catch(() => {})
      .finally(() => setLoadingCodes(false));
  }, []);

  const updateSpot = (idx: number, patch: Partial<ReviewSpot>) => {
    setSpots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleResolveFromGoogle = async (idx: number, placeId: string) => {
    updateSpot(idx, { resolving: true });
    try {
      const response = await fetch('/api/places/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_place_id: placeId }),
      });
      if (!response.ok) throw new Error('Failed');
      const { listing } = await response.json();
      updateSpot(idx, {
        resolved_listing_id: listing.id,
        resolved_title: listing.title,
        latitude: listing.latitude,
        longitude: listing.longitude,
        confidence: 'high',
        resolving: false,
        showGoogleSearch: false,
      });
    } catch {
      toast.error('Failed to resolve place');
      updateSpot(idx, { resolving: false });
    }
  };

  const handlePublish = async () => {
    const included = spots.filter((s) => s.included);
    if (included.length === 0) {
      toast.error('Include at least one stop');
      return;
    }
    if (!title.trim()) {
      toast.error('Add a title for your itinerary');
      return;
    }

    setPublishing(true);

    try {
      const selectedCode = discountCodes.find((c) => c.id === selectedCodeId);

      const response = await fetch('/api/creator/itineraries/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          is_public: isPublic,
          referral_code: selectedCode?.code ?? null,
          creator_text: draft?.creator_text ?? null,
          tags: [],
          stops: included.map((s, idx) => ({
            extracted_name: s.resolved_title || s.extracted_name,
            resolved_listing_id: s.resolved_listing_id,
            day: s.day,
            order: s.order ?? idx,
            description: s.description,
            region: s.region,
            latitude: s.latitude,
            longitude: s.longitude,
            source_url: s.source_url,
            video_embed_url: s.video_embed_url,
            thumbnail_url: s.thumbnail_url,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const { itinerary_id, slug } = await response.json();

      // Clean up draft
      sessionStorage.removeItem(`creator_draft_${draftId}`);

      toast.success('Itinerary published!');
      router.push(slug ? `/itinerary/${slug}` : `/itinerary/${itinerary_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(msg);
      setPublishing(false);
    }
  };

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <div>
          <p className="font-semibold">Draft not found</p>
          <p className="text-sm text-muted-foreground mt-1">This draft may have expired or been published already.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/creator/itineraries/new">Start new itinerary</Link>
        </Button>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const includedCount = spots.filter((s) => s.included).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link href="/creator/itineraries/new" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Review & Publish</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Review your itinerary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Found {spots.length} spot{spots.length !== 1 ? 's' : ''} in your videos.
          Toggle to keep or remove each one, then publish.
        </p>
      </div>

      <div className="space-y-8">
        {/* Stops */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              Stops{' '}
              <span className="text-muted-foreground font-normal">
                ({includedCount} of {spots.length} selected)
              </span>
            </h2>
          </div>
          <div className="space-y-2">
            {spots.map((spot, idx) => (
              <div key={idx} className={`rounded-xl border transition-opacity ${spot.included ? '' : 'opacity-50'}`}>
                <SpotReviewCard
                  spot={spot}
                  onToggle={() => updateSpot(idx, { included: !spot.included })}
                  onToggleGoogleSearch={() => updateSpot(idx, { showGoogleSearch: !spot.showGoogleSearch })}
                  onResolveFromGoogle={(placeId) => handleResolveFromGoogle(idx, placeId)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Itinerary details */}
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Itinerary details</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder="My Venezuela Adventure"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[80px] rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              placeholder="Tell followers what makes this trip special..."
              maxLength={1000}
            />
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1">Visibility</span>
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                  isPublic ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <Globe className="w-3 h-3" />
                Public
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                  !isPublic ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <Lock className="w-3 h-3" />
                Private
              </button>
            </div>
          </div>
        </section>

        {/* Discount code */}
        <section className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-accent-foreground" />
            <h2 className="text-sm font-semibold">Attach a discount code</h2>
            <Badge variant="outline" className="text-xs ml-auto">optional</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Followers who book through this itinerary will see your code and get the discount automatically.
          </p>

          {loadingCodes ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading your codes...
            </div>
          ) : discountCodes.length === 0 ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                No active discount codes yet.{' '}
                <Link href="/creator/codes" className="underline hover:text-foreground">
                  Create one first
                </Link>
                , then come back.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* No code option */}
              <label className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors">
                <input
                  type="radio"
                  name="discount_code"
                  checked={selectedCodeId === null}
                  onChange={() => setSelectedCodeId(null)}
                  className="accent-primary"
                />
                <span className="text-sm text-muted-foreground">No discount code</span>
              </label>
              {discountCodes.map((code) => (
                <label
                  key={code.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <input
                    type="radio"
                    name="discount_code"
                    checked={selectedCodeId === code.id}
                    onChange={() => setSelectedCodeId(code.id)}
                    className="accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{code.code}</span>
                      <Badge variant="secondary" className="text-xs">
                        {code.type === 'percentage' ? `${code.value}% off` : `$${code.value} off`}
                      </Badge>
                    </div>
                    {code.max_uses && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {code.times_used}/{code.max_uses} uses
                      </p>
                    )}
                  </div>
                  {selectedCodeId === code.id && (
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Publish CTA */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={handlePublish}
            disabled={publishing || includedCount === 0 || !title.trim()}
            className="flex-1 gap-2"
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Publish {includedCount} stop{includedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/creator/itineraries/new">Start over</Link>
          </Button>
        </div>

        {includedCount === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Select at least one stop to publish
          </p>
        )}
      </div>
    </div>
  );
}
