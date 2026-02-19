'use client';

import { motion } from 'framer-motion';

export type SupplierRow = {
  supplierId: string;
  ingredientsCount: number;
  ingredients: Array<{
    id: string;
    name: string;
    currentStock: number;
    costPerUnit: number | null;
  }>;
  totalValue: number;
};

export function SupplierList({ suppliers }: { suppliers: SupplierRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {suppliers.map((s, i) => (
        <motion.div
          key={s.supplierId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-white/10 bg-[#1E293B]/80 p-4 backdrop-blur-sm"
        >
          <h3 className="font-semibold text-white">{s.supplierId}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {s.ingredientsCount} ინგრედიენტი · ჯამური ღირებულება: ₾{s.totalValue.toFixed(2)}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {s.ingredients.slice(0, 5).map((ing) => (
              <li key={ing.id} className="flex justify-between gap-2">
                <span className="truncate">{ing.name}</span>
                <span>მარაგი: {ing.currentStock}</span>
              </li>
            ))}
            {s.ingredients.length > 5 && (
              <li className="text-slate-600">+{s.ingredients.length - 5} სხვა</li>
            )}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}
