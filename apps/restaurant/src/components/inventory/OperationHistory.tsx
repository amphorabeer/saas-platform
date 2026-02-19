'use client';

import { OperationTypeBadge } from './OperationTypeBadge';

export type OperationRow = {
  id: string;
  ingredientId: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  reference: string | null;
  notes: string | null;
  performedBy: string | null;
  createdAt: string;
  ingredient: { id: string; name: string; unit: string };
};

export function OperationHistory({
  items,
  page,
  totalPages,
  total,
  onPageChange,
}: {
  items: OperationRow[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1E293B]/50 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-3 font-medium text-slate-400">თარიღი</th>
              <th className="p-3 font-medium text-slate-400">ინგრედიენტი</th>
              <th className="p-3 font-medium text-slate-400">ტიპი</th>
              <th className="p-3 font-medium text-slate-400">რაოდენობა</th>
              <th className="p-3 font-medium text-slate-400">ფასი/ერთ.</th>
              <th className="p-3 font-medium text-slate-400">reference</th>
              <th className="p-3 font-medium text-slate-400">შენიშვნა</th>
              <th className="p-3 font-medium text-slate-400">შემსრულებელი</th>
            </tr>
          </thead>
          <tbody>
            {items.map((op) => (
              <tr key={op.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3 text-slate-400">
                  {new Date(op.createdAt).toLocaleString('ka-GE')}
                </td>
                <td className="p-3 font-medium text-white">{op.ingredient.name}</td>
                <td className="p-3">
                  <OperationTypeBadge type={op.type} />
                </td>
                <td className={`p-3 ${op.quantity >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {op.quantity >= 0 ? '+' : ''}{op.quantity} {op.ingredient.unit}
                </td>
                <td className="p-3 text-slate-400">
                  {op.unitCost != null ? `₾${op.unitCost.toFixed(2)}` : '—'}
                </td>
                <td className="p-3 text-slate-400 truncate max-w-[100px]">{op.reference ?? '—'}</td>
                <td className="p-3 text-slate-400 truncate max-w-[120px]">{op.notes ?? '—'}</td>
                <td className="p-3 text-slate-500 text-xs">{op.performedBy ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>სულ: {total} ჩანაწერი</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-50 hover:bg-white/5"
          >
            წინა
          </button>
          <span className="px-2 py-1">
            {page} / {totalPages || 1}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-50 hover:bg-white/5"
          >
            შემდეგი
          </button>
        </div>
      </div>
    </div>
  );
}
