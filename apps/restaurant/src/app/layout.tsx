import type { Metadata } from 'next';
import { Noto_Sans_Georgian } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import './globals.css';

const notoSans = Noto_Sans_Georgian({
  subsets: ['georgian', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-georgian',
});

export const metadata: Metadata = {
  title: 'RestoPOS — რესტორნის მართვის სისტემა',
  description: 'რესტორნის POS და მართვის სისტემა',
  icons: { icon: '/favicon.ico' },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ka" className={notoSans.variable}>
      <body className={`${notoSans.className} dark`}>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
