'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { ImagePlus, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { listingSchema } from '@/lib/validators';
import { LISTING_CATEGORIES, VENEZUELA_REGIONS } from '@/lib/constants';

type ListingForm = z.infer<typeof listingSchema>;

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ListingForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(listingSchema) as any,
  });

  const isPublished = watch('is_published');
  const watchedCategory = watch('category');
  const watchedRegion = watch('region');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/listings/${id}`);
        const json = await res.json();
        if (res.ok && json.data) {
          reset(json.data);
          // Explicitly set Select values so controlled components hydrate
          if (json.data.category) setValue('category', json.data.category);
          if (json.data.region) setValue('region', json.data.region);
          if (json.data.photos?.length) setExistingPhotos(json.data.photos);
        }
      } catch {
        toast.error('Failed to load listing');
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [id, reset, setValue]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setNewPhotoFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setNewPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewPhoto(index: number) {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadNewPhotos(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of newPhotoFiles) {
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
      const newUrls = await uploadNewPhotos();
      const photos = [...existingPhotos, ...newUrls];
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, photos }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update listing');
      toast.success('Listing updated!');
      router.push('/dashboard/listings');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete listing');
      toast.success('Listing deleted');
      router.push('/dashboard/listings');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Listing</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Update your experience details</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive" size="sm" disabled={isLoading} />}
          >
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your listing and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" {...register('description')} rows={5} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={watchedCategory ?? ''}
                  onValueChange={(v) => setValue('category', v as ListingForm['category'])}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-region">Region</Label>
                <Select
                  value={watchedRegion ?? ''}
                  onValueChange={(v) => setValue('region', v as string)}
                >
                  <SelectTrigger id="edit-region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENEZUELA_REGIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Input id="location_city" {...register('location_city')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location_state">State *</Label>
                <Input id="location_state" {...register('location_state')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Full Address</Label>
              <Input id="address" {...register('address')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing & Capacity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price_usd">Price (USD) *</Label>
                <Input id="price_usd" type="number" min={0} step={0.01} {...register('price_usd', { valueAsNumber: true })} />
                {errors.price_usd && <p className="text-xs text-destructive">{errors.price_usd.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration_hours">Duration (hours)</Label>
                <Input id="duration_hours" type="number" min={0} step={0.5} {...register('duration_hours', { valueAsNumber: true })} />
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
              id="photo-upload-edit"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handlePhotoSelect}
            />
            {(existingPhotos.length > 0 || newPhotoPreviews.length > 0) && (
              <div className="grid grid-cols-3 gap-3">
                {existingPhotos.map((src, i) => (
                  <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {newPhotoPreviews.map((src, i) => (
                  <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border bg-muted border-primary/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`New photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      aria-label={`Remove new photo ${i + 1}`}
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
              {existingPhotos.length + newPhotoPreviews.length > 0 ? 'Add more photos' : 'Add photos'}
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
                <p className="font-medium text-sm">Published</p>
                <p className="text-xs text-muted-foreground">Visible to tourists</p>
              </div>
              <Switch
                id="is_published"
                checked={isPublished || false}
                onCheckedChange={(v) => setValue('is_published', v)}
                aria-label="Published"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
