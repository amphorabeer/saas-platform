'use client';

import { AlertTriangle, Package } from 'lucide-react';

export type IngredientRow = {
  id: string;
  name: string;
  nameEn?: string | null;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit: number | null;
  supplierId: string | null;
  expiryDate: string | null;
  isActive: boolean;
  isLowStock?: boolean;
  isExpired?: boolean;
};

export function IngredientTable({
  ingredients,
  sortBy,
  onSort,
  onEdit,
  onDelete,
  onStockOp,
}: {
  ingredients: IngredientRow[];
  sortBy: string;
  onSort: (key: string) => void;
  onEdit: (row: IngredientRow) => void;
  onDelete: (row: IngredientRow) => void;
  onStockOp: (row: IngredientRow) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1E293B]/50 backdrop-blur-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="p-3 font-medium text-slate-400">სტატუსი</th>
            <th
              className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
              onClick={() => onSort('name')}
            >
              სახელი {sortBy === 'name' && '▾'}
            </th>
            <th className="p-3 font-medium text-slate-400">ერთეული</th>
            <th
              className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
              onClick={() => onSort('currentStock')}
            >
              მარაგი {sortBy === 'currentStock' && '▾'}
            </th>
            <th className="p-3 font-medium text-slate-400">მინ.</th>
            <th
              className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
              onClick={() => onSort('costPerUnit')}
            >
              ფასი/ერთ. {sortBy === 'costPerUnit' && '▾'}
            </th>
            <th className="p-3 font-medium text-slate-400">მომწოდებელი</th>
            <th className="p-3 font-medium text-slate-400">ვადა</th>
            <th className="p-3 font-medium text-slate-400 w-24">მოქმედებები</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-white/5 hover:bg-white/5 ${
                row.isExpired ? 'bg-orange-500/10' : row.isLowStock ? 'bg-red-500/10' : ''
              }`}
            >
              <td className="p-3">
                {row.isExpired ? (
                  <span className="text-orange-400" title="ვადაგასული">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                ) : row.isLowStock ? (
                  <span className="text-red-400" title="დაბალი მარაგი">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="text-slate-600">
                    <Package className="h-4 w-4" />
                  </span>
                )}
              </td>
              <td className="p-3 font-medium text-white">{row.name}</td>
              <td className="p-3 text-slate-400">{row.unit}</td>
              <td className="p-3 text-slate-300">{row.currentStock}</td>
              <td className="p-3 text-slate-400">{row.minimumStock}</td>
              <td className="p-3 text-slate-300">
                {row.costPerUnit != null ? `₾${row.costPerUnit.toFixed(2)}` : '—'}
              </td>
              <td className="p-3 text-slate-400 truncate max-w-[120px]">{row.supplierId ?? '—'}</td>
              <td className="p-3 text-slate-400">{row.expiryDate ?? '—'}</td>
              <td className="p-3 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onStockOp(row)}
                  className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400 hover:bg-emerald-500/30"
                  title="სტოკის ოპერაცია"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  რედ.
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                >
                  წაშლა
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
