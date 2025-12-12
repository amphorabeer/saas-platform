import type { Metadata } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'

import './globals.css'

const notoSans = Noto_Sans_Georgian({ 
  subsets: ['georgian', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-georgian',
})

export const metadata: Metadata = {
  title: 'BrewMaster PRO - ლუდსახარშის მართვის სისტემა',
  description: 'Brewery Production Management System',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ka" className={notoSans.variable}>
      <body className={notoSans.className}>
        <div className="ambient-bg" />
        {children}
      </body>
    </html>
  )
}



