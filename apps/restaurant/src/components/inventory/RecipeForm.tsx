'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FoodCostBadge } from './FoodCostBadge';
import {
  RecipeIngredientLine,
  UNITS,
  toIngredientUnitQuantity,
} from './RecipeIngredientLine';

export type RecipeIngredientLineData = {
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  costPerUnit: number | null;
  quantityDisplay: number;
  displayUnit: string;
};

export type RecipeFormData = {
  menuItemId: string;
  yield: number;
  notes: string;
  ingredients: { ingredientId: string; quantity: number }[];
};

type MenuItemOption = { id: string; name: string; price: number; categoryName: string };
type IngredientOption = { id: string; name: string; unit: string; costPerUnit: number | null };

const UNIT_VALUE_MAP: Record<string, string> = {
  კგ: 'kg',
  გ: 'g',
  ლ: 'l',
  მლ: 'ml',
  ცალი: 'pcs',
  kg: 'kg',
  g: 'g',
  l: 'l',
  ml: 'ml',
  pcs: 'pcs',
};

function normalizeUnitForDisplay(unit: string): string {
  const u = (unit || 'pcs').trim();
  return UNIT_VALUE_MAP[u] ?? UNIT_VALUE_MAP[u.toLowerCase()] ?? 'pcs';
}

export function RecipeForm({
  open,
  onClose,
  initial,
  menuItems,
  ingredients,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<RecipeFormData> & { id?: string; ingredients?: RecipeIngredientLineData[] };
  menuItems: MenuItemOption[];
  ingredients: IngredientOption[];
  onSave: (data: RecipeFormData) => Promise<void>;
}) {
  const [menuItemId, setMenuItemId] = useState(initial?.menuItemId ?? '');
  const [yieldVal, setYieldVal] = useState(initial?.yield ?? 1);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [lines, setLines] = useState<RecipeIngredientLineData[]>(initial?.ingredients ?? []);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addUnit, setAddUnit] = useState('g');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMenuItemId(initial?.menuItemId ?? '');
      setYieldVal(initial?.yield ?? 1);
      setNotes(initial?.notes ?? '');
      const raw = initial?.ingredients ?? [];
      setLines(
        raw.map((ing: Partial<RecipeIngredientLineData> & { quantity?: number; unit?: string }) => ({
          ingredientId: ing.ingredientId ?? '',
          ingredientName: ing.ingredientName ?? '',
          ingredientUnit: ing.ingredientUnit ?? ing.unit ?? 'pcs',
          costPerUnit: ing.costPerUnit ?? null,
          quantityDisplay: ing.quantityDisplay ?? ing.quantity ?? 0,
          displayUnit: ing.displayUnit ?? normalizeUnitForDisplay(ing.ingredientUnit ?? ing.unit ?? 'pcs'),
        }))
      );
      setError('');
    }
  }, [open, initial]);

  const selectedMenuItem = menuItems.find((m) => m.id === menuItemId);
  const price = selectedMenuItem?.price ?? 0;

  const costPer1Portion = lines.reduce((sum, l) => {
    const qtyInIngUnit = toIngredientUnitQuantity(
      l.quantityDisplay,
      l.displayUnit,
      l.ingredientUnit
    );
    return sum + (l.costPerUnit ?? 0) * qtyInIngUnit;
  }, 0);

  const foodCostPercent = price > 0 ? (costPer1Portion / price) * 100 : 0;
  const totalForYield = costPer1Portion * yieldVal;

  const filteredIngredients = ingredients.filter(
    (i) =>
      !lines.some((l) => l.ingredientId === i.id) &&
      (ingredientSearch === '' || i.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
  );

  const addIngredient = (ing: IngredientOption, qty: number, displayUnit: string) => {
    if (qty < 0) return;
    setLines((prev) => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientName: ing.name,
        ingredientUnit: ing.unit,
        costPerUnit: ing.costPerUnit,
        quantityDisplay: qty,
        displayUnit: displayUnit || normalizeUnitForDisplay(ing.unit),
      },
    ]);
    setIngredientSearch('');
    setAddQty('1');
    setAddUnit('g');
  };

  const updateLine = (index: number, updates: Partial<RecipeIngredientLineData>) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates } : l))
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!menuItemId) {
      setError('კერძის არჩევა აუცილებელია');
      return;
    }
    if (lines.length === 0) {
      setError('მინიმუმ ერთი ინგრედიენტი დაუმატე');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        menuItemId,
        yield: yieldVal,
        notes,
        ingredients: lines.map((l) => ({
          ingredientId: l.ingredientId,
          quantity: toIngredientUnitQuantity(
            l.quantityDisplay,
            l.displayUnit,
            l.ingredientUnit
          ),
        })),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'რეცეპტის რედაქტირება' : 'ახალი რეცეპტი'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div>
          <label className="mb-1 block text-sm text-slate-400">კერძი *</label>
          <select
            value={menuItemId}
            onChange={(e) => setMenuItemId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            required
            disabled={!!initial?.menuItemId}
          >
            <option value="">— აირჩიე —</option>
            {menuItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — ₾{m.price.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">
            ინგრედიენტები (1 პორციისთვის)
          </label>
          <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
            {lines.map((line, i) => {
              const lineCost =
                (line.costPerUnit ?? 0) *
                toIngredientUnitQuantity(
                  line.quantityDisplay,
                  line.displayUnit,
                  line.ingredientUnit
                );
              return (
                <RecipeIngredientLine
                  key={`${line.ingredientId}-${i}`}
                  ingredientName={line.ingredientName}
                  quantity={line.quantityDisplay}
                  displayUnit={line.displayUnit}
                  unitOptions={UNITS.map((u) => ({ value: u.value, label: u.label }))}
                  cost={lineCost}
                  onQuantityChange={(qty) => updateLine(i, { quantityDisplay: qty })}
                  onUnitChange={(unit) => updateLine(i, { displayUnit: unit })}
                  onRemove={() => removeLine(i)}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const ing = ingredients.find((i) => i.id === id);
                if (ing) addIngredient(ing, Number(addQty) || 0, addUnit);
                e.target.value = '';
              }}
              className="min-w-[200px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="">➕ ინგრედიენტის დამატება</option>
              {filteredIngredients.slice(0, 50).map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({ing.unit})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step="any"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              placeholder="რაოდენობა"
              className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white"
            />
            <select
              value={addUnit}
              onChange={(e) => setAddUnit(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">პორციების რაოდენობა</label>
          <input
            type="number"
            min={0.001}
            step="any"
            value={yieldVal}
            onChange={(e) => setYieldVal(Number(e.target.value) || 1)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">1 პორციის ღირებულება:</span>
            <span className="text-white font-medium">₾{costPer1Portion.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">კერძის ფასი:</span>
            <span className="text-white">₾{price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Food Cost:</span>
            <FoodCostBadge percent={foodCostPercent} />
          </div>
          <div className="pt-2 mt-2 border-t border-white/10 text-sm text-slate-400">
            {yieldVal} პორცია = ₾{totalForYield.toFixed(2)} ინგრედიენტი
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">შენიშვნა</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-slate-300 hover:bg-white/5"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
