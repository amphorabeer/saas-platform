'use client';

import { motion } from 'framer-motion';
import { KDSStationBadge } from './KDSStationBadge';
import { Badge } from '@/components/ui/Badge';

export type MenuItemRow = {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  price: number;
  imageUrl: string | null;
  preparationTime: number | null;
  calories: number | null;
  allergens: string[];
  kdsStation: string;
  isActive: boolean;
  isFavorite: boolean;
  category?: { id: string; name: string; icon: string | null };
  modifierGroups?: { modifierGroupId: string; modifierGroup: { id: string; name: string } }[];
};

type MenuItemCardProps = {
  item: MenuItemRow;
  onClick: () => void;
  index?: number;
};

export function MenuItemCard({ item, onClick, index = 0 }: MenuItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="glass kds-card cursor-pointer rounded-xl border border-white/10 overflow-hidden transition hover:bg-white/5"
    >
      <div className="aspect-video relative bg-[#334155] flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-5xl">🍽️</span>
        )}
        {item.isFavorite && (
          <span className="absolute top-2 right-2 text-amber-400">⭐</span>
        )}
        {!item.isActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="red">არააქტიური</Badge>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-white truncate">{item.name}</p>
        {item.nameEn && (
          <p className="text-xs text-slate-400 truncate">{item.nameEn}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-orange-400 font-semibold">₾ {item.price.toFixed(2)}</span>
          {item.category && (
            <Badge variant="default">
              {item.category.icon || ''} {item.category.name}
            </Badge>
          )}
          <KDSStationBadge station={item.kdsStation} />
          {item.preparationTime != null && (
            <span className="text-xs text-slate-500">⏱️ {item.preparationTime}წთ</span>
          )}
        </div>
        {item.allergens?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.allergens.slice(0, 3).map((a) => (
              <span key={a} className="text-xs text-slate-500">#{a}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
