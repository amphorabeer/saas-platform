import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AIAssistantClient } from './AIAssistantClient';

export default async function AIAssistantPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  return <AIAssistantClient />;
}
