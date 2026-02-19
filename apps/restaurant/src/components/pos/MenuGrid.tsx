'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { MenuItemPOSCard, type MenuItemPOS } from './MenuItemPOSCard';
import { ModifierPopup } from './ModifierPopup';
import { usePOSStore } from '@/stores/posStore';
import { toast } from 'sonner';

export type MenuCategory = {
  id: string;
  name: string;
  icon: string | null;
  items: MenuItemPOS[];
};

export function MenuGrid({
  categories,
  loading,
}: {
  categories: MenuCategory[];
  loading: boolean;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modifierItem, setModifierItem] = useState<MenuItemPOS | null>(null);
  const addItem = usePOSStore((s) => s.addItem);

  const flatItems = useMemo(() => {
    const list: MenuItemPOS[] = [];
    for (const cat of categories) {
      for (const item of cat.items) list.push({ ...item });
    }
    return list;
  }, [categories]);

  const favorites = useMemo(() => flatItems.filter((i) => i.isFavorite), [flatItems]);

  const filteredItems = useMemo(() => {
    const byCategory =
      activeCategoryId === 'all'
        ? flatItems
        : activeCategoryId === 'favorites'
          ? favorites
          : flatItems.filter((i) => {
              const cat = categories.find((c) => c.id === activeCategoryId);
              return cat?.items.some((it) => it.id === i.id);
            });
    if (!search.trim()) return byCategory;
    const q = search.trim().toLowerCase();
    return byCategory.filter((i) => i.name.toLowerCase().includes(q));
  }, [activeCategoryId, search, flatItems, favorites, categories]);

  const tabs = useMemo(() => {
    const list: { id: string; label: string; icon: string }[] = [
      { id: 'all', label: 'ყველა', icon: '📋' },
      { id: 'favorites', label: 'ფავორიტები', icon: '⭐' },
    ];
    for (const c of categories) {
      list.push({ id: c.id, label: c.name, icon: c.icon || '🍽️' });
    }
    return list;
  }, [categories]);

  const handleItemClick = (item: MenuItemPOS) => {
    const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;
    if (hasModifiers) {
      setModifierItem(item);
    } else {
      addItem({
        menuItemId: item.id,
        menuItemName: item.name,
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
        modifiers: [],
        specialInstructions: '',
        kdsStation: item.kdsStation || 'HOT',
      });
      toast.success(`${item.name} დაემატა`);
    }
  };

  const handleModifierAdded = () => {
    if (modifierItem) toast.success(`${modifierItem.name} დაემატა`);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <span className="text-slate-400">მენიუ იტვირთება...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Category tabs */}
      <div className="shrink-0 overflow-x-auto border-b border-white/10 bg-[#1E293B]/40 px-3 py-2">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveCategoryId(t.id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition touch-manipulation ${
                activeCategoryId === t.id
                  ? 'bg-orange-500/30 text-orange-200 border border-orange-500/40'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძიება..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
            >
              <MenuItemPOSCard item={item} onClick={() => handleItemClick(item)} />
            </motion.div>
          ))}
        </div>
        {filteredItems.length === 0 && (
          <p className="py-8 text-center text-slate-500">პოზიცია ვერ მოიძებნა</p>
        )}
      </div>

      <ModifierPopup
        open={!!modifierItem}
        onClose={() => setModifierItem(null)}
        item={modifierItem}
        onAdded={handleModifierAdded}
      />
    </div>
  );
}
