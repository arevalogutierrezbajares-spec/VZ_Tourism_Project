'use client'

import { useRutaI18n } from '@/lib/ruta/i18n'

export function SecuritySection() {
  const { t } = useRutaI18n()

  return (
    <section
      id="security"
      className="px-6 md:px-16 py-24"
      style={{ background: 'rgba(255,255,255,0.01)' }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div>
          <h2
            className="text-xs uppercase tracking-widest mb-8"
            style={{ color: '#c9a96e' }}
          >
            {t.security.sectionLabel}
          </h2>
          <h3 className="text-3xl md:text-4xl font-light mb-6">
            {t.security.heading}
          </h3>
          <p className="text-base leading-relaxed mb-4" style={{ color: '#999' }}>
            {t.security.p1}
          </p>
          <p className="text-base leading-relaxed" style={{ color: '#999' }}>
            {t.security.p2}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {t.security.features.map((feat) => (
            <div
              key={feat.title}
              className="p-6"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <h4 className="text-sm font-semibold mb-2">{feat.title}</h4>
              <p className="text-xs leading-relaxed" style={{ color: '#999' }}>
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
