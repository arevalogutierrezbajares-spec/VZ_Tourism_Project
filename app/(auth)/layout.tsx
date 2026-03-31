import Link from 'next/link';
import { Logo } from '@/components/common/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <Link href="/" className="mb-8">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 text-sm text-muted-foreground text-center">
        Discover Venezuela with AI-powered travel planning
      </p>
    </div>
  );
}
