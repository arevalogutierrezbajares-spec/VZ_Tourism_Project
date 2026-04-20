import { NextRequest, NextResponse } from 'next/server'

// Google Places Autocomplete + Place Details for coordinates
// Much better Venezuela coverage than Mapbox for hotels, landmarks, addresses

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const types = request.nextUrl.searchParams.get('types') || 'establishment'
  const country = request.nextUrl.searchParams.get('country') || 'VE'

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Places service not configured' }, { status: 503 })
  }

  try {
    // Step 1: Google Places Autocomplete
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&components=country:${country.toLowerCase()}&language=es&key=${apiKey}`

    const acRes = await fetch(autocompleteUrl, { next: { revalidate: 3600 } })
    if (!acRes.ok) {
      throw new Error(`Google Places Autocomplete error: ${acRes.status}`)
    }

    const acData = await acRes.json()

    if (acData.status !== 'OK' && acData.status !== 'ZERO_RESULTS') {
      console.error('Google Places error:', acData.status, acData.error_message)
      throw new Error(`Google Places API: ${acData.status}`)
    }

    if (!acData.predictions || acData.predictions.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Step 2: Get coordinates for each prediction via Place Details
    const results = await Promise.all(
      acData.predictions.slice(0, 5).map(async (prediction: {
        place_id: string
        description: string
        structured_formatting: {
          main_text: string
          secondary_text: string
        }
      }) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${apiKey}`
        const detRes = await fetch(detailsUrl, { next: { revalidate: 86400 } }) // cache 24h
        const detData = await detRes.json()

        const location = detData.result?.geometry?.location
        return {
          id: prediction.place_id,
          place_name: prediction.description,
          main_text: prediction.structured_formatting.main_text,
          secondary_text: prediction.structured_formatting.secondary_text,
          lat: location?.lat || 0,
          lng: location?.lng || 0,
          context: prediction.structured_formatting.secondary_text || '',
        }
      })
    )

    // Filter out any results with no coordinates
    const validResults = results.filter(r => r.lat !== 0 && r.lng !== 0)

    return NextResponse.json({ results: validResults })
  } catch (err) {
    console.error('Geocode error:', err)
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 503 })
  }
}
