import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: {
    default: 'RUTA - Executive Security Transport',
    template: '%s | RUTA',
  },
  description:
    'Armored executive transport in Venezuela. Instant booking. Armed security. GPS tracked. From airports, inter-city, and within cities.',
  keywords: [
    'executive transport',
    'Venezuela',
    'armored vehicle',
    'security transport',
    'airport transfer',
    'Caracas',
  ],
  openGraph: {
    title: 'RUTA - Executive Security Transport',
    description: 'Secure executive transport in Venezuela. Book in 60 seconds.',
    type: 'website',
  },
}

export default function RutaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: '#0a0a0a',
        color: '#e8e8e8',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* prefers-reduced-motion: disable CSS animations globally for RUTA pages */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#e8e8e8',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </div>
  )
}
