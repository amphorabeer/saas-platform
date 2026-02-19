'use client';

import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';

export type CategoryRow = {
  id: string;
  name: string;
  nameEn: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  isSeasonal: boolean;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
};

type CategoryCardProps = {
  category: CategoryRow;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  index?: number;
};

export function CategoryCard({
  category,
  onEdit,
  onDelete,
  onToggleActive,
  index = 0,
}: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass rounded-xl border border-white/10 p-4 transition hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-2xl">{category.icon || '📁'}</span>
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{category.name}</p>
            {category.nameEn && (
              <p className="text-sm text-slate-400 truncate">{category.nameEn}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {category.color && (
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                  title={category.color}
                />
              )}
              <span className="text-xs text-slate-500">#{category.sortOrder}</span>
              {category.isSeasonal && <Badge variant="yellow">სეზონური</Badge>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Toggle
            checked={category.isActive}
            onCheckedChange={onToggleActive}
          />
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
