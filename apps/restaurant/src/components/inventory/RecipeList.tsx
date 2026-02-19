'use client';

import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FoodCostBadge } from './FoodCostBadge';

export type RecipeRow = {
  id: string;
  menuItemId: string;
  yield: number;
  notes: string | null;
  menuItem: { id: string; name: string; price: number; category: { id: string; name: string } } | null;
  ingredientsCount: number;
  foodCost: number;
  foodCostPercent: number;
  totalCost: number;
  ingredients: Array<{
    id: string;
    ingredientId?: string;
    ingredientName: string;
    unit: string;
    quantity: number;
    costPerUnit: number | null;
    cost: number;
  }>;
};

export function RecipeList({
  recipes,
  itemsWithoutRecipe,
  onSelect,
  onAddRecipe,
  onEdit,
  onDelete,
}: {
  recipes: RecipeRow[];
  itemsWithoutRecipe: Array<{ id: string; name: string; categoryName: string }>;
  onSelect?: (recipe: RecipeRow) => void;
  onAddRecipe?: (menuItemId: string) => void;
  onEdit: (recipe: RecipeRow) => void;
  onDelete: (recipe: RecipeRow) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1E293B]/50 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="w-8 p-3"></th>
              <th className="p-3 font-medium text-slate-400">კერძი</th>
              <th className="p-3 font-medium text-slate-400">კატეგორია</th>
              <th className="p-3 font-medium text-slate-400">Yield</th>
              <th className="p-3 font-medium text-slate-400">ინგრ.</th>
              <th className="p-3 font-medium text-slate-400">Food cost (₾)</th>
              <th className="p-3 font-medium text-slate-400">%</th>
              <th className="p-3 font-medium text-slate-400 w-32">მოქმედებები</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="p-1 text-slate-400"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="p-3 font-medium text-white">
                      {r.menuItem?.name ?? '—'}
                    </td>
                    <td className="p-3 text-slate-400">{r.menuItem?.category?.name ?? '—'}</td>
                    <td className="p-3 text-slate-300">{r.yield}</td>
                    <td className="p-3 text-slate-300">{r.ingredientsCount}</td>
                    <td className="p-3 text-emerald-400">₾{r.foodCost.toFixed(2)}</td>
                    <td className="p-3">
                      <FoodCostBadge percent={r.foodCostPercent} />
                    </td>
                    <td className="p-3 flex gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(r)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        რედ.
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(r)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                      >
                        წაშლა
                      </button>
                    </td>
                  </tr>
                  {isExpanded && r.ingredients.length > 0 && (
                    <tr className="bg-white/5">
                      <td colSpan={8} className="p-3">
                        <div className="space-y-1 pl-6 text-xs text-slate-400">
                          {r.ingredients.map((ri) => (
                            <div key={ri.id} className="flex justify-between gap-4">
                              <span>{ri.ingredientName} — {ri.quantity} {ri.unit}</span>
                              <span className="text-emerald-400">₾{ri.cost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {itemsWithoutRecipe.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-400">კერძები რეცეპტის გარეშე</p>
          <ul className="space-y-1">
            {itemsWithoutRecipe.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4">
                <span className="text-white">{item.name}</span>
                <span className="text-slate-500 text-sm">{item.categoryName}</span>
                {onAddRecipe && (
                  <button
                    type="button"
                    onClick={() => onAddRecipe(item.id)}
                    className="rounded-lg bg-orange-500/20 px-3 py-1 text-sm text-orange-300 hover:bg-orange-500/30"
                  >
                    რეცეპტის დამატება
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
