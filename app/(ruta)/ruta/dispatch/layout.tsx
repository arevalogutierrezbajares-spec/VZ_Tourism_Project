'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function DispatchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data: { user } }) => {
      const meta = user?.app_metadata as Record<string, unknown> | undefined
      const role = meta?.ruta_role as string | undefined
      setAuthorized(role === 'ruta_dispatcher' || role === 'ruta_admin')
    })
  }, [])

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm" style={{ color: '#888' }}>
          Verifying access...
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#c9a96e' }}>
            Access Denied
          </h1>
          <p className="text-sm mb-6" style={{ color: '#888' }}>
            You need dispatcher or admin access to view this page.
          </p>
          <Link
            href="/ruta"
            className="text-sm underline"
            style={{ color: '#c9a96e' }}
          >
            Return to RUTA
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dispatch Nav */}
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(10,10,10,0.95)',
        }}
      >
        <div className="flex items-center gap-8">
          <Link href="/ruta" className="block">
            <span
              className="text-lg font-bold tracking-[0.3em]"
              style={{ color: '#c9a96e' }}
            >
              RUTA
            </span>
            <span className="text-xs ml-3" style={{ color: '#666' }}>
              Dispatch
            </span>
          </Link>
          <div className="hidden md:flex gap-6">
            {[
              { label: 'Rides', href: '/ruta/dispatch' },
              { label: 'Drivers', href: '/ruta/dispatch/drivers' },
              { label: 'Vehicles', href: '/ruta/dispatch/vehicles' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs uppercase tracking-wider hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#c9a96e] rounded-sm"
                style={{ color: '#888' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="text-xs" style={{ color: '#888' }}>
          Dispatch Console
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
