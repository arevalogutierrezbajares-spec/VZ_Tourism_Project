'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { providerSchema } from '@/lib/validators';

type ProviderForm = z.infer<typeof providerSchema>;

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [providerId, setProviderId] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema) as any,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/providers/me');
        const json = await res.json();
        if (res.ok && json.data) {
          setProviderId(json.data.id);
          reset({
            business_name: json.data.business_name || '',
            description: json.data.description || '',
            region: json.data.region || '',
            website_url: json.data.website_url || '',
            whatsapp_number: json.data.whatsapp_number || '',
            instagram_handle: json.data.instagram_handle || '',
            rif: json.data.rif || '',
          });
        }
      } catch {
        toast.error('Failed to load settings');
      }
    }
    load();
  }, [reset]);

  async function onSubmit(data: ProviderForm) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save settings');
      toast.success('Settings saved!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provider Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your business profile</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input id="business_name" {...register('business_name')} />
              {errors.business_name && <p className="text-xs text-destructive">{errors.business_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={4} placeholder="Tell tourists about your business..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp_number">WhatsApp</Label>
              <Input id="whatsapp_number" {...register('whatsapp_number')} placeholder="+58 412 000 0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website_url">Website</Label>
              <Input id="website_url" {...register('website_url')} placeholder="https://yoursite.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram_handle">Instagram Handle</Label>
              <Input id="instagram_handle" {...register('instagram_handle')} placeholder="@yourbusiness" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </div>
  );
}
