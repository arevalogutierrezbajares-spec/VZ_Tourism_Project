'use client'

import Link from 'next/link'

export function RutaNav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 px-6 md:px-16 py-5 flex justify-between items-center"
      style={{
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <Link href="/" className="block">
        <div
          className="text-xl font-bold tracking-[0.5em]"
          style={{ color: '#c9a96e' }}
        >
          RUTA
        </div>
        <div
          className="text-[10px] tracking-wider"
          style={{ color: '#666' }}
        >
          Executive Security Transport
        </div>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {['Services', 'Security', 'Fleet', 'Contact'].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="text-xs uppercase tracking-wider transition-colors hover:text-white"
            style={{ color: '#888' }}
          >
            {item}
          </a>
        ))}
        <a
          href="#book"
          className="text-xs font-semibold uppercase tracking-wider px-6 py-2.5 transition-opacity hover:opacity-90"
          style={{
            background: '#c9a96e',
            color: '#0a0a0a',
          }}
        >
          Book Now
        </a>
      </div>
    </nav>
  )
}
