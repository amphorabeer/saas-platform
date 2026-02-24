import type { Metadata } from 'next';
import { Noto_Sans_Georgian } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

const font = Noto_Sans_Georgian({
  subsets: ['georgian', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'BeautySalon PRO — სილამაზის სალონის მართვა',
  description: 'სილამაზის სალონის მართვის სისტემა — ჯავშნები, სერვისები, კლიენტები, POS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ka" className="dark" suppressHydrationWarning>
      <body className={font.className} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
