'use client'

import { useState } from 'react'
import { RutaNav } from '@/components/ruta/RutaNav'
import { BookingForm } from '@/components/ruta/BookingForm'
import { ServiceCards } from '@/components/ruta/ServiceCards'
import { SecuritySection } from '@/components/ruta/SecuritySection'
import { ContactSection } from '@/components/ruta/ContactSection'
import type { RutaRideType } from '@/types/ruta'

const FOOTER_NAV = [
  { label: 'Services', href: '#services' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Contact', href: '#contact' },
  { label: 'Book Now', href: '#book' },
]

export default function RutaLandingPage() {
  const [activeService, setActiveService] = useState<RutaRideType>('airport')

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
              Secure{' '}
              <span className="font-bold" style={{ color: '#c9a96e' }}>
                Executive
              </span>{' '}
              Transport in Venezuela
            </h1>
            <p className="text-lg mb-8 max-w-lg" style={{ color: '#999' }}>
              Armored vehicles. Armed security. Instant booking. From Maiquetia
              to Caracas, Margarita to Merida. The executive transport service
              built for how Venezuela actually works.
            </p>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { value: 'B5', label: 'Armor Rating', desc: 'Ballistic protection' },
                { value: '24/7', label: 'Operations', desc: 'Always available' },
                { value: 'GPS', label: 'Live Tracking', desc: 'Real-time monitoring' },
                { value: '100%', label: 'Vetted', desc: 'Background checked' },
              ].map((badge) => (
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
              <span>Prefer to speak with someone?</span>
              <a
                href="https://wa.me/584121234567"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
                style={{ color: '#c9a96e' }}
              >
                WhatsApp our ops team
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
            Trusted by corporate travel departments and executive teams
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              'Fortune 500 Energy',
              'International NGOs',
              'Diplomatic Corps',
              'Mining & Resources',
              'Consulting Firms',
            ].map((client) => (
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
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Book Online',
                desc: 'Select your service, enter your route, and get an instant price. No emails, no contracts.',
              },
              {
                step: '02',
                title: 'Receive Driver Details',
                desc: "Your driver's name, photo, vehicle description, and plate number. Sent via email and WhatsApp.",
              },
              {
                step: '03',
                title: 'Meet at Pickup',
                desc: 'Your driver arrives in a discrete armored vehicle. Professional, punctual, secure.',
              },
              {
                step: '04',
                title: 'Tracked in Real Time',
                desc: 'Live GPS tracking throughout your ride. Our operations center monitors every active transfer.',
              },
            ].map((item) => (
              <div key={item.step}>
                <div
                  className="text-3xl font-bold mb-4"
                  style={{ color: '#c9a96e', opacity: 0.3 }}
                >
                  {item.step}
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
                RUTA Security Services LLC is a Florida-registered entity
                operating in compliance with US OFAC requirements and applicable
                Venezuelan regulations. Client payments processed in USD. No
                bolivar transactions.
              </p>
            </div>

            {/* Center: Nav links */}
            <div className="flex flex-col items-start md:items-center gap-3">
              {FOOTER_NAV.map((item) => (
                <a
                  key={item.label}
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
                Miami, FL | Caracas, VZ
              </span>
              <span className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.15)' }}>
                &copy; {new Date().getFullYear()} RUTA Security Services LLC. All times in VET (UTC-4).
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
