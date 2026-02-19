'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupplierList, type SupplierRow } from '@/components/purchases/SupplierList';

type TabId = 'suppliers' | 'orders';

export default function PurchasesPage() {
  const [tab, setTab] = useState<TabId>('suppliers');
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

  const fetchSuppliers = useCallback(async () => {
    const res = await fetch('/api/purchases/suppliers');
    if (!res.ok) return;
    const data = await res.json();
    setSuppliers(data);
  }, []);

  useEffect(() => {
    if (tab === 'suppliers') fetchSuppliers();
  }, [tab, fetchSuppliers]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'suppliers', label: 'მომწოდებლები' },
    { id: 'orders', label: 'შეკვეთები' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-white">მომწოდებლები / შესყიდვები</h1>

      <div className="flex gap-2 border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'suppliers' && (
          <motion.div
            key="suppliers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <p className="text-sm text-slate-400">
              მომწოდებლების სია ჩამოყალიბებულია ინგრედიენტების supplierId ველიდან (უნიკალური მნიშვნელობები).
            </p>
            <SupplierList suppliers={suppliers} />
          </motion.div>
        )}

        {tab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-8 text-center text-slate-400"
          >
            შეკვეთების მოდული — ფაზა 8+
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
