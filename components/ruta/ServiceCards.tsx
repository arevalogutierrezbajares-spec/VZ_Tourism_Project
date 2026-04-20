'use client'

import type { RutaRideType } from '@/types/ruta'
import { useRutaI18n } from '@/lib/ruta/i18n'

interface ServiceCardsProps {
  onServiceSelect?: (service: RutaRideType) => void
}

export function ServiceCards({ onServiceSelect }: ServiceCardsProps) {
  const { t } = useRutaI18n()

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
      title: t.services.airport.title,
      description: t.services.airport.description,
      price: t.services.airport.price,
      priceContext: t.services.airport.priceContext,
      specs: t.services.airport.specs,
    },
    {
      type: 'inter_city',
      icon: '\u2194',
      title: t.services.interCity.title,
      description: t.services.interCity.description,
      price: t.services.interCity.price,
      priceContext: t.services.interCity.priceContext,
      specs: t.services.interCity.specs,
    },
    {
      type: 'intra_city',
      icon: '\u25C9',
      title: t.services.intraCity.title,
      description: t.services.intraCity.description,
      price: t.services.intraCity.price,
      priceContext: t.services.intraCity.priceContext,
      specs: t.services.intraCity.specs,
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
          {t.services.sectionTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px">
          {services.map((service) => (
            <div
              key={service.type}
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
              <div className="text-xs mt-1 mb-6" style={{ color: '#888' }}>
                {service.priceContext}
              </div>
              <ul
                className="space-y-2 pt-5 mb-8"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                {service.specs.map((spec, i) => (
                  <li
                    key={i}
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
                className="mt-auto w-full min-h-[44px] py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:opacity-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
                style={{
                  border: '1px solid rgba(201,169,110,0.4)',
                  color: '#c9a96e',
                  background: 'transparent',
                }}
              >
                {t.services.bookPrefix} {service.title}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
