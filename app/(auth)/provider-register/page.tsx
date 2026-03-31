'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { providerRegisterSchema, type ProviderRegisterFormData } from '@/lib/validators';
import { VENEZUELA_REGIONS } from '@/lib/constants';
import toast from 'react-hot-toast';

export default function ProviderRegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProviderRegisterFormData>({
    resolver: zodResolver(providerRegisterSchema) as any,
    defaultValues: { acceptTerms: false },
  });

  const onSubmit = async (data: ProviderRegisterFormData) => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: 'provider',
          },
        },
      });

      if (authError) throw authError;

      // Create provider record
      if (authData.user) {
        const { error: providerError } = await supabase.from('providers').insert({
          user_id: authData.user.id,
          business_name: data.business_name,
          description: data.description,
          region: data.region,
          rif: data.rif,
          instagram_handle: data.instagram_handle,
          website_url: data.website_url || null,
        });

        if (providerError) console.error('Provider creation error:', providerError);
      }

      toast.success('Provider account created! We\'ll review your application shortly.');
      router.push('/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">List your experience</CardTitle>
        <CardDescription>Join VZ Explorer as a tourism provider</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input placeholder="Ana Morales" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+58 412..." {...register('phone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Business name *</Label>
            <Input placeholder="Andes EcoLodge Mérida" {...register('business_name')} />
            {errors.business_name && <p className="text-xs text-destructive">{errors.business_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Region *</Label>
            <Select onValueChange={(v) => setValue('region', v as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your region" />
              </SelectTrigger>
              <SelectContent>
                {VENEZUELA_REGIONS.map((r) => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Tell travelers about your business and what makes it special..."
              rows={3}
              {...register('description')}
              className="resize-none"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="you@business.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>RIF</Label>
              <Input placeholder="J-12345678-9" {...register('rif')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Confirm *</Label>
              <Input type="password" placeholder="••••••••" {...register('confirmPassword')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input placeholder="@yourhandle" {...register('instagram_handle')} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input placeholder="https://..." {...register('website_url')} />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="acceptTerms"
              checked={watch('acceptTerms')}
              onCheckedChange={(checked) => setValue('acceptTerms', !!checked)}
            />
            <label htmlFor="acceptTerms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              I agree to the{' '}
              <Link href="#" className="text-primary hover:underline">Provider Terms</Link>{' '}
              and{' '}
              <Link href="#" className="text-primary hover:underline">Commission Structure</Link>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Apply as provider'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
