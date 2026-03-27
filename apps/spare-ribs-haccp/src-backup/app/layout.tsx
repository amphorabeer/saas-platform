// src/app/layout.tsx
import type { Metadata } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'
import './globals.css'

const geo = Noto_Sans_Georgian({
  subsets: ['georgian'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-geo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Spare Ribs HACCP',
  description: 'ღ. ნ. HACCP მართვა / Pork Ribs HACCP Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <body className={`${geo.variable} font-geo antialiased`}>
        {children}
      </body>
    </html>
  )
}
