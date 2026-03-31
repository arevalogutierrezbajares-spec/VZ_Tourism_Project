'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
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
import { listingSchema, type ListingFormData } from '@/lib/validators';
import { LISTING_CATEGORIES, VENEZUELA_REGIONS, AMENITIES, ACTIVITY_TAGS, LANGUAGES } from '@/lib/constants';
import { PricingSuggestion } from './PricingSuggestion';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STEPS = ['Basics', 'Location', 'Pricing', 'Details', 'Review'];

export function ListingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: ListingFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create listing');

      const result = await response.json();
      toast.success('Listing created successfully!');
      router.push(`/dashboard/listings/${result.data.id}/edit`);
    } catch (error) {
      toast.error('Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all',
                i < step
                  ? 'bg-primary border-primary text-white'
                  : i === step
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-muted text-muted-foreground'
              )}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={cn(
                'ml-2 text-xs font-medium hidden sm:block',
                i === step ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-3 h-px w-8 sm:w-16', i < step ? 'bg-primary' : 'bg-muted')} />
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
              <Input
                placeholder="e.g., Mérida Mountain Trek with Local Guide"
                {...register('title')}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Short description *</Label>
              <Input
                placeholder="One-line summary of your experience"
                {...register('short_description')}
              />
              {errors.short_description && <p className="text-xs text-destructive">{errors.short_description.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Full description *</Label>
              <Textarea
                placeholder="Describe what guests will experience in detail..."
                rows={5}
                {...register('description')}
                className="resize-none"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
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
              <Label>Tags (select up to 10)</Label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TAGS.slice(0, 20).map((tag) => (
                  <Badge
                    key={tag}
                    variant={(watchedValues.tags || []).includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => {
                      const current = watchedValues.tags || [];
                      if (current.includes(tag)) {
                        setValue('tags', current.filter((t) => t !== tag));
                      } else if (current.length < 10) {
                        setValue('tags', [...current, tag]);
                      }
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Where is it located?</h2>
            <div className="space-y-2">
              <Label>Region *</Label>
              <Select onValueChange={(v) => setValue('region', v as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {VENEZUELA_REGIONS.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location name *</Label>
              <Input placeholder="e.g., Sierra Nevada de Mérida" {...register('location_name')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude *</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="8.6"
                  {...register('latitude', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude *</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="-71.15"
                  {...register('longitude', { valueAsNumber: true })}
                />
              </div>
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
                  <SelectItem value="green">🟢 Green - Safe</SelectItem>
                  <SelectItem value="yellow">🟡 Yellow - Caution</SelectItem>
                  <SelectItem value="orange">🟠 Orange - High Caution</SelectItem>
                  <SelectItem value="red">🔴 Red - Avoid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meeting point</Label>
              <Input placeholder="Where guests should meet" {...register('meeting_point')} />
            </div>
          </div>
        )}

        {/* Step 2: Pricing */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Set your price</h2>
            <div className="space-y-2">
              <Label>Price per person (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  placeholder="65"
                  {...register('price_usd', { valueAsNumber: true })}
                />
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
              <Input
                type="number"
                step="0.5"
                placeholder="4"
                {...register('duration_hours', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cancellation policy</Label>
              <Select
                defaultValue="moderate"
                onValueChange={(v) => setValue('cancellation_policy', v as 'strict' | 'flexible' | 'moderate' | 'non-refundable')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="non-refundable">Non-refundable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Experience details</h2>
            <div className="space-y-2">
              <Label>Languages offered</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <Badge
                    key={lang.value}
                    variant={(watchedValues.languages || []).includes(lang.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = watchedValues.languages || [];
                      if (current.includes(lang.value)) {
                        setValue('languages', current.filter((l) => l !== lang.value));
                      } else {
                        setValue('languages', [...current, lang.value]);
                      }
                    }}
                  >
                    {lang.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.slice(0, 12).map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <Checkbox
                      id={amenity}
                      checked={(watchedValues.amenities || []).includes(amenity)}
                      onCheckedChange={(checked) => {
                        const current = watchedValues.amenities || [];
                        setValue(
                          'amenities',
                          checked
                            ? [...current, amenity]
                            : current.filter((a) => a !== amenity)
                        );
                      }}
                    />
                    <label htmlFor={amenity} className="text-sm cursor-pointer">{amenity}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Review & submit</h2>
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium text-right max-w-[60%]">{watchedValues.title || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium capitalize">{watchedValues.category || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="font-medium">{watchedValues.region || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">${watchedValues.price_usd || '-'} USD/person</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium">{watchedValues.min_guests} - {watchedValues.max_guests}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your listing will be saved as a draft. You can publish it from the listings dashboard after adding photos.
            </p>
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
            <Button type="button" className="flex-1" onClick={() => setStep(step + 1)}>
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create listing'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
