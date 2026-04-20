'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { listingSchema } from '@/lib/validators';
import { LISTING_CATEGORIES, VENEZUELA_REGIONS } from '@/lib/constants';
import { ImagePlus, X } from 'lucide-react';

type ListingForm = z.infer<typeof listingSchema>;

export default function NewListingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ListingForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(listingSchema) as any,
    defaultValues: {
      is_published: false,
      amenities: [],
      tags: [],
      photos: [],
      cancellation_policy: 'flexible',
      min_guests: 1,
      max_guests: 10,
    },
  });

  const isPublished = watch('is_published');

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotoFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input so the same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPhotos(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of photoFiles) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload?bucket=listings', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) urls.push(json.url);
      }
    }
    return urls;
  }

  async function onSubmit(data: ListingForm) {
    setIsLoading(true);
    try {
      const uploadedUrls = await uploadPhotos();
      const photos = uploadedUrls.length > 0 ? uploadedUrls : (data.photos ?? []);
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, photos }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create listing');
      toast.success('Listing created!');
      router.push('/dashboard/listings');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create New Listing</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Fill in the details to publish your experience</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register('title')} placeholder="e.g., Angel Falls Helicopter Tour" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" {...register('description')} rows={5} placeholder="Describe your experience..." />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <Select onValueChange={(v) => setValue('category', v as ListingForm['category'])}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="region">Region *</Label>
                <Select onValueChange={(v) => setValue('region', v as string)}>
                  <SelectTrigger id="region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENEZUELA_REGIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.region && <p className="text-xs text-destructive">{errors.region.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="location_city">City *</Label>
                <Input id="location_city" {...register('location_city')} placeholder="e.g., Caracas" />
                {errors.location_city && <p className="text-xs text-destructive">{errors.location_city.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location_state">State *</Label>
                <Input id="location_state" {...register('location_state')} placeholder="e.g., Miranda" />
                {errors.location_state && <p className="text-xs text-destructive">{errors.location_state.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Full Address</Label>
              <Input id="address" {...register('address')} placeholder="Street address" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing & Capacity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price_usd">Price (USD) *</Label>
                <Input id="price_usd" type="number" min={0} step={0.01} {...register('price_usd', { valueAsNumber: true })} placeholder="0.00" />
                {errors.price_usd && <p className="text-xs text-destructive">{errors.price_usd.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration_hours">Duration (hours)</Label>
                <Input id="duration_hours" type="number" min={0} step={0.5} {...register('duration_hours', { valueAsNumber: true })} placeholder="e.g., 3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="min_guests">Min Guests</Label>
                <Input id="min_guests" type="number" min={1} {...register('min_guests', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_guests">Max Guests</Label>
                <Input id="max_guests" type="number" min={1} {...register('max_guests', { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handlePhotoSelect}
            />
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              {photoPreviews.length > 0 ? 'Add more photos' : 'Add photos'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Upload photos of your experience. First photo will be used as the cover image.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Publish Settings</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Publish listing</p>
                <p className="text-xs text-muted-foreground">Make this listing visible to tourists</p>
              </div>
              <Switch
                id="is_published"
                checked={isPublished}
                onCheckedChange={(v) => setValue('is_published', v)}
                aria-label="Publish listing"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? 'Creating...' : 'Create Listing'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
