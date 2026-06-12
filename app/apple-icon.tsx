import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 40%, #2a2520 0%, #211e1a 70%)',
          borderRadius: 40,
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M 90 15 L 52.5 157.5" stroke="#7c4fd4" strokeWidth="1" opacity="0.3" />
          <path d="M 90 15 L 127.5 157.5" stroke="#7c4fd4" strokeWidth="1" opacity="0.3" />
          <path d="M 30 48.75 L 165 48.75" stroke="#7c4fd4" strokeWidth="1" opacity="0.3" />
          <path d="M 15 112.5 L 90 48.75 L 165 112.5" stroke="#7c4fd4" strokeWidth="1" opacity="0.3" />
          <path
            d="M 90 15 L 150 48.75 L 165 112.5 L 127.5 157.5 L 52.5 157.5 L 15 112.5 L 30 48.75 Z"
            stroke="#7c4fd4"
            strokeWidth="2.5"
            fill="none"
          />
          <circle cx="90" cy="93.75" r="7" fill="#7c4fd4" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
