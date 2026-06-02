import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Braosa OS',
  description: 'Personal life operating system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-[#0D0D0F]">{children}</body>
    </html>
  )
}
