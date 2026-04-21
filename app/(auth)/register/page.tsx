'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, type RegisterFormData } from '@/lib/validators';
import toast from 'react-hot-toast';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-destructive' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-status-pending' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'bg-accent' };
  if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-secondary' };
  return { score: 5, label: 'Very strong', color: 'bg-status-confirmed' };
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registered, setRegistered] = useState(false);

  const signUpWithGoogle = async () => {
    const supabase = createClient();
    if (!supabase) { toast.error('Authentication is not configured'); return; }
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/callback?next=/` },
    });
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptTerms: false },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Authentication is not configured');
      const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${base}/callback`,
          data: {
            full_name: data.full_name,
            phone: data.phone,
            nationality: data.nationality,
          },
        },
      });

      if (error) throw error;

      setRegistered(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (registered) {
    return (
      <Card className="shadow-border border-0">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl text-balance">Account created!</CardTitle>
          <CardDescription className="text-pretty">One more step to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground text-pretty">
            Check your email — click the verification link to activate your account.
          </p>
          <p className="text-xs text-muted-foreground text-pretty">
            Didn&apos;t receive it? Check your spam folder or contact support.
          </p>
          <Link href="/login" className="inline-block text-sm text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-border border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl text-balance">Create account</CardTitle>
        <CardDescription className="text-pretty">Join VZ Explorer and discover Venezuela</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color,border-color] duration-150 ease-out"
          onClick={signUpWithGoogle}
          disabled={isLoading}
          aria-label="Continue with Google"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <Separator />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            or sign up with email
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reg-full_name">Full name *</Label>
            <Input
              id="reg-full_name"
              placeholder="Carlos Rodríguez"
              autoComplete="name"
              aria-required="true"
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? 'reg-name-error' : undefined}
              {...register('full_name')}
            />
            {errors.full_name && <p id="reg-name-error" className="text-xs text-destructive" role="alert">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-email">Email *</Label>
            <Input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'reg-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && <p id="reg-email-error" className="text-xs text-destructive" role="alert">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password *</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="•••••��••"
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'reg-password-error' : 'password-strength'}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-[color] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p id="reg-password-error" className="text-xs text-destructive" role="alert">{errors.password.message}</p>}
              <PasswordStrengthBar password={watch('password') ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirmPassword">Confirm *</Label>
              <div className="relative">
                <Input
                  id="reg-confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'reg-confirm-error' : undefined}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-[color] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="reg-confirm-error" className="text-xs text-destructive" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reg-phone">Phone</Label>
              <Input
                id="reg-phone"
                type="tel"
                inputMode="tel"
                placeholder="+58 412 123 4567"
                autoComplete="tel"
                {...register('phone')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-nationality">Nationality</Label>
              <Input
                id="reg-nationality"
                placeholder="Venezuelan"
                autoComplete="country-name"
                {...register('nationality')}
              />
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
              <Link href="#" className="text-primary hover:underline">Terms of Service</Link>{' '}
              and{' '}
              <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-xs text-destructive" role="alert">{errors.acceptTerms.message}</p>
          )}

          <Button type="submit" className="w-full min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color] duration-150 ease-out" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
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

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;
  return (
    <div className="space-y-1" id="password-strength">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-[background-color] ${
              level <= strength.score ? strength.color : 'bg-border'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{strength.label}</p>
    </div>
  );
}
