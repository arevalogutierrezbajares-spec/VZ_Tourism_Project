import type { Metadata } from 'next';
import { Inter, Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { StoreHydration } from '@/components/common/StoreHydration';
import { MotionProvider } from '@/components/common/MotionProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'VZ Explorer - Venezuela Tourism SuperApp',
    template: '%s | VZ Explorer',
  },
  description:
    'Discover the incredible beauty of Venezuela. AI-powered travel planning for beaches, mountains, eco-tours, and authentic Venezuelan experiences.',
  keywords: ['Venezuela', 'tourism', 'travel', 'Los Roques', 'Mérida', 'Canaima', 'Caribbean'],
  authors: [{ name: 'VZ Explorer Team' }],
  openGraph: {
    title: 'VZ Explorer - Venezuela Tourism SuperApp',
    description: 'Discover Venezuela with AI-powered travel planning',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to content
        </a>
        <StoreHydration />
        <MotionProvider>
          {children}
        </MotionProvider>
        <Analytics />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'bg-card text-card-foreground border shadow-lg',
            style: {
              background: 'var(--card)',
              color: 'var(--card-foreground)',
            },
            success: {
              iconTheme: {
                primary: 'var(--secondary)',
                secondary: 'var(--primary-foreground)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--destructive)',
                secondary: 'var(--primary-foreground)',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
