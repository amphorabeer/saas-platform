'use client';

import { Trash2 } from 'lucide-react';

export const UNITS = [
  { value: 'g', label: 'გრ', toBase: 0.001, baseUnit: 'kg' as const },
  { value: 'kg', label: 'კგ', toBase: 1, baseUnit: 'kg' as const },
  { value: 'ml', label: 'მლ', toBase: 0.001, baseUnit: 'l' as const },
  { value: 'l', label: 'ლ', toBase: 1, baseUnit: 'l' as const },
  { value: 'pcs', label: 'ცალი', toBase: 1, baseUnit: 'pcs' as const },
];

const UNIT_TO_BASE: Record<string, number> = {
  g: 0.001,
  გ: 0.001,
  kg: 1,
  კგ: 1,
  ml: 0.001,
  მლ: 0.001,
  l: 1,
  ლ: 1,
  pcs: 1,
  ცალი: 1,
};

export function getToBase(unit: string): number {
  const u = (unit || '').toLowerCase().trim();
  return UNIT_TO_BASE[u] ?? UNIT_TO_BASE[unit] ?? 1;
}

/** Convert display quantity + displayUnit to quantity in ingredient's unit (for cost & API). */
export function toIngredientUnitQuantity(
  quantityDisplay: number,
  displayUnit: string,
  ingredientUnit: string
): number {
  const inBase = quantityDisplay * getToBase(displayUnit);
  const ingBase = getToBase(ingredientUnit);
  if (ingBase === 0) return inBase;
  return inBase / ingBase;
}

export function RecipeIngredientLine({
  ingredientName,
  quantity,
  displayUnit,
  unitOptions,
  cost,
  onQuantityChange,
  onUnitChange,
  onRemove,
}: {
  ingredientName: string;
  quantity: number;
  displayUnit: string;
  unitOptions: { value: string; label: string }[];
  cost: number;
  onQuantityChange: (qty: number) => void;
  onUnitChange: (unit: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm text-white">{ingredientName}</span>
      <input
        type="number"
        min={0}
        step="any"
        value={quantity || ''}
        onChange={(e) => onQuantityChange(Number(e.target.value) || 0)}
        className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-right text-sm text-white"
      />
      <select
        value={displayUnit}
        onChange={(e) => onUnitChange(e.target.value)}
        className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
      >
        {unitOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="text-sm font-medium text-emerald-400">₾{cost.toFixed(2)}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
          aria-label="წაშლა"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
