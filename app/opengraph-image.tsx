import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Vamos A Venezuela'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#1a1a2e',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#D4A855',
        fontSize: 72,
        fontWeight: 'bold',
      }}
    >
      Vamos A Venezuela
    </div>
  )
}
