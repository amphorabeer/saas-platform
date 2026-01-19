import type { Metadata } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'
import { ToastContainer } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ThemeProvider, SessionProvider } from '@/components/providers'
import { TenantProvider } from '@/contexts/TenantContext'
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
      <body className={`${notoSans.className} dark`}>
        <SessionProvider>
          <TenantProvider>
            <ThemeProvider>
              <ErrorBoundary>
                <div className="ambient-bg" />
                {children}
                <ToastContainer />
                <ConfirmDialog />
              </ErrorBoundary>
            </ThemeProvider>
          </TenantProvider>
        </SessionProvider>
      </body>
    </html>
  )
}



