'use client';

import { motion } from 'framer-motion';

export type MenuItemPOS = {
  id: string;
  name: string;
  nameEn: string | null;
  imageUrl?: string | null;
  price: number;
  preparationTime: number | null;
  kdsStation: string;
  isFavorite: boolean;
  modifierGroups: {
    id: string;
    name: string;
    isRequired: boolean;
    minSelect: number;
    maxSelect: number;
    modifiers: { id: string; name: string; priceAdjustment: number }[];
  }[];
};

export function MenuItemPOSCard({
  item,
  onClick,
}: {
  item: MenuItemPOS;
  onClick: () => void;
}) {
  const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;

  const firstLetter = (item.name.trim()[0] || '?').toUpperCase();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]/60 text-left backdrop-blur-sm hover:border-orange-500/30 hover:bg-[#1E293B]/80 transition touch-manipulation"
    >
      {/* Top: image or placeholder */}
      <div className="h-24 w-full shrink-0 overflow-hidden bg-slate-700/50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover rounded-t-xl"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-t-xl bg-gradient-to-br from-orange-500/20 to-slate-600/50">
            <span className="text-3xl font-bold text-white/80">{firstLetter}</span>
          </div>
        )}
      </div>
      {/* Bottom: name + price */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="font-medium text-white line-clamp-2">{item.name}</span>
        <span className="text-sm font-semibold text-orange-400">₾{item.price.toFixed(2)}</span>
        {item.preparationTime != null && item.preparationTime > 0 && (
          <span className="mt-auto inline-flex w-fit rounded bg-white/10 px-2 py-0.5 text-xs text-slate-400">
            {item.preparationTime} წთ
          </span>
        )}
        {hasModifiers && (
          <span className="text-xs text-slate-500">მოდიფიკატორები</span>
        )}
      </div>
    </motion.button>
  );
}
