import type { Metadata } from 'next'
import { Outfit, DM_Sans, Space_Mono } from 'next/font/google'
import './globals.css'
import ClientLayout from './client-layout'
import { UserProvider } from '@/lib/UserContext'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-display',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Braosa OS',
  description: 'Personal life operating system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${outfit.variable} ${dmSans.variable} ${spaceMono.variable}`}>
      <body>
        <UserProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </UserProvider>
      </body>
    </html>
  )
}
