'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Contact', href: '#contact' },
]

export function RutaNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  function handleLinkClick() {
    setMenuOpen(false)
  }

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-16 py-4 flex justify-between items-center transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(10,10,10,0.95)' : 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Link href="/ruta" className="block" onClick={handleLinkClick}>
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

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-xs uppercase tracking-wider transition-colors hover:text-white"
              style={{ color: '#888' }}
            >
              {item.label}
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden relative w-8 h-8 flex flex-col justify-center items-center gap-1.5"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              background: '#c9a96e',
              transform: menuOpen ? 'rotate(45deg) translateY(3.5px)' : 'none',
            }}
          />
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              background: '#c9a96e',
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              background: '#c9a96e',
              transform: menuOpen ? 'rotate(-45deg) translateY(-3.5px)' : 'none',
            }}
          />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-center items-center gap-8 md:hidden"
          style={{ background: 'rgba(10,10,10,0.98)' }}
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={handleLinkClick}
              className="text-2xl font-light uppercase tracking-widest transition-colors hover:text-white"
              style={{ color: '#ccc' }}
            >
              {item.label}
            </a>
          ))}

          <a
            href="#book"
            onClick={handleLinkClick}
            className="mt-4 text-sm font-semibold uppercase tracking-wider px-10 py-3.5 transition-opacity hover:opacity-90"
            style={{
              background: '#c9a96e',
              color: '#0a0a0a',
            }}
          >
            Book Now
          </a>

          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href="https://wa.me/584121234567"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm flex items-center gap-2"
              style={{ color: '#c9a96e' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <span className="text-xs" style={{ color: '#555' }}>
              ops@rutasecurity.com
            </span>
          </div>
        </div>
      )}
    </>
  )
}
