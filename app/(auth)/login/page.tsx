'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { loginSchema, type LoginFormData } from '@/lib/validators';
import toast from 'react-hot-toast';

const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@vzexplorer.com',
  full_name: 'Alex Demo',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alexdemo',
  role: 'tourist' as const,
  phone: null,
  nationality: 'Venezuela',
  preferred_language: 'en',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || searchParams.get('next') || '/';
  const error = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser, setProfile, setLoading, setInitialized } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as any,
  });

  const emailValue = watch('email');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Authentication is not configured');
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Populate auth store immediately so the next page renders as authenticated
      // on the very first render — avoids flash of "sign in" button after navigation.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const authUser = session.user;
        setUser({
          id: authUser.id,
          email: authUser.email ?? '',
          full_name: authUser.user_metadata?.full_name ?? authUser.email ?? '',
          avatar_url: authUser.user_metadata?.avatar_url ?? null,
          role: 'tourist',
          phone: null,
          nationality: null,
          preferred_language: 'en',
          created_at: authUser.created_at,
          updated_at: authUser.updated_at ?? authUser.created_at,
        });
        setLoading(false);
        setInitialized(true);
      }

      toast.success('Welcome back!');
      router.push(redirectTo);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sign in';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const supabase = createClient();
    if (!supabase) { toast.error('Authentication is not configured'); return; }
    // Use NEXT_PUBLIC_APP_URL so this always points to the correct domain.
    // IMPORTANT: http://localhost:3000/** must be in your Supabase project's
    // Authentication → URL Configuration → Redirect URLs list, otherwise
    // Supabase will redirect to its Site URL (the Vercel preview) instead.
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/callback?next=${redirectTo}` },
    });
  };

  const signInAsDemo = () => {
    setUser(DEMO_USER);
    setProfile(DEMO_USER);
    setLoading(false);
    setInitialized(true);
    toast.success('Signed in as Alex Demo!');
    router.push(redirectTo);
  };

  return (
    <Card className="shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl text-balance">Welcome back</CardTitle>
        <CardDescription className="text-pretty">Sign in to your VZ Explorer account</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md" role="alert">
            {error === 'auth_callback_failed'
              ? 'Sign-in failed. Please try again.'
              : 'An error occurred during sign-in.'}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color,border-color] duration-150 ease-out"
          onClick={signInWithGoogle}
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

        <Button
          type="button"
          variant="secondary"
          className="w-full min-h-[44px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 active:scale-[0.96] transition-[transform,color,background-color,border-color] duration-150 ease-out"
          onClick={signInAsDemo}
          disabled={isLoading}
        >
          <span className="mr-2">✨</span>
          Try Demo Account
        </Button>

        <div className="relative">
          <Separator />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            or sign in with email
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-destructive" role="alert">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
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
            {errors.password && (
              <p id="password-error" className="text-xs text-destructive" role="alert">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color] duration-150 ease-out" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Didn&apos;t receive a confirmation email?{' '}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={async () => {
                if (!emailValue) { toast.error('Enter your email first'); return; }
                const supabase = createClient();
                if (!supabase) { toast.error('Authentication is not configured'); return; }
                const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                await supabase.auth.resend({ type: 'signup', email: emailValue, options: { emailRedirectTo: `${base}/callback` } });
                toast.success('Confirmation email resent — check your inbox');
              }}
            >
              Resend it
            </button>
          </p>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          Are you a tourism provider?{' '}
          <Link href="/provider-register" className="text-primary hover:underline">
            List your experience
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[200px]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
