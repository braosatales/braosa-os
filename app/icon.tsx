import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#211e1a',
          borderRadius: 7,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M 16 2.5 L 9.5 27.5" stroke="#7c4fd4" strokeWidth="0.6" opacity="0.3" />
          <path d="M 16 2.5 L 22.5 27.5" stroke="#7c4fd4" strokeWidth="0.6" opacity="0.3" />
          <path d="M 5.5 8.5 L 29 8.5" stroke="#7c4fd4" strokeWidth="0.6" opacity="0.3" />
          <path d="M 3 19.5 L 16 8.5 L 29 19.5" stroke="#7c4fd4" strokeWidth="0.6" opacity="0.3" />
          <path
            d="M 16 2.5 L 26.5 8.5 L 29 19.5 L 22.5 27.5 L 9.5 27.5 L 3 19.5 L 5.5 8.5 Z"
            stroke="#7c4fd4"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="16" cy="16" r="2.2" fill="#7c4fd4" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
