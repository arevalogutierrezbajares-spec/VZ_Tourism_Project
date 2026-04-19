'use client'

import type { RutaRideType } from '@/types/ruta'

interface ServiceCardsProps {
  onServiceSelect?: (service: RutaRideType) => void
}

export function ServiceCards({ onServiceSelect }: ServiceCardsProps) {
  const services: Array<{
    type: RutaRideType
    icon: string
    title: string
    description: string
    price: string
    priceContext: string
    specs: string[]
  }> = [
    {
      type: 'airport',
      icon: '\u2708',
      title: 'Airport Transfer',
      description:
        'Fixed-rate armored transfers between Venezuelan airports and your destination. Meet-and-greet at arrivals. Discrete, professional, on time.',
      price: 'From $280 USD',
      priceContext: 'CCS to Caracas, all-inclusive',
      specs: [
        'CCS, PMV, MAR, BLA, VLN airports',
        'Fixed pricing, no surprises',
        'Flight tracking for delays',
        'Armed driver + B5 armored vehicle',
      ],
    },
    {
      type: 'inter_city',
      icon: '\u2194',
      title: 'Inter-City',
      description:
        'Long-distance secure transport between Venezuelan cities. Convoy option available for high-risk corridors. Route intelligence briefing included.',
      price: 'From $12/km',
      priceContext: 'Plus base fare, distance calculated',
      specs: [
        'All major city routes',
        'Optional armed escort convoy',
        'Pre-trip route risk assessment',
        'Satellite tracking throughout',
      ],
    },
    {
      type: 'intra_city',
      icon: '\u25C9',
      title: 'Intra-City',
      description:
        'Executive movement within city limits. Hourly or point-to-point. Ideal for meetings, site visits, and daily executive schedules.',
      price: 'From $95/hour',
      priceContext: 'Or per-trip pricing available',
      specs: [
        'Hourly or per-trip booking',
        'Multi-stop itineraries',
        'Standby driver between meetings',
        'Armed close protection add-on',
      ],
    },
  ]

  function handleSelect(type: RutaRideType) {
    if (onServiceSelect) {
      onServiceSelect(type)
    }
    // Scroll to booking form
    const el = document.getElementById('book')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <section id="services" className="px-6 md:px-16 py-24">
      <div className="max-w-7xl mx-auto">
        <h2
          className="text-xs uppercase tracking-widest mb-16"
          style={{ color: '#c9a96e' }}
        >
          Service Tiers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px">
          {services.map((service) => (
            <div
              key={service.title}
              className="p-8 md:p-12 flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="text-3xl mb-5 opacity-80">{service.icon}</div>
              <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: '#999' }}
              >
                {service.description}
              </p>
              <div className="text-sm font-medium" style={{ color: '#c9a96e' }}>
                {service.price}
              </div>
              <div className="text-xs mt-1 mb-6" style={{ color: '#666' }}>
                {service.priceContext}
              </div>
              <ul
                className="space-y-2 pt-5 mb-8"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                {service.specs.map((spec) => (
                  <li
                    key={spec}
                    className="flex items-start gap-3 text-xs"
                    style={{ color: '#999' }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: '#c9a96e' }}
                    />
                    {spec}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelect(service.type)}
                className="mt-auto w-full py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:opacity-90"
                style={{
                  border: '1px solid rgba(201,169,110,0.4)',
                  color: '#c9a96e',
                  background: 'transparent',
                }}
              >
                Book {service.title}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
