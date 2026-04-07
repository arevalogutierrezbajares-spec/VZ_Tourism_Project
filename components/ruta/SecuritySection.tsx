'use client'

export function SecuritySection() {
  const features = [
    {
      title: 'Armored Fleet',
      description:
        'B4-B5 rated vehicles. Bulletproof glass, reinforced chassis. Standard appearance from outside.',
    },
    {
      title: 'Vetted Drivers',
      description:
        'Background checked, professionally trained, licensed to carry. Minimum 5 years experience.',
    },
    {
      title: 'Live Monitoring',
      description:
        'GPS tracking on every vehicle. Operations center monitors all active rides around the clock.',
    },
    {
      title: 'Route Intelligence',
      description:
        'Pre-trip risk assessment. Real-time route adjustments. Geofenced alert zones across Venezuela.',
    },
  ]

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
            Security Protocol
          </h2>
          <h3 className="text-3xl md:text-4xl font-light mb-6">
            Your safety is operational, not aspirational
          </h3>
          <p className="text-base leading-relaxed mb-4" style={{ color: '#999' }}>
            Every RUTA vehicle is armored to B4-B5 ballistic standards. Every
            driver is vetted, trained, and armed. Every route is assessed for
            risk before departure.
          </p>
          <p className="text-base leading-relaxed" style={{ color: '#999' }}>
            Live GPS tracking and in-vehicle monitoring provide real-time
            oversight from our operations center. This is not a standard ride
            service. This is executive security.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feat) => (
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
