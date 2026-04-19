'use client'

import { useState } from 'react'
import { RutaI18nProvider, useRutaI18n } from '@/lib/ruta/i18n'
import { RutaNav } from '@/components/ruta/RutaNav'
import { BookingForm } from '@/components/ruta/BookingForm'
import { ServiceCards } from '@/components/ruta/ServiceCards'
import { SecuritySection } from '@/components/ruta/SecuritySection'
import { ContactSection } from '@/components/ruta/ContactSection'
import type { RutaRideType } from '@/types/ruta'

export default function RutaLandingPage() {
  return (
    <RutaI18nProvider>
      <RutaLandingContent />
    </RutaI18nProvider>
  )
}

function RutaLandingContent() {
  const { t } = useRutaI18n()
  const [activeService, setActiveService] = useState<RutaRideType>('airport')

  const footerNav = [
    { label: t.nav.services, href: '#services' },
    { label: t.nav.howItWorks, href: '#how-it-works' },
    { label: t.nav.security, href: '#security' },
    { label: t.nav.contact, href: '#contact' },
    { label: t.nav.bookNow, href: '#book' },
  ]

  return (
    <>
      <RutaNav />

      {/* Hero Section */}
      <section id="hero" className="min-h-screen flex flex-col justify-center px-6 md:px-16 pt-24 pb-16 relative">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Headline + Trust */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight mb-6 tracking-tight">
              {t.hero.titlePre}
              <span className="font-bold" style={{ color: '#c9a96e' }}>
                {t.hero.titleAccent}
              </span>
              {t.hero.titlePost}
            </h1>
            <p className="text-lg mb-8 max-w-lg" style={{ color: '#999' }}>
              {t.hero.subtitle}
            </p>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {t.badges.map((badge) => (
                <div key={badge.label} className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: '#c9a96e' }}
                  >
                    {badge.value}
                  </div>
                  <div
                    className="text-xs uppercase tracking-wider mt-1"
                    style={{ color: '#999' }}
                  >
                    {badge.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#666' }}>
                    {badge.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* "Talk to a human" fallback */}
            <div
              className="flex items-center gap-3 text-sm"
              style={{ color: '#666' }}
            >
              <span>{t.hero.speakWithSomeone}</span>
              <a
                href="https://wa.me/584121234567"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
                style={{ color: '#c9a96e' }}
              >
                {t.hero.whatsappOps}
              </a>
            </div>
          </div>

          {/* Right: Booking Form */}
          <BookingForm
            activeService={activeService}
            onServiceChange={setActiveService}
          />
        </div>
      </section>

      {/* Trusted By */}
      <section className="px-6 md:px-16 py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <p
            className="text-xs uppercase tracking-widest mb-8"
            style={{ color: '#666' }}
          >
            {t.trustedBy.heading}
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {t.trustedBy.clients.map((client) => (
              <span
                key={client}
                className="text-sm font-medium"
                style={{ color: '#555' }}
              >
                {client}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Service Tiers */}
      <ServiceCards onServiceSelect={setActiveService} />

      {/* How It Works */}
      <section id="how-it-works" className="px-6 md:px-16 py-24">
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-xs uppercase tracking-widest mb-16"
            style={{ color: '#c9a96e' }}
          >
            {t.howItWorks.sectionTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {t.howItWorks.steps.map((item, i) => (
              <div key={i}>
                <div
                  className="text-3xl font-bold mb-4"
                  style={{ color: '#c9a96e', opacity: 0.3 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#999' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Protocol */}
      <SecuritySection />

      {/* Contact */}
      <ContactSection />

      {/* Footer */}
      <footer className="px-6 md:px-16 py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Left: Logo + compliance */}
            <div>
              <div
                className="text-lg font-bold tracking-widest mb-4"
                style={{ color: '#c9a96e' }}
              >
                RUTA<span style={{ color: '#c9a96e' }}>.</span>
              </div>
              <p
                className="text-[10px] uppercase tracking-wider leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                {t.footer.compliance}
              </p>
            </div>

            {/* Center: Nav links */}
            <div className="flex flex-col items-start md:items-center gap-3">
              {footerNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-xs uppercase tracking-wider transition-colors hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Right: Contact + legal */}
            <div className="flex flex-col items-start md:items-end gap-3">
              <a
                href="https://wa.me/584121234567"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors hover:text-white"
                style={{ color: '#c9a96e' }}
              >
                WhatsApp: +58 412 123 4567
              </a>
              <a
                href="mailto:ops@rutasecurity.com"
                className="text-xs transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                ops@rutasecurity.com
              </a>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {t.footer.location}
              </span>
              <span className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.15)' }}>
                &copy; {new Date().getFullYear()} RUTA Security Services LLC. {t.footer.allTimes}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
