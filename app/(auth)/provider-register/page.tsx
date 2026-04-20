'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [providerInsertError, setProviderInsertError] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<ProviderRegisterFormData | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

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

  const insertProviderRecord = async (userId: string, data: ProviderRegisterFormData) => {
    const supabase = createClient();
    if (!supabase) throw new Error('Authentication is not configured');

    const { error: providerError } = await supabase.from('providers').insert({
      user_id: userId,
      business_name: data.business_name,
      description: data.description,
      region: data.region,
      rif: data.rif,
      instagram_handle: data.instagram_handle,
      website_url: data.website_url || null,
    });

    return providerError;
  };

  const onSubmit = async (data: ProviderRegisterFormData) => {
    setIsLoading(true);
    setProviderInsertError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Authentication is not configured');

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
        const providerError = await insertProviderRecord(authData.user.id, data);

        if (providerError) {
          // Auth user was created but provider row failed — store state so user can retry
          setCreatedUserId(authData.user.id);
          setPendingData(data);
          setProviderInsertError(
            providerError.message ||
              'Your account was created but we could not save your provider profile. Please use the Retry button below.'
          );
          // Sign out the partially-created auth user to avoid a broken session
          await supabase.auth.signOut();
          return;
        }
      }

      toast.success("Provider account created! We'll review your application shortly.");
      router.push('/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!createdUserId || !pendingData) return;
    setIsLoading(true);
    setProviderInsertError(null);
    try {
      const providerError = await insertProviderRecord(createdUserId, pendingData);
      if (providerError) {
        setProviderInsertError(
          providerError.message || 'Retry failed. Please contact support if this persists.'
        );
        return;
      }
      toast.success("Provider account created! We'll review your application shortly.");
      router.push('/dashboard');
    } catch {
      setProviderInsertError('Retry failed. Please contact support if this persists.');
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
              <Label htmlFor="prov-full_name">Full name *</Label>
              <Input id="prov-full_name" placeholder="Ana Morales" autoComplete="name" aria-required="true" aria-invalid={!!errors.full_name} {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-destructive" role="alert">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-phone">Phone</Label>
              <Input id="prov-phone" type="tel" inputMode="tel" placeholder="+58 412..." autoComplete="tel" {...register('phone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prov-business_name">Business name *</Label>
            <Input id="prov-business_name" placeholder="Andes EcoLodge Mérida" autoComplete="organization" aria-required="true" aria-invalid={!!errors.business_name} {...register('business_name')} />
            {errors.business_name && <p className="text-xs text-destructive" role="alert">{errors.business_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prov-region">Region *</Label>
            <Select onValueChange={(v) => setValue('region', v as string)}>
              <SelectTrigger id="prov-region" aria-required="true">
                <SelectValue placeholder="Select your region" />
              </SelectTrigger>
              <SelectContent>
                {VENEZUELA_REGIONS.map((r) => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.region && <p className="text-xs text-destructive" role="alert">{errors.region.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prov-description">Description *</Label>
            <Textarea
              id="prov-description"
              placeholder="Tell travelers about your business and what makes it special..."
              rows={3}
              aria-required="true"
              aria-invalid={!!errors.description}
              {...register('description')}
              className="resize-none"
            />
            {errors.description && <p className="text-xs text-destructive" role="alert">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prov-email">Email *</Label>
              <Input id="prov-email" type="email" inputMode="email" placeholder="you@business.com" autoComplete="email" aria-required="true" aria-invalid={!!errors.email} {...register('email')} />
              {errors.email && <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-rif">RIF</Label>
              <Input id="prov-rif" placeholder="J-12345678-9" {...register('rif')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prov-password">Password *</Label>
              <div className="relative">
                <Input id="prov-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" className="pr-10" aria-required="true" aria-invalid={!!errors.password} {...register('password')} />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-confirmPassword">Confirm *</Label>
              <div className="relative">
                <Input id="prov-confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" className="pr-10" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive" role="alert">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prov-instagram">Instagram</Label>
              <Input id="prov-instagram" placeholder="@yourhandle" {...register('instagram_handle')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-website">Website</Label>
              <Input id="prov-website" type="url" placeholder="https://..." autoComplete="url" {...register('website_url')} />
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

          {providerInsertError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 space-y-2" role="alert">
              <p className="text-sm text-red-700">{providerInsertError}</p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isLoading}
                className="text-sm font-medium text-red-700 underline hover:no-underline disabled:opacity-50"
              >
                {isLoading ? 'Retrying…' : 'Retry saving profile'}
              </button>
            </div>
          )}

          <Button type="submit" className="w-full min-h-[44px]" disabled={isLoading || !!providerInsertError}>
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
