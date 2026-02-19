'use client';

import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export type ComboSetRow = {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  price: number;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  items: { id: string; menuItemId: string; quantity: number; menuItem?: { id: string; name: string; nameEn: string | null } }[];
};

type ComboSetCardProps = {
  combo: ComboSetRow;
  onEdit: () => void;
  onDelete: () => void;
  index?: number;
};

export function ComboSetCard({ combo, onEdit, onDelete, index = 0 }: ComboSetCardProps) {
  const itemCount = combo.items?.length ?? 0;
  const validFrom = combo.validFrom ? new Date(combo.validFrom).toLocaleDateString('ka-GE') : null;
  const validTo = combo.validTo ? new Date(combo.validTo).toLocaleDateString('ka-GE') : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass rounded-xl border border-white/10 p-4 transition hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{combo.name}</p>
          {combo.nameEn && (
            <p className="text-sm text-slate-400">{combo.nameEn}</p>
          )}
          {combo.description && (
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">{combo.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-orange-400 font-semibold">₾ {combo.price.toFixed(2)}</span>
            <Badge variant="default">{itemCount} კერძი</Badge>
            {validFrom && validTo && (
              <span className="text-xs text-slate-500">{validFrom} – {validTo}</span>
            )}
            {!combo.isActive && <Badge variant="red">არააქტიური</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
