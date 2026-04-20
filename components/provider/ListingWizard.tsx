'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, ChevronLeft, Check, Upload, X, Eye, EyeOff, Sparkles, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { listingSchema, type ListingFormData } from '@/lib/validators';
import {
  LISTING_CATEGORIES,
  VENEZUELA_REGIONS,
  AMENITIES,
  ACTIVITY_TAGS,
  LANGUAGES,
  CANCELLATION_POLICIES,
  SAFETY_LEVELS,
} from '@/lib/constants';
import { PricingSuggestion } from './PricingSuggestion';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STEPS = [
  { label: 'Basics', icon: '📝' },
  { label: 'Photos', icon: '📷' },
  { label: 'Details', icon: '📋' },
  { label: 'Pricing', icon: '💰' },
  { label: 'Availability', icon: '📅' },
  { label: 'Policies', icon: '📜' },
  { label: 'Publish', icon: '🚀' },
];

// Extended amenities list with 50+ VZ-critical options
const VZ_AMENITIES = [
  // Safety & Basics
  'First Aid Kit', 'Emergency Contacts', 'Satellite Phone', 'Life Jackets',
  'Safety Briefing', 'Travel Insurance Available', 'Medical Kit',
  // Transport
  'Airport Pickup', 'Airport Transfer', 'Private Transport', 'Boat Transfer',
  'Jeep/4WD Vehicle', 'Motorbike Transport',
  // Accommodation
  'Hammocks', 'Camping Equipment', 'Tents Provided', 'Sleeping Bags',
  'Air Conditioning', 'Fan', 'Private Bathroom', 'Shared Bathroom',
  // Food & Water
  'Meals Included', 'Breakfast', 'Lunch', 'Dinner', 'Vegetarian Options',
  'Purified Water', 'Snacks', 'Cooking Equipment',
  // Activities
  'Guide Included', 'Equipment Rental', 'Snorkeling Equipment', 'Diving Equipment',
  'Surfboard Rental', 'Kayak Rental', 'Fishing Equipment', 'Hiking Poles',
  // Connectivity
  'WiFi', 'Mobile Signal', 'Satellite Internet', 'Walkie-Talkies',
  // Services
  'Photography', 'Video Recording', 'Spanish-English Guide', 'Indigenous Guide',
  'Paramedic on Site', 'Currency Exchange', 'Laundry Service',
  // Eco / Cultural
  'Eco-Certified', 'Community Tourism', 'Local Artisans Visit', 'Cultural Shows',
];

interface PhotoFile {
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
}

export function ListingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema) as any,
    defaultValues: {
      tags: [],
      amenities: [],
      languages: ['es'],
      includes: [],
      excludes: [],
      max_guests: 10,
      min_guests: 1,
      cancellation_policy: 'moderate',
      safety_level: 'yellow',
    },
  });

  const watchedValues = watch();

  const handleAiAssistDescription = async () => {
    if (!watchedValues.title || !watchedValues.category) {
      toast.error('Enter a title and category first');
      return;
    }
    setIsAiAssisting(true);
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Write a compelling 3-sentence description for a Venezuela tourism listing: "${watchedValues.title}" in category ${watchedValues.category}. Focus on unique Venezuelan experiences, local culture, and what makes it special. Be specific and enticing.`,
          conversationHistory: [],
        }),
      });
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let description = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === 'text') description += parsed.text;
            } catch {}
          }
        }
      }
      if (description.trim()) {
        setValue('description', description.trim());
        if (!watchedValues.short_description) {
          setValue('short_description', description.trim().split('.')[0] + '.');
        }
        toast.success('Description generated!');
      }
    } catch {
      toast.error('AI assist failed. Try again.');
    } finally {
      setIsAiAssisting(false);
    }
  };

  const handlePhotoAdd = async (files: FileList | null) => {
    if (!files) return;
    const newPhotos: PhotoFile[] = Array.from(files).slice(0, 10 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);

    // Upload each photo
    for (const photo of newPhotos) {
      try {
        const formData = new FormData();
        formData.append('file', photo.file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const { url } = await res.json();
          setPhotos((prev) =>
            prev.map((p) =>
              p.preview === photo.preview ? { ...p, uploading: false, url } : p
            )
          );
        } else {
          setPhotos((prev) =>
            prev.map((p) =>
              p.preview === photo.preview ? { ...p, uploading: false } : p
            )
          );
        }
      } catch {
        setPhotos((prev) =>
          prev.map((p) =>
            p.preview === photo.preview ? { ...p, uploading: false } : p
          )
        );
      }
    }
  };

  const removePhoto = (preview: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.preview === preview);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.preview !== preview);
    });
  };

  const onSubmit = async (data: ListingFormData) => {
    setIsSubmitting(true);
    try {
      const photoUrls = photos.filter((p) => p.url).map((p) => p.url!);
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          is_published: isPublished,
          cover_image_url: photoUrls[0] || null,
          photo_urls: photoUrls,
        }),
      });

      if (!response.ok) throw new Error('Failed to create listing');

      const result = await response.json();
      toast.success(isPublished ? 'Listing published!' : 'Listing saved as draft!');
      router.push(`/dashboard/listings/${result.data.id}/edit`);
    } catch {
      toast.error('Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = (): boolean => {
    if (step === 0) return !!(watchedValues.title && watchedValues.category && watchedValues.description);
    if (step === 3) return !!(watchedValues.price_usd && watchedValues.price_usd > 0);
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                'flex flex-col items-center gap-1',
                i < step ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all',
                  i < step
                    ? 'bg-primary border-primary text-white'
                    : i === step
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-muted text-muted-foreground'
                )}
              >
                {i < step ? <Check className="w-4 h-4" /> : s.icon}
              </div>
              <span className={cn('text-xs hidden sm:block', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-2 h-px w-6 sm:w-10 flex-shrink-0', i < step ? 'bg-primary' : 'bg-muted')} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Basics */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Tell us about your experience</h2>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="e.g., Mérida Mountain Trek with Local Guide" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select onValueChange={(v) => setValue('category', v as ListingFormData['category'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region *</Label>
              <Select onValueChange={(v) => setValue('region', v as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {VENEZUELA_REGIONS.map((r) => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Short description *</Label>
              <Input placeholder="One-line summary of your experience" {...register('short_description')} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Full description *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleAiAssistDescription}
                  disabled={isAiAssisting}
                >
                  {isAiAssisting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  AI Assist
                </Button>
              </div>
              <Textarea
                placeholder="Describe what guests will experience..."
                rows={5}
                {...register('description')}
                className="resize-none"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tags (up to 10)</Label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TAGS.slice(0, 24).map((tag) => (
                  <Badge
                    key={tag}
                    variant={(watchedValues.tags || []).includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize text-xs"
                    onClick={() => {
                      const current = watchedValues.tags || [];
                      if (current.includes(tag)) setValue('tags', current.filter((t) => t !== tag));
                      else if (current.length < 10) setValue('tags', [...current, tag]);
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Photos */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Add photos</h2>
            <p className="text-sm text-muted-foreground">
              Add up to 10 photos. Great photos dramatically increase bookings.
            </p>

            {/* Upload area */}
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handlePhotoAdd(e.dataTransfer.files);
              }}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload or drag & drop</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP up to 10MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoAdd(e.target.files)}
              />
            </div>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, idx) => (
                  <div key={photo.preview} className="relative aspect-square rounded-lg overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.preview} alt={`Listing photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {photo.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    {idx === 0 && (
                      <div className="absolute bottom-1 left-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded">
                        Cover
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.preview)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <div
                    className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="text-muted-foreground text-xl">+</span>
                  </div>
                )}
              </div>
            )}

            {photos.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                You can add photos later from the listings dashboard.
              </p>
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Experience details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude *</Label>
                <Input type="number" step="any" placeholder="8.6" {...register('latitude', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Longitude *</Label>
                <Input type="number" step="any" placeholder="-71.15" {...register('longitude', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location name *</Label>
              <Input placeholder="e.g., Sierra Nevada de Mérida" {...register('location_name')} />
            </div>
            <div className="space-y-2">
              <Label>Meeting point</Label>
              <Input placeholder="Where guests should meet you" {...register('meeting_point')} />
            </div>
            <div className="space-y-2">
              <Label>Safety level *</Label>
              <Select
                defaultValue="yellow"
                onValueChange={(v) => setValue('safety_level', v as ListingFormData['safety_level'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAFETY_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.value === 'green' ? '🟢' : l.value === 'yellow' ? '🟡' : l.value === 'orange' ? '🟠' : '🔴'} {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min guests</Label>
                <Input type="number" min="1" {...register('min_guests', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Max guests</Label>
                <Input type="number" min="1" {...register('max_guests', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duration (hours)</Label>
              <Input type="number" step="0.5" placeholder="4" {...register('duration_hours', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <Badge
                    key={lang.value}
                    variant={(watchedValues.languages || []).includes(lang.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = watchedValues.languages || [];
                      if (current.includes(lang.value)) setValue('languages', current.filter((l) => l !== lang.value));
                      else setValue('languages', [...current, lang.value]);
                    }}
                  >
                    {lang.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amenities & Equipment (50+ options)</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-2">
                {VZ_AMENITIES.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <Checkbox
                      id={`amenity-${amenity}`}
                      checked={(watchedValues.amenities || []).includes(amenity)}
                      onCheckedChange={(checked) => {
                        const current = watchedValues.amenities || [];
                        setValue('amenities', checked ? [...current, amenity] : current.filter((a) => a !== amenity));
                      }}
                    />
                    <label htmlFor={`amenity-${amenity}`} className="text-xs cursor-pointer">{amenity}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Set your price</h2>
            <div className="space-y-2">
              <Label>Base price per person (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" className="pl-7" placeholder="65" {...register('price_usd', { valueAsNumber: true })} />
              </div>
              {errors.price_usd && <p className="text-xs text-destructive">{errors.price_usd.message}</p>}
            </div>
            {watchedValues.price_usd && watchedValues.category && watchedValues.region && (
              <PricingSuggestion
                currentPrice={watchedValues.price_usd}
                category={watchedValues.category}
                region={watchedValues.region}
                onApply={(price) => setValue('price_usd', price)}
              />
            )}
            <div className="space-y-3">
              <Label>Seasonal pricing rules</Label>
              <div className="space-y-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                <p className="font-medium text-foreground text-xs">Upcoming feature</p>
                <p className="text-xs">Set peak season (Dec–Jan, Semana Santa) and off-season discounts after creating your listing.</p>
              </div>
            </div>
            <div className="space-y-3 border rounded-xl p-4">
              <h3 className="font-semibold text-sm">Discount rules</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Early bird discount</p>
                  <p className="text-xs text-muted-foreground">10% off for bookings 30+ days ahead</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Last-minute discount</p>
                  <p className="text-xs text-muted-foreground">15% off for bookings within 48 hours</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Group discount</p>
                  <p className="text-xs text-muted-foreground">10% off for 6+ guests</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Availability */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Availability settings</h2>
            <div className="space-y-3">
              <Label>Booking type</Label>
              <div className="space-y-2">
                {[
                  { value: 'instant', label: 'Instant Book', desc: 'Guests can book immediately without your approval' },
                  { value: 'request', label: 'Request to Book', desc: 'You review and approve each booking request' },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      'hover:border-primary',
                      watchedValues.cancellation_policy === value ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                    onClick={() => setValue('cancellation_policy', value as any)}
                  >
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Operating days</Label>
              <div className="grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    className="px-2 py-2 rounded-lg text-xs font-medium border border-primary bg-primary/10 text-primary"
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Configure detailed availability calendar after publishing your listing.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Advance booking window</Label>
              <div className="flex gap-2">
                <Input type="number" defaultValue={90} className="w-24" />
                <span className="flex items-center text-sm text-muted-foreground">days in advance</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Minimum notice</Label>
              <Select defaultValue="24">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Same day</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 5: Policies */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Policies</h2>
            <div className="space-y-3">
              <Label>Cancellation policy *</Label>
              <div className="space-y-2">
                {CANCELLATION_POLICIES.map((policy) => (
                  <button
                    key={policy.value}
                    type="button"
                    onClick={() => setValue('cancellation_policy', policy.value as ListingFormData['cancellation_policy'])}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      'hover:border-primary',
                      watchedValues.cancellation_policy === policy.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <p className="font-medium text-sm">{policy.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Deposit required</Label>
              <div className="flex items-center gap-3">
                <Switch />
                <span className="text-sm text-muted-foreground">Require deposit to secure booking</span>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-sm text-muted-foreground w-20">Deposit %</span>
                <Slider min={10} max={100} step={5} defaultValue={[30]} className="flex-1" />
                <span className="text-sm font-medium w-10">30%</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>What&apos;s included</Label>
              <div className="space-y-2">
                <Input
                  placeholder="e.g., Professional guide, transport from hotel"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        setValue('includes', [...(watchedValues.includes || []), val]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {(watchedValues.includes || []).map((item, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs gap-1">
                      {item}
                      <button type="button" onClick={() => setValue('includes', (watchedValues.includes || []).filter((_, i) => i !== idx))}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Not included</Label>
              <div className="space-y-2">
                <Input
                  placeholder="e.g., Personal travel insurance, visa fees"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        setValue('excludes', [...(watchedValues.excludes || []), val]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {(watchedValues.excludes || []).map((item, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs gap-1">
                      {item}
                      <button type="button" onClick={() => setValue('excludes', (watchedValues.excludes || []).filter((_, i) => i !== idx))}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Publish */}
        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Review & Publish</h2>

            {/* Preview card */}
            <div className="rounded-2xl border overflow-hidden shadow-sm">
              {photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[0].preview} alt={`Preview of ${watchedValues.title || 'listing'}`} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-4xl">
                    {LISTING_CATEGORIES.find((c) => c.value === watchedValues.category)?.icon || '🏖️'}
                  </span>
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="text-xs capitalize mb-1">
                      {watchedValues.category || 'Category'}
                    </Badge>
                    <h3 className="font-bold">{watchedValues.title || 'Your listing title'}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{watchedValues.location_name || watchedValues.region || 'Location'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">${watchedValues.price_usd || 0}</p>
                    <p className="text-xs text-muted-foreground">per person</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{watchedValues.short_description || watchedValues.description || 'Description here'}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
              {[
                ['Title', watchedValues.title],
                ['Category', watchedValues.category],
                ['Region', watchedValues.region],
                ['Price', watchedValues.price_usd ? `$${watchedValues.price_usd} USD/person` : '-'],
                ['Guests', `${watchedValues.min_guests}–${watchedValues.max_guests}`],
                ['Photos', `${photos.filter((p) => p.url).length} uploaded`],
                ['Cancellation', watchedValues.cancellation_policy],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium capitalize">{value || '-'}</span>
                </div>
              ))}
            </div>

            {/* Publish toggle */}
            <div className="flex items-center justify-between p-4 border rounded-xl">
              <div>
                <p className="font-semibold text-sm">{isPublished ? 'Publish immediately' : 'Save as draft'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isPublished
                    ? 'Listing will be visible to tourists right away'
                    : 'Listing will be hidden until you publish it'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isPublished ? (
                  <Eye className="w-4 h-4 text-primary" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="flex-1"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {isPublished ? 'Publishing...' : 'Saving...'}
                </>
              ) : isPublished ? (
                'Publish listing'
              ) : (
                'Save as draft'
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
