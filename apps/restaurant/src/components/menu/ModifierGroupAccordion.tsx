'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export type ModifierGroupRow = {
  id: string;
  name: string;
  nameEn: string | null;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  modifiers: {
    id: string;
    name: string;
    nameEn: string | null;
    priceAdjustment: number;
    isDefault: boolean;
    isActive: boolean;
    sortOrder: number;
  }[];
};

type ModifierGroupAccordionProps = {
  group: ModifierGroupRow;
  onEdit: () => void;
  onDelete: () => void;
};

export function ModifierGroupAccordion({ group, onEdit, onDelete }: ModifierGroupAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-xl border border-white/10 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between p-4 text-left hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-5 w-5 text-slate-400" />
          </motion.span>
          <span className="font-medium text-white">{group.name}</span>
          {group.isRequired && <Badge variant="orange">აუცილებელი</Badge>}
          <span className="text-sm text-slate-500">
            min: {group.minSelect} / max: {group.maxSelect}
          </span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <ul className="divide-y divide-white/5">
              {group.modifiers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={m.isActive ? 'text-white' : 'text-slate-500'}>
                      {m.name}
                    </span>
                    {m.nameEn && (
                      <span className="text-slate-500">({m.nameEn})</span>
                    )}
                    {m.isDefault && <Badge variant="green">default</Badge>}
                    {!m.isActive && <Badge variant="red">off</Badge>}
                  </div>
                  <span className="text-orange-400">
                    {m.priceAdjustment >= 0 ? '+' : ''}₾{m.priceAdjustment.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
