import Link from 'next/link';
import { Logo } from '@/components/common/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Link href="/" className="mb-8" aria-label="VZ Explorer home">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 text-sm text-muted-foreground text-center">
        Discover Venezuela with AI-powered travel planning
      </p>
    </main>
  );
}
