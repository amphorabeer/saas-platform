import type { Metadata } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const geo = Noto_Sans_Georgian({
  subsets: ['georgian'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-geo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Spare Ribs HACCP',
  description: 'ღ. ნ. HACCP მართვის სისტემა',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <body className={`${geo.variable} font-geo antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
