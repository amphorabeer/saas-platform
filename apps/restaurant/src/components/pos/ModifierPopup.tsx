'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { usePOSStore, type CartItem, type CartItemModifier } from '@/stores/posStore';
import type { MenuItemPOS } from './MenuItemPOSCard';

type ModifierGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: { id: string; name: string; priceAdjustment: number }[];
};

export function ModifierPopup({
  open,
  onClose,
  item,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  item: MenuItemPOS | null;
  onAdded: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selections, setSelections] = useState<Record<string, string[]>>({}); // groupId -> modifier ids
  const addItem = usePOSStore((s) => s.addItem);

  const canAdd = useMemo(() => {
    if (!item) return false;
    for (const g of item.modifierGroups) {
      if (g.isRequired) {
        const sel = selections[g.id] ?? [];
        if (sel.length < g.minSelect) return false;
      }
    }
    return true;
  }, [item, selections]);

  const totalPrice = useMemo(() => {
    if (!item) return 0;
    let sum = item.price;
    for (const g of item.modifierGroups) {
      const sel = selections[g.id] ?? [];
      for (const modId of sel) {
        const mod = g.modifiers.find((m) => m.id === modId);
        if (mod) sum += mod.priceAdjustment;
      }
    }
    return sum * quantity;
  }, [item, selections, quantity]);

  const unitPrice = totalPrice / quantity;

  const toggleModifier = (groupId: string, modifierId: string, maxSelect: number) => {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      const idx = current.indexOf(modifierId);
      let next: string[];
      if (idx >= 0) {
        next = current.filter((id) => id !== modifierId);
      } else {
        if (current.length >= maxSelect) next = [...current.slice(1), modifierId];
        else next = [...current, modifierId];
      }
      return { ...prev, [groupId]: next };
    });
  };

  const handleAdd = () => {
    if (!item || !canAdd) return;
    const modifiers: CartItemModifier[] = [];
    for (const g of item.modifierGroups) {
      const sel = selections[g.id] ?? [];
      for (const modId of sel) {
        const mod = g.modifiers.find((m) => m.id === modId);
        if (mod) modifiers.push({ name: mod.name, price: mod.priceAdjustment });
      }
    }
    const cartItem: CartItem = {
      menuItemId: item.id,
      menuItemName: item.name,
      quantity,
      unitPrice,
      totalPrice,
      modifiers,
      specialInstructions: specialInstructions.trim(),
      kdsStation: item.kdsStation || 'HOT',
    };
    addItem(cartItem);
    onAdded();
    onClose();
    setQuantity(1);
    setSpecialInstructions('');
    setSelections({});
  };

  if (!item) return null;

  return (
    <Modal open={open} onClose={onClose} title={item.name} maxWidth="md">
      <div className="space-y-4">
        <p className="text-orange-400 font-semibold">₾{(totalPrice / quantity).toFixed(2)} (ერთეული)</p>

        {item.modifierGroups.map((g: ModifierGroup) => (
          <div key={g.id} className="rounded-lg border border-white/10 p-3">
            <p className="text-sm font-medium text-white mb-2">
              {g.name}
              {g.isRequired && <span className="text-orange-400 ml-1">*</span>}
              <span className="text-slate-500 text-xs ml-1">აირჩიე {g.minSelect}-{g.maxSelect}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {g.modifiers.map((m) => {
                const selected = (selections[g.id] ?? []).includes(m.id);
                const isRadio = g.maxSelect === 1;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModifier(g.id, m.id, g.maxSelect)}
                    className={`rounded-lg border px-3 py-2 text-sm transition touch-manipulation ${
                      selected
                        ? 'border-orange-500 bg-orange-500/20 text-orange-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {m.name}
                    {m.priceAdjustment !== 0 && (
                      <span className="ml-1 text-xs">+₾{m.priceAdjustment.toFixed(2)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <label className="block text-sm text-slate-400 mb-1">სპეციალური მითითებები</label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="გლუტენის გარეშე, ცხარე..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white touch-manipulation"
            >
              −
            </button>
            <span className="min-w-[2rem] text-center font-medium text-white">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white touch-manipulation"
            >
              +
            </button>
          </div>
          <div className="text-lg font-semibold text-white">სულ: ₾{totalPrice.toFixed(2)}</div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation"
        >
          დამატება
        </button>
      </div>
    </Modal>
  );
}
