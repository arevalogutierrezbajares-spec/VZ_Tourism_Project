'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { loginSchema, type LoginFormData } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import type { User } from '@/types/database';

const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@vzexplorer.com',
  full_name: 'Tomas Demo',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tomas',
  role: 'tourist',
  phone: null,
  nationality: 'Venezuela',
  preferred_language: 'en',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

function AuthModalContent({ onClose, onSuccess, title, subtitle }: Omit<AuthModalProps, 'isOpen'>) {
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setProfile, setLoading, setInitialized } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as never,
  });

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
      toast.success('Welcome back!');
      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const supabase = createClient();
    if (!supabase) { toast.error('Authentication is not configured'); return; }
    // Store current URL so Google OAuth can return here
    sessionStorage.setItem('auth_return_url', window.location.href);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(window.location.pathname + window.location.search)}` },
    });
  };

  const signInAsDemo = () => {
    setUser(DEMO_USER);
    setProfile(DEMO_USER);
    setLoading(false);
    setInitialized(true);
    toast.success('Signed in as demo account');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-background rounded-2xl shadow-2xl border">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-bold">{title ?? 'Sign in to continue'}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle ?? 'Create an account or sign in to complete your booking.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-0.5 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {/* Google */}
          <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle}>
            <svg className="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          {/* Demo */}
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900"
            onClick={signInAsDemo}
          >
            <span className="mr-2">✨</span>
            Try Demo Account
          </Button>

          <div className="relative py-1">
            <Separator />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              or email
            </span>
          </div>

          {/* Email + password */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="modal-password">Password</Label>
              <Input
                id="modal-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground pt-1">
            No account?{' '}
            <a href="/register" className="text-primary font-medium hover:underline">
              Sign up free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthModal({ isOpen, onClose, onSuccess, title, subtitle }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AuthModalContent
      onClose={onClose}
      onSuccess={onSuccess}
      title={title}
      subtitle={subtitle}
    />,
    document.body
  );
}
