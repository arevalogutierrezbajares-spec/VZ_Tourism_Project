'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

// ─── Supported locales ───────────────────────────────────────────────
export type RutaLocale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'it'

export const LOCALE_LABELS: Record<RutaLocale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  zh: '中文',
  it: 'Italiano',
}

export const LOCALE_FLAGS: Record<RutaLocale, string> = {
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  pt: 'PT',
  zh: 'ZH',
  it: 'IT',
}

// ─── Translation shape ──────────────────────────────────────────────
export interface RutaTranslations {
  nav: {
    services: string
    howItWorks: string
    security: string
    contact: string
    bookNow: string
    tagline: string
    openMenu: string
    closeMenu: string
  }
  hero: {
    titlePre: string
    titleAccent: string
    titlePost: string
    subtitle: string
    speakWithSomeone: string
    whatsappOps: string
  }
  badges: Array<{ value: string; label: string; desc: string }>
  trustedBy: {
    heading: string
    clients: string[]
  }
  services: {
    sectionTitle: string
    airport: {
      title: string
      description: string
      price: string
      priceContext: string
      specs: string[]
    }
    interCity: {
      title: string
      description: string
      price: string
      priceContext: string
      specs: string[]
    }
    intraCity: {
      title: string
      description: string
      price: string
      priceContext: string
      specs: string[]
    }
    bookPrefix: string
  }
  howItWorks: {
    sectionTitle: string
    steps: Array<{ title: string; desc: string }>
  }
  security: {
    sectionLabel: string
    heading: string
    p1: string
    p2: string
    features: Array<{ title: string; description: string }>
  }
  contactSection: {
    sectionLabel: string
    heading: string
    headingAccent: string
    description: string
    ctaButton: string
    ctaNote: string
    options: Array<{
      label: string
      sublabel: string
      note: string
    }>
  }
  booking: {
    title: string
    tabs: { airport: string; interCity: string; intraCity: string }
    pickupAirport: string
    pickupLocation: string
    destination: string
    date: string
    time: string
    passengers: string
    vehicle: string
    selectDate: string
    selectTime: string
    selectAirport: string
    getQuote: string
    calculating: string
    yourQuote: string
    validFor: string
    baseFare: string
    distance: string
    timeCost: string
    bookNowPrice: string
    confirmPay: string
    processing: string
    passengerDetails: string
    fullName: string
    email: string
    phone: string
    paymentMethod: string
    creditCard: string
    zelle: string
    passengerCount: (n: number) => string
    vehicleSuv: string
    vehicleSedan: string
    vehicleVan: string
    leadTimeAirport: string
    leadTimeInterCity: string
    leadTimeIntraCity: string
    needSooner: string
    fillIn: string
    quoteError: string
    fillPassenger: string
    invalidEmail: string
    somethingWrong: string
    manualQuote: string
    placeholderCity: string
    placeholderAddress: string
    placeholderDestAirport: string
    placeholderDestInterCity: string
    noLocations: string
  }
  footer: {
    compliance: string
    location: string
    allTimes: string
  }
}

// ─── English ─────────────────────────────────────────────────────────
const en: RutaTranslations = {
  nav: {
    services: 'Services',
    howItWorks: 'How It Works',
    security: 'Security',
    contact: 'Contact',
    bookNow: 'Book Now',
    tagline: 'Executive Security Transport',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  hero: {
    titlePre: 'Secure ',
    titleAccent: 'Executive',
    titlePost: ' Transport in Venezuela',
    subtitle: 'Discreet luxury SUVs. Vetted ex-military drivers. Instant booking. From Maiquetia to Caracas, Margarita to Merida. The executive transport service built for how Venezuela actually works.',
    speakWithSomeone: 'Prefer to speak with someone?',
    whatsappOps: 'WhatsApp our ops team',
  },
  badges: [
    { value: '24/7', label: 'Operations', desc: 'Always available' },
    { value: 'GPS', label: 'Live Tracking', desc: 'Real-time monitoring' },
    { value: '100%', label: 'Vetted', desc: 'Ex-armed forces drivers' },
  ],
  trustedBy: {
    heading: 'Trusted by corporate travel departments and executive teams',
    clients: ['Xiaomi', 'Sinopec', 'CNPC', 'Diplomatic Corps', 'Oil & Mining'],
  },
  services: {
    sectionTitle: 'Service Tiers',
    airport: {
      title: 'Airport Transfer',
      description: 'Fixed-rate transfers between Venezuelan airports and your destination. Meet-and-greet at arrivals. Discreet, professional, on time.',
      price: 'From $280 USD',
      priceContext: 'CCS to Caracas, all-inclusive',
      specs: ['CCS, PMV, MAR, BLA, VLN airports', 'Fixed pricing, no surprises', 'Flight tracking for delays', 'Vetted ex-military driver + luxury SUV'],
    },
    interCity: {
      title: 'Inter-City',
      description: 'Long-distance executive transport between Venezuelan cities. Experienced drivers who know every route. Comfortable, tracked, and reliable.',
      price: 'From $12/km',
      priceContext: 'Plus base fare, distance calculated',
      specs: ['All major city routes', 'Drivers with deep route knowledge', 'Real-time conditions monitoring', 'GPS tracking throughout'],
    },
    intraCity: {
      title: 'Intra-City',
      description: 'Executive movement within city limits. Hourly or point-to-point. Ideal for meetings, site visits, and daily executive schedules.',
      price: 'From $95/hour',
      priceContext: 'Or per-trip pricing available',
      specs: ['Hourly or per-trip booking', 'Multi-stop itineraries', 'Standby driver between meetings', 'Comfortable luxury SUV with AC'],
    },
    bookPrefix: 'Book',
  },
  howItWorks: {
    sectionTitle: 'How It Works',
    steps: [
      { title: 'Book Online', desc: 'Select your service, enter your route, and get an instant price. No emails, no contracts.' },
      { title: 'Receive Driver Details', desc: "Your driver's name, photo, vehicle description, and plate number. Sent via email and WhatsApp." },
      { title: 'Meet at Pickup', desc: 'Your driver arrives in a discreet luxury SUV. Professional, punctual, comfortable.' },
      { title: 'Tracked in Real Time', desc: 'Live GPS tracking throughout your ride. Our operations center monitors every active transfer.' },
    ],
  },
  security: {
    sectionLabel: 'Security Protocol',
    heading: 'Your safety is operational, not aspirational',
    p1: 'Every RUTA driver is former armed forces — vetted, experienced, and trained for executive transport. Every vehicle is a discreet, comfortable SUV maintained to the highest standard.',
    p2: 'Live GPS tracking and real-time oversight from our operations team. Drivers who know the roads and adapt when conditions change. This is not a standard ride service. This is executive transport.',
    features: [
      { title: 'Discreet Luxury Fleet', description: 'Low-profile SUVs with premium interiors. Air conditioning, water, phone chargers. Comfortable and unremarkable from the outside.' },
      { title: 'Ex-Military Drivers', description: 'Former PNB, GNB, and FANB personnel. Vetted, experienced, and trained for executive transport. Minimum 5 years on Venezuelan roads.' },
      { title: 'Live Monitoring', description: 'GPS tracking on every vehicle. Our operations team monitors all active rides around the clock.' },
      { title: 'Local Route Knowledge', description: 'Drivers who know the roads, the conditions, and the best way to get you there. Real-time adjustments when things change.' },
    ],
  },
  contactSection: {
    sectionLabel: 'Contact',
    heading: 'Talk to our ',
    headingAccent: 'operations team',
    description: 'Need a custom quote, multi-day arrangement, or armed escort detail? Our ops team responds within 30 minutes on WhatsApp. For corporate retainers and recurring service, email us directly.',
    ctaButton: 'WhatsApp Our Ops Team',
    ctaNote: 'Available 06:00-22:00 VET (UTC-4). Urgent requests outside hours: call Miami office.',
    options: [
      { label: 'WhatsApp', sublabel: 'Fastest response', note: 'Typical response: < 30 minutes' },
      { label: 'Email', sublabel: 'Operations team', note: 'Response within 2 business hours' },
      { label: 'Phone', sublabel: 'Miami office', note: 'Mon-Fri 09:00-18:00 ET' },
    ],
  },
  booking: {
    title: 'Book Your Transfer',
    tabs: { airport: 'Airport', interCity: 'Inter-City', intraCity: 'Intra-City' },
    pickupAirport: 'Pickup Airport',
    pickupLocation: 'Pickup Location',
    destination: 'Destination',
    date: 'Date',
    time: 'Time (VET, UTC-4)',
    passengers: 'Passengers',
    vehicle: 'Vehicle',
    selectDate: 'Select date',
    selectTime: 'Select time',
    selectAirport: 'Select airport...',
    getQuote: 'Get Instant Quote',
    calculating: 'Calculating...',
    yourQuote: 'Your Quote',
    validFor: 'Valid for 15 min',
    baseFare: 'Base fare',
    distance: 'Distance',
    timeCost: 'Time',
    bookNowPrice: 'Book Now',
    confirmPay: 'Confirm & Pay',
    processing: 'Processing...',
    passengerDetails: 'Passenger Details',
    fullName: 'Full Name *',
    email: 'Email *',
    phone: 'Phone *',
    paymentMethod: 'Payment Method',
    creditCard: 'Credit Card',
    zelle: 'Zelle',
    passengerCount: (n: number) => n === 1 ? '1 Passenger' : `${n} Passengers`,
    vehicleSedan: 'Luxury Sedan',
    vehicleSuv: 'Luxury SUV',
    vehicleVan: 'Executive Van',
    leadTimeAirport: 'Minimum 2 hours before pickup.',
    leadTimeInterCity: 'Minimum 4 hours before pickup.',
    leadTimeIntraCity: 'Minimum 1 hour before pickup.',
    needSooner: 'Need sooner? Call us.',
    fillIn: 'Please fill in',
    quoteError: "We couldn't calculate your price right now. Please try again or contact us via WhatsApp for an instant quote.",
    fillPassenger: 'Please fill in all passenger details.',
    invalidEmail: 'Please enter a valid email address.',
    somethingWrong: 'Something went wrong. Please try again.',
    manualQuote: 'Contact our ops team for a manual quote',
    placeholderCity: 'City name (e.g., Caracas, Valencia)',
    placeholderAddress: 'Address, hotel, or landmark',
    placeholderDestAirport: 'Hotel, address, or landmark',
    placeholderDestInterCity: 'Destination city (e.g., Merida, Maracaibo)',
    noLocations: 'No locations found. Try a more specific address or landmark name.',
  },
  footer: {
    compliance: 'RUTA Security Services LLC is a Florida-registered entity operating in compliance with US OFAC requirements and applicable Venezuelan regulations. Client payments processed in USD. No bolivar transactions.',
    location: 'Miami, FL | Caracas, VZ',
    allTimes: 'All times in VET (UTC-4).',
  },
}

// ─── Spanish ─────────────────────────────────────────────────────────
const es: RutaTranslations = {
  nav: {
    services: 'Servicios',
    howItWorks: 'Cómo Funciona',
    security: 'Seguridad',
    contact: 'Contacto',
    bookNow: 'Reservar',
    tagline: 'Transporte Ejecutivo de Seguridad',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
  },
  hero: {
    titlePre: 'Transporte ',
    titleAccent: 'Ejecutivo',
    titlePost: ' Seguro en Venezuela',
    subtitle: 'Camionetas de lujo discretas. Conductores ex-militares verificados. Reserva inmediata. De Maiquetía a Caracas, Margarita a Mérida. El servicio de transporte ejecutivo diseñado para cómo funciona Venezuela.',
    speakWithSomeone: '¿Prefiere hablar con alguien?',
    whatsappOps: 'WhatsApp a nuestro equipo',
  },
  badges: [
    { value: '24/7', label: 'Operaciones', desc: 'Siempre disponible' },
    { value: 'GPS', label: 'Rastreo en Vivo', desc: 'Monitoreo en tiempo real' },
    { value: '100%', label: 'Verificados', desc: 'Conductores ex-fuerzas armadas' },
  ],
  trustedBy: {
    heading: 'La confianza de departamentos de viajes corporativos y equipos ejecutivos',
    clients: ['Xiaomi', 'Sinopec', 'CNPC', 'Cuerpo Diplomático', 'Petróleo y Minería'],
  },
  services: {
    sectionTitle: 'Niveles de Servicio',
    airport: {
      title: 'Traslado Aeropuerto',
      description: 'Traslados a tarifa fija entre aeropuertos venezolanos y su destino. Recepción en llegadas. Discreto, profesional, puntual.',
      price: 'Desde $280 USD',
      priceContext: 'CCS a Caracas, todo incluido',
      specs: ['Aeropuertos CCS, PMV, MAR, BLA, VLN', 'Precio fijo, sin sorpresas', 'Seguimiento de vuelo por demoras', 'Conductor ex-militar + camioneta de lujo'],
    },
    interCity: {
      title: 'Interurbano',
      description: 'Transporte ejecutivo de larga distancia entre ciudades venezolanas. Conductores experimentados que conocen cada ruta. Cómodo, rastreado y confiable.',
      price: 'Desde $12/km',
      priceContext: 'Más tarifa base, distancia calculada',
      specs: ['Todas las rutas principales', 'Conductores con conocimiento profundo de rutas', 'Monitoreo de condiciones en tiempo real', 'Rastreo GPS durante todo el trayecto'],
    },
    intraCity: {
      title: 'Urbano',
      description: 'Movimiento ejecutivo dentro de la ciudad. Por hora o punto a punto. Ideal para reuniones, visitas de sitio y agendas ejecutivas diarias.',
      price: 'Desde $95/hora',
      priceContext: 'O tarifa por viaje disponible',
      specs: ['Reserva por hora o por viaje', 'Itinerarios con múltiples paradas', 'Conductor en espera entre reuniones', 'Camioneta de lujo cómoda con A/C'],
    },
    bookPrefix: 'Reservar',
  },
  howItWorks: {
    sectionTitle: 'Cómo Funciona',
    steps: [
      { title: 'Reserve en Línea', desc: 'Seleccione su servicio, ingrese su ruta y obtenga un precio instantáneo. Sin correos, sin contratos.' },
      { title: 'Reciba Datos del Conductor', desc: 'Nombre, foto, descripción del vehículo y número de placa de su conductor. Enviado por email y WhatsApp.' },
      { title: 'Encuentro en el Punto', desc: 'Su conductor llega en una camioneta de lujo discreta. Profesional, puntual, confortable.' },
      { title: 'Rastreo en Tiempo Real', desc: 'Rastreo GPS en vivo durante todo su viaje. Nuestro centro de operaciones monitorea cada traslado activo.' },
    ],
  },
  security: {
    sectionLabel: 'Protocolo de Seguridad',
    heading: 'Su seguridad es operativa, no aspiracional',
    p1: 'Cada conductor de RUTA es ex-fuerzas armadas — verificado, experimentado y entrenado para transporte ejecutivo. Cada vehículo es una camioneta discreta y confortable mantenida al más alto estándar.',
    p2: 'Rastreo GPS en vivo y supervisión en tiempo real de nuestro equipo de operaciones. Conductores que conocen las vías y se adaptan cuando las condiciones cambian. Este no es un servicio de transporte estándar. Esto es transporte ejecutivo.',
    features: [
      { title: 'Flota de Lujo Discreta', description: 'Camionetas de bajo perfil con interiores premium. Aire acondicionado, agua, cargadores de teléfono. Cómodas e irreconocibles desde afuera.' },
      { title: 'Conductores Ex-Militares', description: 'Ex-personal de PNB, GNB y FANB. Verificados, experimentados y entrenados para transporte ejecutivo. Mínimo 5 años en carreteras venezolanas.' },
      { title: 'Monitoreo en Vivo', description: 'Rastreo GPS en cada vehículo. Nuestro equipo de operaciones monitorea todos los viajes activos las 24 horas.' },
      { title: 'Conocimiento Local de Rutas', description: 'Conductores que conocen las vías, las condiciones y la mejor manera de llevarlo. Ajustes en tiempo real cuando las cosas cambian.' },
    ],
  },
  contactSection: {
    sectionLabel: 'Contacto',
    heading: 'Hable con nuestro ',
    headingAccent: 'equipo de operaciones',
    description: 'Necesita una cotización personalizada, un arreglo de varios días o escolta armada? Nuestro equipo responde en 30 minutos por WhatsApp. Para contratos corporativos y servicio recurrente, escríbanos directamente.',
    ctaButton: 'WhatsApp a Nuestro Equipo',
    ctaNote: 'Disponible 06:00-22:00 VET (UTC-4). Solicitudes urgentes fuera de horario: llame a la oficina de Miami.',
    options: [
      { label: 'WhatsApp', sublabel: 'Respuesta más rápida', note: 'Respuesta típica: < 30 minutos' },
      { label: 'Email', sublabel: 'Equipo de operaciones', note: 'Respuesta en 2 horas hábiles' },
      { label: 'Teléfono', sublabel: 'Oficina Miami', note: 'Lun-Vie 09:00-18:00 ET' },
    ],
  },
  booking: {
    title: 'Reserve su Traslado',
    tabs: { airport: 'Aeropuerto', interCity: 'Interurbano', intraCity: 'Urbano' },
    pickupAirport: 'Aeropuerto de Recogida',
    pickupLocation: 'Lugar de Recogida',
    destination: 'Destino',
    date: 'Fecha',
    time: 'Hora (VET, UTC-4)',
    passengers: 'Pasajeros',
    vehicle: 'Vehículo',
    selectDate: 'Seleccionar fecha',
    selectTime: 'Seleccionar hora',
    selectAirport: 'Seleccionar aeropuerto...',
    getQuote: 'Obtener Cotización',
    calculating: 'Calculando...',
    yourQuote: 'Su Cotización',
    validFor: 'Válida por 15 min',
    baseFare: 'Tarifa base',
    distance: 'Distancia',
    timeCost: 'Tiempo',
    bookNowPrice: 'Reservar Ahora',
    confirmPay: 'Confirmar y Pagar',
    processing: 'Procesando...',
    passengerDetails: 'Datos del Pasajero',
    fullName: 'Nombre Completo *',
    email: 'Email *',
    phone: 'Teléfono *',
    paymentMethod: 'Método de Pago',
    creditCard: 'Tarjeta de Crédito',
    zelle: 'Zelle',
    passengerCount: (n: number) => n === 1 ? '1 Pasajero' : `${n} Pasajeros`,
    vehicleSedan: 'Sedán de Lujo',
    vehicleSuv: 'Camioneta de Lujo',
    vehicleVan: 'Van Ejecutiva',
    leadTimeAirport: 'Mínimo 2 horas antes de la recogida.',
    leadTimeInterCity: 'Mínimo 4 horas antes de la recogida.',
    leadTimeIntraCity: 'Mínimo 1 hora antes de la recogida.',
    needSooner: '¿Lo necesita antes? Llámenos.',
    fillIn: 'Por favor complete',
    quoteError: 'No pudimos calcular su precio en este momento. Intente de nuevo o contáctenos por WhatsApp para una cotización.',
    fillPassenger: 'Por favor complete todos los datos del pasajero.',
    invalidEmail: 'Por favor ingrese un email válido.',
    somethingWrong: 'Algo salió mal. Intente de nuevo.',
    manualQuote: 'Contacte a nuestro equipo para una cotización manual',
    placeholderCity: 'Ciudad (ej. Caracas, Valencia)',
    placeholderAddress: 'Dirección, hotel o punto de referencia',
    placeholderDestAirport: 'Hotel, dirección o punto de referencia',
    placeholderDestInterCity: 'Ciudad destino (ej. Mérida, Maracaibo)',
    noLocations: 'No se encontraron ubicaciones. Intente con una dirección más específica.',
  },
  footer: {
    compliance: 'RUTA Security Services LLC es una entidad registrada en Florida que opera en cumplimiento con los requisitos de OFAC de EE.UU. y las regulaciones venezolanas aplicables. Pagos procesados en USD. Sin transacciones en bolívares.',
    location: 'Miami, FL | Caracas, VZ',
    allTimes: 'Todas las horas en VET (UTC-4).',
  },
}

// ─── French ──────────────────────────────────────────────────────────
const fr: RutaTranslations = {
  nav: {
    services: 'Services',
    howItWorks: 'Comment ça Marche',
    security: 'Sécurité',
    contact: 'Contact',
    bookNow: 'Réserver',
    tagline: 'Transport Exécutif Sécurisé',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
  },
  hero: {
    titlePre: 'Transport ',
    titleAccent: 'Exécutif',
    titlePost: ' Sécurisé au Venezuela',
    subtitle: 'SUV de luxe discrets. Chauffeurs ex-militaires vérifiés. Réservation instantanée. De Maiquetia à Caracas, Margarita à Merida. Le service de transport exécutif conçu pour le Venezuela.',
    speakWithSomeone: 'Préférez-vous parler à quelqu\'un ?',
    whatsappOps: 'WhatsApp notre équipe',
  },
  badges: [
    { value: '24/7', label: 'Opérations', desc: 'Toujours disponible' },
    { value: 'GPS', label: 'Suivi en Direct', desc: 'Surveillance en temps réel' },
    { value: '100%', label: 'Vérifiés', desc: 'Chauffeurs ex-forces armées' },
  ],
  trustedBy: {
    heading: 'La confiance des départements voyages d\'entreprise et équipes dirigeantes',
    clients: ['Xiaomi', 'Sinopec', 'CNPC', 'Corps Diplomatique', 'Pétrole et Mines'],
  },
  services: {
    sectionTitle: 'Niveaux de Service',
    airport: {
      title: 'Transfert Aéroport',
      description: 'Transferts à tarif fixe entre les aéroports vénézuéliens et votre destination. Accueil à l\'arrivée. Discret, professionnel, ponctuel.',
      price: 'À partir de 280 $ USD',
      priceContext: 'CCS à Caracas, tout compris',
      specs: ['Aéroports CCS, PMV, MAR, BLA, VLN', 'Tarif fixe, sans surprises', 'Suivi des vols en cas de retard', 'Chauffeur ex-militaire + SUV de luxe'],
    },
    interCity: {
      title: 'Interurbain',
      description: 'Transport exécutif longue distance entre les villes vénézuéliennes. Des chauffeurs expérimentés qui connaissent chaque itinéraire. Confortable, suivi et fiable.',
      price: 'À partir de 12 $/km',
      priceContext: 'Plus tarif de base, distance calculée',
      specs: ['Toutes les routes principales', 'Chauffeurs avec connaissance approfondie', 'Surveillance des conditions en temps réel', 'Suivi GPS tout au long du trajet'],
    },
    intraCity: {
      title: 'Intra-Urbain',
      description: 'Déplacement exécutif en ville. À l\'heure ou point à point. Idéal pour les réunions, visites de sites et programmes exécutifs quotidiens.',
      price: 'À partir de 95 $/heure',
      priceContext: 'Ou tarif au trajet disponible',
      specs: ['Réservation à l\'heure ou au trajet', 'Itinéraires multi-arrêts', 'Chauffeur en attente entre les réunions', 'SUV de luxe confortable avec climatisation'],
    },
    bookPrefix: 'Réserver',
  },
  howItWorks: {
    sectionTitle: 'Comment ça Marche',
    steps: [
      { title: 'Réservez en Ligne', desc: 'Sélectionnez votre service, entrez votre itinéraire et obtenez un prix instantané. Pas d\'emails, pas de contrats.' },
      { title: 'Recevez les Détails du Chauffeur', desc: 'Nom, photo, description du véhicule et plaque d\'immatriculation. Envoyé par email et WhatsApp.' },
      { title: 'Rendez-vous au Point de Prise en Charge', desc: 'Votre chauffeur arrive dans un SUV de luxe discret. Professionnel, ponctuel, confortable.' },
      { title: 'Suivi en Temps Réel', desc: 'Suivi GPS en direct pendant tout votre trajet. Notre centre d\'opérations surveille chaque transfert actif.' },
    ],
  },
  security: {
    sectionLabel: 'Protocole de Sécurité',
    heading: 'Votre sécurité est opérationnelle, pas aspirationnelle',
    p1: 'Chaque chauffeur RUTA est un ancien militaire — vérifié, expérimenté et formé au transport exécutif. Chaque véhicule est un SUV discret et confortable maintenu aux plus hauts standards.',
    p2: 'Suivi GPS en direct et surveillance en temps réel par notre équipe d\'opérations. Des chauffeurs qui connaissent les routes et s\'adaptent quand les conditions changent. Ce n\'est pas un service de transport ordinaire. C\'est du transport exécutif.',
    features: [
      { title: 'Flotte de Luxe Discrète', description: 'SUV discrets avec intérieurs premium. Climatisation, eau, chargeurs. Confortables et discrets de l\'extérieur.' },
      { title: 'Chauffeurs Ex-Militaires', description: 'Anciens personnels PNB, GNB et FANB. Vérifiés, expérimentés et formés. Minimum 5 ans sur les routes vénézuéliennes.' },
      { title: 'Surveillance en Direct', description: 'Suivi GPS sur chaque véhicule. Notre équipe surveille tous les trajets actifs 24h/24.' },
      { title: 'Connaissance Locale des Routes', description: 'Des chauffeurs qui connaissent les routes, les conditions et le meilleur chemin. Ajustements en temps réel.' },
    ],
  },
  contactSection: {
    sectionLabel: 'Contact',
    heading: 'Parlez à notre ',
    headingAccent: 'équipe d\'opérations',
    description: 'Besoin d\'un devis personnalisé, d\'un arrangement multi-jours ou d\'une escorte armée ? Notre équipe répond en 30 minutes sur WhatsApp. Pour les contrats d\'entreprise, écrivez-nous directement.',
    ctaButton: 'WhatsApp Notre Équipe',
    ctaNote: 'Disponible 06h00-22h00 VET (UTC-4). Demandes urgentes hors horaires : appelez le bureau de Miami.',
    options: [
      { label: 'WhatsApp', sublabel: 'Réponse la plus rapide', note: 'Réponse typique : < 30 minutes' },
      { label: 'Email', sublabel: 'Équipe opérations', note: 'Réponse sous 2 heures ouvrées' },
      { label: 'Téléphone', sublabel: 'Bureau Miami', note: 'Lun-Ven 09h00-18h00 ET' },
    ],
  },
  booking: {
    title: 'Réservez Votre Transfert',
    tabs: { airport: 'Aéroport', interCity: 'Interurbain', intraCity: 'Intra-Urbain' },
    pickupAirport: 'Aéroport de Prise en Charge',
    pickupLocation: 'Lieu de Prise en Charge',
    destination: 'Destination',
    date: 'Date',
    time: 'Heure (VET, UTC-4)',
    passengers: 'Passagers',
    vehicle: 'Véhicule',
    selectDate: 'Choisir la date',
    selectTime: 'Choisir l\'heure',
    selectAirport: 'Choisir l\'aéroport...',
    getQuote: 'Obtenir un Devis',
    calculating: 'Calcul en cours...',
    yourQuote: 'Votre Devis',
    validFor: 'Valide 15 min',
    baseFare: 'Tarif de base',
    distance: 'Distance',
    timeCost: 'Temps',
    bookNowPrice: 'Réserver',
    confirmPay: 'Confirmer et Payer',
    processing: 'Traitement...',
    passengerDetails: 'Détails du Passager',
    fullName: 'Nom Complet *',
    email: 'Email *',
    phone: 'Téléphone *',
    paymentMethod: 'Mode de Paiement',
    creditCard: 'Carte de Crédit',
    zelle: 'Zelle',
    passengerCount: (n: number) => n === 1 ? '1 Passager' : `${n} Passagers`,
    vehicleSedan: 'Berline de Luxe',
    vehicleSuv: 'SUV de Luxe',
    vehicleVan: 'Van Exécutif',
    leadTimeAirport: 'Minimum 2 heures avant la prise en charge.',
    leadTimeInterCity: 'Minimum 4 heures avant la prise en charge.',
    leadTimeIntraCity: 'Minimum 1 heure avant la prise en charge.',
    needSooner: 'Plus tôt ? Appelez-nous.',
    fillIn: 'Veuillez remplir',
    quoteError: 'Impossible de calculer votre prix. Réessayez ou contactez-nous par WhatsApp.',
    fillPassenger: 'Veuillez remplir tous les détails du passager.',
    invalidEmail: 'Veuillez entrer un email valide.',
    somethingWrong: 'Une erreur est survenue. Veuillez réessayer.',
    manualQuote: 'Contactez notre équipe pour un devis manuel',
    placeholderCity: 'Ville (ex. Caracas, Valencia)',
    placeholderAddress: 'Adresse, hôtel ou point de repère',
    placeholderDestAirport: 'Hôtel, adresse ou point de repère',
    placeholderDestInterCity: 'Ville de destination (ex. Merida, Maracaibo)',
    noLocations: 'Aucun lieu trouvé. Essayez une adresse plus précise.',
  },
  footer: {
    compliance: 'RUTA Security Services LLC est une entité enregistrée en Floride opérant en conformité avec les exigences OFAC américaines et les réglementations vénézuéliennes. Paiements en USD. Pas de transactions en bolivars.',
    location: 'Miami, FL | Caracas, VZ',
    allTimes: 'Toutes les heures en VET (UTC-4).',
  },
}

// ─── German ──────────────────────────────────────────────────────────
const de: RutaTranslations = {
  nav: {
    services: 'Leistungen',
    howItWorks: 'So Funktioniert\'s',
    security: 'Sicherheit',
    contact: 'Kontakt',
    bookNow: 'Jetzt Buchen',
    tagline: 'Executive Sicherheitstransport',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
  },
  hero: {
    titlePre: 'Sicherer ',
    titleAccent: 'Executive',
    titlePost: '-Transport in Venezuela',
    subtitle: 'Diskrete Luxus-SUVs. Geprüfte Ex-Militär-Fahrer. Sofortige Buchung. Von Maiquetia nach Caracas, Margarita nach Merida. Der Executive-Transportdienst, der für Venezuela gemacht ist.',
    speakWithSomeone: 'Lieber mit jemandem sprechen?',
    whatsappOps: 'WhatsApp an unser Team',
  },
  badges: [
    { value: '24/7', label: 'Betrieb', desc: 'Immer verfügbar' },
    { value: 'GPS', label: 'Live-Tracking', desc: 'Echtzeitüberwachung' },
    { value: '100%', label: 'Geprüft', desc: 'Ex-Streitkräfte-Fahrer' },
  ],
  trustedBy: {
    heading: 'Das Vertrauen von Geschäftsreiseabteilungen und Führungsteams',
    clients: ['Xiaomi', 'Sinopec', 'CNPC', 'Diplomatisches Korps', 'Öl & Bergbau'],
  },
  services: {
    sectionTitle: 'Servicekategorien',
    airport: {
      title: 'Flughafentransfer',
      description: 'Festpreis-Transfers zwischen venezolanischen Flughäfen und Ihrem Ziel. Begrüßung bei Ankunft. Diskret, professionell, pünktlich.',
      price: 'Ab 280 $ USD',
      priceContext: 'CCS nach Caracas, alles inklusive',
      specs: ['Flughäfen CCS, PMV, MAR, BLA, VLN', 'Festpreise, keine Überraschungen', 'Flugverfolgung bei Verspätungen', 'Geprüfter Ex-Militär-Fahrer + Luxus-SUV'],
    },
    interCity: {
      title: 'Überlandfahrt',
      description: 'Executive-Langstreckentransport zwischen venezolanischen Städten. Erfahrene Fahrer, die jede Route kennen. Komfortabel, überwacht und zuverlässig.',
      price: 'Ab 12 $/km',
      priceContext: 'Plus Grundgebühr, Entfernung berechnet',
      specs: ['Alle wichtigen Stadtrouten', 'Fahrer mit tiefem Routenwissen', 'Echtzeit-Zustandsüberwachung', 'GPS-Tracking während der gesamten Fahrt'],
    },
    intraCity: {
      title: 'Innerstädtisch',
      description: 'Executive-Bewegung innerhalb der Stadtgrenzen. Stündlich oder Punkt-zu-Punkt. Ideal für Meetings, Besichtigungen und tägliche Zeitpläne.',
      price: 'Ab 95 $/Stunde',
      priceContext: 'Oder Einzelfahrtpreis verfügbar',
      specs: ['Buchung stündlich oder pro Fahrt', 'Multi-Stopp-Routen', 'Fahrer wartet zwischen Meetings', 'Komfortabler Luxus-SUV mit Klimaanlage'],
    },
    bookPrefix: 'Buchen',
  },
  howItWorks: {
    sectionTitle: 'So Funktioniert\'s',
    steps: [
      { title: 'Online Buchen', desc: 'Wählen Sie Ihren Service, geben Sie Ihre Route ein und erhalten Sie einen Sofortpreis. Keine E-Mails, keine Verträge.' },
      { title: 'Fahrerdaten Erhalten', desc: 'Name, Foto, Fahrzeugbeschreibung und Kennzeichen Ihres Fahrers. Per E-Mail und WhatsApp.' },
      { title: 'Treffpunkt', desc: 'Ihr Fahrer kommt in einem diskreten Luxus-SUV. Professionell, pünktlich, komfortabel.' },
      { title: 'Echtzeit-Tracking', desc: 'Live-GPS-Tracking während Ihrer gesamten Fahrt. Unsere Einsatzzentrale überwacht jeden aktiven Transfer.' },
    ],
  },
  security: {
    sectionLabel: 'Sicherheitsprotokoll',
    heading: 'Ihre Sicherheit ist operativ, nicht nur ein Versprechen',
    p1: 'Jeder RUTA-Fahrer ist ehemaliges Militär — geprüft, erfahren und für Executive-Transport ausgebildet. Jedes Fahrzeug ist ein diskreter, komfortabler SUV auf höchstem Standard.',
    p2: 'Live-GPS-Tracking und Echtzeitaufsicht durch unser Operations-Team. Fahrer, die die Straßen kennen und sich anpassen. Dies ist kein gewöhnlicher Fahrdienst. Dies ist Executive-Transport.',
    features: [
      { title: 'Diskrete Luxusflotte', description: 'Unauffällige SUVs mit Premium-Interieur. Klimaanlage, Wasser, Ladegeräte. Komfortabel und unauffällig.' },
      { title: 'Ex-Militär-Fahrer', description: 'Ehemalige PNB-, GNB- und FANB-Kräfte. Geprüft, erfahren und ausgebildet. Mindestens 5 Jahre auf venezolanischen Straßen.' },
      { title: 'Live-Überwachung', description: 'GPS-Tracking auf jedem Fahrzeug. Unser Team überwacht alle aktiven Fahrten rund um die Uhr.' },
      { title: 'Lokale Routenkenntnis', description: 'Fahrer, die die Straßen, die Bedingungen und den besten Weg kennen. Echtzeit-Anpassungen.' },
    ],
  },
  contactSection: {
    sectionLabel: 'Kontakt',
    heading: 'Sprechen Sie mit unserem ',
    headingAccent: 'Operations-Team',
    description: 'Brauchen Sie ein individuelles Angebot, eine mehrtägige Vereinbarung oder bewaffnete Eskorte? Unser Team antwortet in 30 Minuten auf WhatsApp. Für Firmenverträge schreiben Sie uns direkt.',
    ctaButton: 'WhatsApp an Unser Team',
    ctaNote: 'Verfügbar 06:00-22:00 VET (UTC-4). Dringende Anfragen außerhalb: Büro Miami anrufen.',
    options: [
      { label: 'WhatsApp', sublabel: 'Schnellste Antwort', note: 'Typische Antwort: < 30 Minuten' },
      { label: 'E-Mail', sublabel: 'Operations-Team', note: 'Antwort innerhalb 2 Geschäftsstunden' },
      { label: 'Telefon', sublabel: 'Büro Miami', note: 'Mo-Fr 09:00-18:00 ET' },
    ],
  },
  booking: {
    title: 'Transfer Buchen',
    tabs: { airport: 'Flughafen', interCity: 'Überland', intraCity: 'Innerstädtisch' },
    pickupAirport: 'Abholflughafen',
    pickupLocation: 'Abholort',
    destination: 'Ziel',
    date: 'Datum',
    time: 'Uhrzeit (VET, UTC-4)',
    passengers: 'Passagiere',
    vehicle: 'Fahrzeug',
    selectDate: 'Datum wählen',
    selectTime: 'Uhrzeit wählen',
    selectAirport: 'Flughafen wählen...',
    getQuote: 'Sofortangebot',
    calculating: 'Berechnung...',
    yourQuote: 'Ihr Angebot',
    validFor: 'Gültig für 15 Min.',
    baseFare: 'Grundgebühr',
    distance: 'Entfernung',
    timeCost: 'Zeit',
    bookNowPrice: 'Jetzt Buchen',
    confirmPay: 'Bestätigen & Bezahlen',
    processing: 'Verarbeitung...',
    passengerDetails: 'Passagierdaten',
    fullName: 'Vollständiger Name *',
    email: 'E-Mail *',
    phone: 'Telefon *',
    paymentMethod: 'Zahlungsmethode',
    creditCard: 'Kreditkarte',
    zelle: 'Zelle',
    passengerCount: (n: number) => n === 1 ? '1 Passagier' : `${n} Passagiere`,
    vehicleSedan: 'Luxuslimousine',
    vehicleSuv: 'Luxus-SUV',
    vehicleVan: 'Executive-Van',
    leadTimeAirport: 'Mindestens 2 Stunden vor Abholung.',
    leadTimeInterCity: 'Mindestens 4 Stunden vor Abholung.',
    leadTimeIntraCity: 'Mindestens 1 Stunde vor Abholung.',
    needSooner: 'Schneller nötig? Rufen Sie uns an.',
    fillIn: 'Bitte ausfüllen',
    quoteError: 'Preis konnte nicht berechnet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns per WhatsApp.',
    fillPassenger: 'Bitte alle Passagierdaten ausfüllen.',
    invalidEmail: 'Bitte geben Sie eine gültige E-Mail ein.',
    somethingWrong: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    manualQuote: 'Kontaktieren Sie unser Team für ein manuelles Angebot',
    placeholderCity: 'Stadt (z.B. Caracas, Valencia)',
    placeholderAddress: 'Adresse, Hotel oder Orientierungspunkt',
    placeholderDestAirport: 'Hotel, Adresse oder Orientierungspunkt',
    placeholderDestInterCity: 'Zielstadt (z.B. Merida, Maracaibo)',
    noLocations: 'Keine Orte gefunden. Versuchen Sie eine genauere Adresse.',
  },
  footer: {
    compliance: 'RUTA Security Services LLC ist ein in Florida registriertes Unternehmen in Übereinstimmung mit US-OFAC-Anforderungen und venezolanischen Vorschriften. Zahlungen in USD. Keine Bolívar-Transaktionen.',
    location: 'Miami, FL | Caracas, VZ',
    allTimes: 'Alle Zeiten in VET (UTC-4).',
  },
}

// ─── Portuguese ──────────────────────────────────────────────────────
const pt: RutaTranslations = {
  nav: {
    services: 'Serviços',
    howItWorks: 'Como Funciona',
    security: 'Segurança',
    contact: 'Contato',
    bookNow: 'Reservar',
    tagline: 'Transporte Executivo de Segurança',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
  },
  hero: {
    titlePre: 'Transporte ',
    titleAccent: 'Executivo',
    titlePost: ' Seguro na Venezuela',
    subtitle: 'SUVs de luxo discretos. Motoristas ex-militares verificados. Reserva instantânea. De Maiquetia a Caracas, Margarita a Merida. O serviço de transporte executivo feito para como a Venezuela realmente funciona.',
    speakWithSomeone: 'Prefere falar com alguém?',
    whatsappOps: 'WhatsApp para nossa equipe',
  },
  badges: [
    { value: '24/7', label: 'Operações', desc: 'Sempre disponível' },
    { value: 'GPS', label: 'Rastreamento ao Vivo', desc: 'Monitoramento em tempo real' },
    { value: '100%', label: 'Verificados', desc: 'Motoristas ex-forças armadas' },
  ],
  trustedBy: {
    heading: 'A confiança de departamentos de viagens corporativas e equipes executivas',
    clients: ['Xiaomi', 'Sinopec', 'CNPC', 'Corpo Diplomático', 'Petróleo e Mineração'],
  },
  services: {
    sectionTitle: 'Categorias de Serviço',
    airport: {
      title: 'Transfer Aeroporto',
      description: 'Transfers com tarifa fixa entre aeroportos venezuelanos e seu destino. Recepção na chegada. Discreto, profissional, pontual.',
      price: 'A partir de $280 USD',
      priceContext: 'CCS para Caracas, tudo incluído',
      specs: ['Aeroportos CCS, PMV, MAR, BLA, VLN', 'Preço fixo, sem surpresas', 'Rastreamento de voo para atrasos', 'Motorista ex-militar + SUV de luxo'],
    },
    interCity: {
      title: 'Interurbano',
      description: 'Transporte executivo de longa distância entre cidades venezuelanas. Motoristas experientes que conhecem cada rota. Confortável, rastreado e confiável.',
      price: 'A partir de $12/km',
      priceContext: 'Mais tarifa base, distância calculada',
      specs: ['Todas as rotas principais', 'Motoristas com conhecimento profundo', 'Monitoramento de condições em tempo real', 'Rastreamento GPS durante todo o trajeto'],
    },
    intraCity: {
      title: 'Urbano',
      description: 'Deslocamento executivo dentro da cidade. Por hora ou ponto a ponto. Ideal para reuniões, visitas e agendas executivas diárias.',
      price: 'A partir de $95/hora',
      priceContext: 'Ou tarifa por viagem disponível',
      specs: ['Reserva por hora ou por viagem', 'Itinerários com múltiplas paradas', 'Motorista em espera entre reuniões', 'SUV de luxo confortável com ar-condicionado'],
    },
    bookPrefix: 'Reservar',
  },
  howItWorks: {
    sectionTitle: 'Como Funciona',
    steps: [
      { title: 'Reserve Online', desc: 'Selecione seu serviço, insira sua rota e obtenha um preço instantâneo. Sem emails, sem contratos.' },
      { title: 'Receba Dados do Motorista', desc: 'Nome, foto, descrição do veículo e placa do seu motorista. Enviado por email e WhatsApp.' },
      { title: 'Encontro no Ponto', desc: 'Seu motorista chega em um SUV de luxo discreto. Profissional, pontual, confortável.' },
      { title: 'Rastreamento em Tempo Real', desc: 'Rastreamento GPS ao vivo durante todo o trajeto. Nosso centro de operações monitora cada transfer ativo.' },
    ],
  },
  security: {
    sectionLabel: 'Protocolo de Segurança',
    heading: 'Sua segurança é operacional, não aspiracional',
    p1: 'Cada motorista RUTA é ex-forças armadas — verificado, experiente e treinado para transporte executivo. Cada veículo é um SUV discreto e confortável mantido no mais alto padrão.',
    p2: 'Rastreamento GPS ao vivo e supervisão em tempo real da nossa equipe de operações. Motoristas que conhecem as estradas e se adaptam quando as condições mudam. Este não é um serviço de transporte comum. Isto é transporte executivo.',
    features: [
      { title: 'Frota de Luxo Discreta', description: 'SUVs discretos com interiores premium. Ar-condicionado, água, carregadores. Confortáveis e discretos por fora.' },
      { title: 'Motoristas Ex-Militares', description: 'Ex-pessoal PNB, GNB e FANB. Verificados, experientes e treinados. Mínimo 5 anos em estradas venezuelanas.' },
      { title: 'Monitoramento ao Vivo', description: 'Rastreamento GPS em cada veículo. Nossa equipe monitora todos os trajetos ativos 24 horas.' },
      { title: 'Conhecimento Local de Rotas', description: 'Motoristas que conhecem as estradas, as condições e o melhor caminho. Ajustes em tempo real.' },
    ],
  },
  contactSection: {
    sectionLabel: 'Contato',
    heading: 'Fale com nossa ',
    headingAccent: 'equipe de operações',
    description: 'Precisa de um orçamento personalizado, arranjo de vários dias ou escolta armada? Nossa equipe responde em 30 minutos no WhatsApp. Para contratos corporativos, escreva-nos diretamente.',
    ctaButton: 'WhatsApp Nossa Equipe',
    ctaNote: 'Disponível 06:00-22:00 VET (UTC-4). Solicitações urgentes fora do horário: ligue para o escritório de Miami.',
    options: [
      { label: 'WhatsApp', sublabel: 'Resposta mais rápida', note: 'Resposta típica: < 30 minutos' },
      { label: 'Email', sublabel: 'Equipe de operações', note: 'Resposta em 2 horas úteis' },
      { label: 'Telefone', sublabel: 'Escritório Miami', note: 'Seg-Sex 09:00-18:00 ET' },
    ],
  },
  booking: {
    title: 'Reserve Seu Transfer',
    tabs: { airport: 'Aeroporto', interCity: 'Interurbano', intraCity: 'Urbano' },
    pickupAirport: 'Aeroporto de Embarque',
    pickupLocation: 'Local de Embarque',
    destination: 'Destino',
    date: 'Data',
    time: 'Hora (VET, UTC-4)',
    passengers: 'Passageiros',
    vehicle: 'Veículo',
    selectDate: 'Selecionar data',
    selectTime: 'Selecionar hora',
    selectAirport: 'Selecionar aeroporto...',
    getQuote: 'Obter Cotação',
    calculating: 'Calculando...',
    yourQuote: 'Sua Cotação',
    validFor: 'Válida por 15 min',
    baseFare: 'Tarifa base',
    distance: 'Distância',
    timeCost: 'Tempo',
    bookNowPrice: 'Reservar Agora',
    confirmPay: 'Confirmar e Pagar',
    processing: 'Processando...',
    passengerDetails: 'Dados do Passageiro',
    fullName: 'Nome Completo *',
    email: 'Email *',
    phone: 'Telefone *',
    paymentMethod: 'Método de Pagamento',
    creditCard: 'Cartão de Crédito',
    zelle: 'Zelle',
    passengerCount: (n: number) => n === 1 ? '1 Passageiro' : `${n} Passageiros`,
    vehicleSedan: 'Sedã de Luxo',
    vehicleSuv: 'SUV de Luxo',
    vehicleVan: 'Van Executiva',
    leadTimeAirport: 'Mínimo 2 horas antes do embarque.',
    leadTimeInterCity: 'Mínimo 4 horas antes do embarque.',
    leadTimeIntraCity: 'Mínimo 1 hora antes do embarque.',
    needSooner: 'Precisa mais cedo? Ligue para nós.',
    fillIn: 'Por favor preencha',
    quoteError: 'Não foi possível calcular seu preço. Tente novamente ou entre em contato pelo WhatsApp.',
    fillPassenger: 'Por favor preencha todos os dados do passageiro.',
    invalidEmail: 'Por favor insira um email válido.',
    somethingWrong: 'Algo deu errado. Tente novamente.',
    manualQuote: 'Entre em contato com nossa equipe para um orçamento manual',
    placeholderCity: 'Cidade (ex. Caracas, Valencia)',
    placeholderAddress: 'Endereço, hotel ou ponto de referência',
    placeholderDestAirport: 'Hotel, endereço ou ponto de referência',
    placeholderDestInterCity: 'Cidade de destino (ex. Merida, Maracaibo)',
    noLocations: 'Nenhum local encontrado. Tente um endereço mais específico.',
  },
  footer: {
    compliance: 'RUTA Security Services LLC é uma entidade registrada na Flórida operando em conformidade com os requisitos OFAC dos EUA e regulamentações venezuelanas. Pagamentos em USD. Sem transações em bolívares.',
    location: 'Miami, FL | Caracas, VZ',
    allTimes: 'Todos os horários em VET (UTC-4).',
  },
}

// ─── Chinese (Simplified) ───────────────────────────────────────────
const zh: RutaTranslations = {
  nav: {
    services: '服务项目',
    howItWorks: '服务流程',
    security: '安全保障',
    contact: '联系我们',
    bookNow: '立即预订',
    tagline: '行政安全运输',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
  },
  hero: {
    titlePre: '委内瑞拉',
    titleAccent: '行政级',
    titlePost: '安全运输',
    subtitle: '低调豪华SUV。经过审查的退役军人驾驶员。即时预订。从迈克蒂亚到加拉加斯，玛格丽塔到梅里达。专为委内瑞拉实际情况打造的行政运输服务。',
    speakWithSomeone: '更希望与人沟通？',
    whatsappOps: 'WhatsApp联系我们的团队',
  },
  badges: [
    { value: '24/7', label: '全天运营', desc: '随时可用' },
    { value: 'GPS', label: '实时追踪', desc: '实时监控' },
    { value: '100%', label: '全员审查', desc: '退役军人驾驶员' },
  ],
  trustedBy: {
    heading: '深受企业差旅部门和高管团队信赖',
    clients: ['小米', '中石化', '中石油', '外交使团', '石油与矿业'],
  },
  services: {
    sectionTitle: '服务类别',
    airport: {
      title: '机场接送',
      description: '委内瑞拉各机场与您目的地之间的固定费率接送。到达大厅迎接。低调、专业、准时。',
      price: '起价 $280 美元',
      priceContext: 'CCS至加拉加斯，全包价',
      specs: ['CCS、PMV、MAR、BLA、VLN机场', '固定价格，无隐藏费用', '航班延误追踪', '审查过的退役军人驾驶员 + 豪华SUV'],
    },
    interCity: {
      title: '城际运输',
      description: '委内瑞拉城市间的长途行政运输。经验丰富的驾驶员熟悉每条路线。舒适、可追踪、可靠。',
      price: '起价 $12/公里',
      priceContext: '另加基础费用，按距离计算',
      specs: ['覆盖所有主要城市路线', '驾驶员具有深厚的路线知识', '实时路况监控', '全程GPS追踪'],
    },
    intraCity: {
      title: '市内运输',
      description: '城市范围内的行政级出行。按小时或点对点计费。适合会议、现场考察和日常行政安排。',
      price: '起价 $95/小时',
      priceContext: '也可按次计费',
      specs: ['按小时或按次预订', '多站点行程', '会议间隙驾驶员待命', '舒适豪华SUV，配备空调'],
    },
    bookPrefix: '预订',
  },
  howItWorks: {
    sectionTitle: '服务流程',
    steps: [
      { title: '在线预订', desc: '选择服务，输入路线，即时获取报价。无需邮件，无需合同。' },
      { title: '接收驾驶员信息', desc: '驾驶员姓名、照片、车辆描述和车牌号。通过邮件和WhatsApp发送。' },
      { title: '上车点会合', desc: '您的驾驶员驾驶低调豪华SUV到达。专业、准时、舒适。' },
      { title: '实时追踪', desc: '全程GPS实时追踪。我们的运营中心监控每一次活跃的接送服务。' },
    ],
  },
  security: {
    sectionLabel: '安全协议',
    heading: '您的安全是实际运作的，不是口号',
    p1: '每位RUTA驾驶员都是退役军人——经过审查、经验丰富、受过行政运输培训。每辆车都是保养到最高标准的低调舒适SUV。',
    p2: '实时GPS追踪和运营团队的实时监督。熟悉道路并能在情况变化时灵活应对的驾驶员。这不是普通的出行服务。这是行政级运输。',
    features: [
      { title: '低调豪华车队', description: '低调SUV，高端内饰。空调、饮用水、手机充电器。舒适且外观不引人注目。' },
      { title: '退役军人驾驶员', description: '前PNB、GNB和FANB人员。经过审查、经验丰富、专业培训。至少5年委内瑞拉驾驶经验。' },
      { title: '实时监控', description: '每辆车配备GPS追踪。我们的运营团队全天候监控所有活跃行程。' },
      { title: '本地路线知识', description: '熟悉道路、路况和最佳路线的驾驶员。实时调整应对变化。' },
    ],
  },
  contactSection: {
    sectionLabel: '联系我们',
    heading: '与我们的',
    headingAccent: '运营团队交谈',
    description: '需要定制报价、多日安排或武装护送？我们的团队在WhatsApp上30分钟内回复。企业合同和定期服务请直接发邮件。',
    ctaButton: 'WhatsApp联系我们的团队',
    ctaNote: '服务时间 06:00-22:00 VET (UTC-4)。紧急需求请致电迈阿密办公室。',
    options: [
      { label: 'WhatsApp', sublabel: '最快响应', note: '通常响应时间：< 30分钟' },
      { label: '邮件', sublabel: '运营团队', note: '2个工作小时内回复' },
      { label: '电话', sublabel: '迈阿密办公室', note: '周一至周五 09:00-18:00 ET' },
    ],
  },
  booking: {
    title: '预订您的接送服务',
    tabs: { airport: '机场', interCity: '城际', intraCity: '市内' },
    pickupAirport: '出发机场',
    pickupLocation: '上车地点',
    destination: '目的地',
    date: '日期',
    time: '时间 (VET, UTC-4)',
    passengers: '乘客',
    vehicle: '车辆',
    selectDate: '选择日期',
    selectTime: '选择时间',
    selectAirport: '选择机场...',
    getQuote: '获取即时报价',
    calculating: '计算中...',
    yourQuote: '您的报价',
    validFor: '有效期15分钟',
    baseFare: '基础费用',
    distance: '距离',
    timeCost: '时间',
    bookNowPrice: '立即预订',
    confirmPay: '确认并支付',
    processing: '处理中...',
    passengerDetails: '乘客信息',
    fullName: '全名 *',
    email: '邮箱 *',
    phone: '电话 *',
    paymentMethod: '支付方式',
    creditCard: '信用卡',
    zelle: 'Zelle',
    passengerCount: (n: number) => `${n}位乘客`,
    vehicleSedan: '豪华轿车',
    vehicleSuv: '豪华SUV',
    vehicleVan: '行政商务车',
    leadTimeAirport: '至少提前2小时预订。',
    leadTimeInterCity: '至少提前4小时预订。',
    leadTimeIntraCity: '至少提前1小时预订。',
    needSooner: '需要更快？请致电我们。',
    fillIn: '请填写',
    quoteError: '暂时无法计算价格。请重试或通过WhatsApp联系我们获取报价。',
    fillPassenger: '请填写所有乘客信息。',
    invalidEmail: '请输入有效的邮箱地址。',
    somethingWrong: '出现错误。请重试。',
    manualQuote: '联系我们的团队获取人工报价',
    placeholderCity: '城市名称（如加拉加斯、瓦伦西亚）',
    placeholderAddress: '地址、酒店或地标',
    placeholderDestAirport: '酒店、地址或地标',
    placeholderDestInterCity: '目的地城市（如梅里达、马拉开波）',
    noLocations: '未找到地点。请尝试更具体的地址或地标名称。',
  },
  footer: {
    compliance: 'RUTA Security Services LLC是一家在佛罗里达州注册的实体，遵守美国OFAC要求和适用的委内瑞拉法规运营。客户付款以美元处理。不进行玻利瓦尔交易。',
    location: '迈阿密, FL | 加拉加斯, VZ',
    allTimes: '所有时间均为VET (UTC-4)。',
  },
}

// ─── Italian ─────────────────────────────────────────────────────────
const it: RutaTranslations = {
  nav: {
    services: 'Servizi',
    howItWorks: 'Come Funziona',
    security: 'Sicurezza',
    contact: 'Contatti',
    bookNow: 'Prenota Ora',
    tagline: 'Trasporto Esecutivo di Sicurezza',
    openMenu: 'Apri menu',
    closeMenu: 'Chiudi menu',
  },
  hero: {
    titlePre: 'Trasporto ',
    titleAccent: 'Esecutivo',
    titlePost: ' Sicuro in Venezuela',
    subtitle: 'SUV di lusso discreti. Autisti ex-militari verificati. Prenotazione istantanea. Da Maiquetia a Caracas, Margarita a Merida. Il servizio di trasporto esecutivo progettato per il Venezuela.',
    speakWithSomeone: 'Preferisci parlare con qualcuno?',
    whatsappOps: 'WhatsApp al nostro team',
  },
  badges: [
    { value: '24/7', label: 'Operazioni', desc: 'Sempre disponibile' },
    { value: 'GPS', label: 'Tracciamento Live', desc: 'Monitoraggio in tempo reale' },
    { value: '100%', label: 'Verificati', desc: 'Autisti ex-forze armate' },
  ],
  trustedBy: {
    heading: 'La fiducia dei dipartimenti viaggi aziendali e dei team dirigenziali',
    clients: ['Xiaomi', 'Sinopec', 'CNPC', 'Corpo Diplomatico', 'Petrolio e Minerario'],
  },
  services: {
    sectionTitle: 'Livelli di Servizio',
    airport: {
      title: 'Transfer Aeroporto',
      description: 'Transfer a tariffa fissa tra aeroporti venezuelani e la vostra destinazione. Accoglienza agli arrivi. Discreto, professionale, puntuale.',
      price: 'Da $280 USD',
      priceContext: 'CCS a Caracas, tutto incluso',
      specs: ['Aeroporti CCS, PMV, MAR, BLA, VLN', 'Prezzo fisso, nessuna sorpresa', 'Tracciamento voli per ritardi', 'Autista ex-militare + SUV di lusso'],
    },
    interCity: {
      title: 'Interurbano',
      description: 'Trasporto esecutivo a lunga distanza tra città venezuelane. Autisti esperti che conoscono ogni percorso. Confortevole, tracciato e affidabile.',
      price: 'Da $12/km',
      priceContext: 'Più tariffa base, distanza calcolata',
      specs: ['Tutte le principali rotte', 'Autisti con profonda conoscenza', 'Monitoraggio condizioni in tempo reale', 'Tracciamento GPS per tutto il tragitto'],
    },
    intraCity: {
      title: 'Intra-Urbano',
      description: 'Spostamenti esecutivi entro i limiti della città. A ore o punto a punto. Ideale per riunioni, visite e agende esecutive giornaliere.',
      price: 'Da $95/ora',
      priceContext: 'O tariffa a corsa disponibile',
      specs: ['Prenotazione a ore o a corsa', 'Itinerari multi-fermata', 'Autista in attesa tra le riunioni', 'SUV di lusso confortevole con aria condizionata'],
    },
    bookPrefix: 'Prenota',
  },
  howItWorks: {
    sectionTitle: 'Come Funziona',
    steps: [
      { title: 'Prenota Online', desc: 'Seleziona il servizio, inserisci il percorso e ottieni un prezzo istantaneo. Niente email, niente contratti.' },
      { title: 'Ricevi i Dati dell\'Autista', desc: 'Nome, foto, descrizione del veicolo e targa del tuo autista. Inviato via email e WhatsApp.' },
      { title: 'Incontro al Punto di Ritiro', desc: 'Il tuo autista arriva in un SUV di lusso discreto. Professionale, puntuale, confortevole.' },
      { title: 'Tracciamento in Tempo Reale', desc: 'Tracciamento GPS live durante tutto il tragitto. Il nostro centro operativo monitora ogni transfer attivo.' },
    ],
  },
  security: {
    sectionLabel: 'Protocollo di Sicurezza',
    heading: 'La vostra sicurezza è operativa, non aspirazionale',
    p1: 'Ogni autista RUTA è un ex-militare — verificato, esperto e addestrato per il trasporto esecutivo. Ogni veicolo è un SUV discreto e confortevole mantenuto ai massimi standard.',
    p2: 'Tracciamento GPS live e supervisione in tempo reale dal nostro team operativo. Autisti che conoscono le strade e si adattano quando le condizioni cambiano. Non è un servizio di trasporto ordinario. È trasporto esecutivo.',
    features: [
      { title: 'Flotta di Lusso Discreta', description: 'SUV discreti con interni premium. Aria condizionata, acqua, caricatori. Confortevoli e discreti dall\'esterno.' },
      { title: 'Autisti Ex-Militari', description: 'Ex-personale PNB, GNB e FANB. Verificati, esperti e addestrati. Minimo 5 anni sulle strade venezuelane.' },
      { title: 'Monitoraggio Live', description: 'Tracciamento GPS su ogni veicolo. Il nostro team monitora tutti i viaggi attivi 24 ore su 24.' },
      { title: 'Conoscenza Locale dei Percorsi', description: 'Autisti che conoscono le strade, le condizioni e il modo migliore per arrivarci. Adattamenti in tempo reale.' },
    ],
  },
  contactSection: {
    sectionLabel: 'Contatti',
    heading: 'Parla con il nostro ',
    headingAccent: 'team operativo',
    description: 'Serve un preventivo personalizzato, un accordo di più giorni o una scorta armata? Il nostro team risponde in 30 minuti su WhatsApp. Per contratti aziendali, scrivici direttamente.',
    ctaButton: 'WhatsApp al Nostro Team',
    ctaNote: 'Disponibile 06:00-22:00 VET (UTC-4). Richieste urgenti fuori orario: chiamare l\'ufficio di Miami.',
    options: [
      { label: 'WhatsApp', sublabel: 'Risposta più rapida', note: 'Risposta tipica: < 30 minuti' },
      { label: 'Email', sublabel: 'Team operativo', note: 'Risposta entro 2 ore lavorative' },
      { label: 'Telefono', sublabel: 'Ufficio Miami', note: 'Lun-Ven 09:00-18:00 ET' },
    ],
  },
  booking: {
    title: 'Prenota il Tuo Transfer',
    tabs: { airport: 'Aeroporto', interCity: 'Interurbano', intraCity: 'Intra-Urbano' },
    pickupAirport: 'Aeroporto di Partenza',
    pickupLocation: 'Luogo di Ritiro',
    destination: 'Destinazione',
    date: 'Data',
    time: 'Ora (VET, UTC-4)',
    passengers: 'Passeggeri',
    vehicle: 'Veicolo',
    selectDate: 'Seleziona data',
    selectTime: 'Seleziona ora',
    selectAirport: 'Seleziona aeroporto...',
    getQuote: 'Preventivo Istantaneo',
    calculating: 'Calcolo in corso...',
    yourQuote: 'Il Tuo Preventivo',
    validFor: 'Valido per 15 min',
    baseFare: 'Tariffa base',
    distance: 'Distanza',
    timeCost: 'Tempo',
    bookNowPrice: 'Prenota Ora',
    confirmPay: 'Conferma e Paga',
    processing: 'Elaborazione...',
    passengerDetails: 'Dati del Passeggero',
    fullName: 'Nome Completo *',
    email: 'Email *',
    phone: 'Telefono *',
    paymentMethod: 'Metodo di Pagamento',
    creditCard: 'Carta di Credito',
    zelle: 'Zelle',
    passengerCount: (n: number) => n === 1 ? '1 Passeggero' : `${n} Passeggeri`,
    vehicleSedan: 'Berlina di Lusso',
    vehicleSuv: 'SUV di Lusso',
    vehicleVan: 'Van Esecutivo',
    leadTimeAirport: 'Minimo 2 ore prima del ritiro.',
    leadTimeInterCity: 'Minimo 4 ore prima del ritiro.',
    leadTimeIntraCity: 'Minimo 1 ora prima del ritiro.',
    needSooner: 'Serve prima? Chiamaci.',
    fillIn: 'Si prega di compilare',
    quoteError: 'Impossibile calcolare il prezzo. Riprova o contattaci su WhatsApp per un preventivo.',
    fillPassenger: 'Si prega di compilare tutti i dati del passeggero.',
    invalidEmail: 'Si prega di inserire un\'email valida.',
    somethingWrong: 'Qualcosa è andato storto. Riprova.',
    manualQuote: 'Contatta il nostro team per un preventivo manuale',
    placeholderCity: 'Città (es. Caracas, Valencia)',
    placeholderAddress: 'Indirizzo, hotel o punto di riferimento',
    placeholderDestAirport: 'Hotel, indirizzo o punto di riferimento',
    placeholderDestInterCity: 'Città di destinazione (es. Merida, Maracaibo)',
    noLocations: 'Nessun luogo trovato. Prova con un indirizzo più specifico.',
  },
  footer: {
    compliance: 'RUTA Security Services LLC è un\'entità registrata in Florida operante in conformità con i requisiti OFAC statunitensi e le normative venezuelane. Pagamenti in USD. Nessuna transazione in bolivar.',
    location: 'Miami, FL | Caracas, VZ',
    allTimes: 'Tutti gli orari in VET (UTC-4).',
  },
}

// ─── All translations ────────────────────────────────────────────────
const translations: Record<RutaLocale, RutaTranslations> = { en, es, fr, de, pt, zh, it }

// ─── Context ─────────────────────────────────────────────────────────
interface RutaI18nContextValue {
  locale: RutaLocale
  setLocale: (l: RutaLocale) => void
  t: RutaTranslations
}

const RutaI18nContext = createContext<RutaI18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: en,
})

export function RutaI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<RutaLocale>('en')

  useEffect(() => {
    const saved = localStorage.getItem('ruta_locale') as RutaLocale | null
    if (saved && translations[saved]) {
      setLocaleState(saved)
      document.documentElement.lang = saved
    }
  }, [])

  function setLocale(l: RutaLocale) {
    setLocaleState(l)
    localStorage.setItem('ruta_locale', l)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l
    }
  }

  return (
    <RutaI18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </RutaI18nContext.Provider>
  )
}

export function useRutaI18n() {
  return useContext(RutaI18nContext)
}
