'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PurchasesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/finance/expenses');
  }, [router]);
  return (
    <div className="flex items-center justify-center p-12">
      <p className="text-slate-400">გადამისამართება...</p>
    </div>
  );
}
