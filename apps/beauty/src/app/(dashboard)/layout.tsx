import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import dynamic from 'next/dynamic';

const DashboardShell = dynamic(
  () => import('@/components/layout/DashboardShell').then((m) => m.DashboardShell),
  { ssr: false }
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
