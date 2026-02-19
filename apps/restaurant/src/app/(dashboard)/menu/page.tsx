'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, FolderTree, ListOrdered, Package, Plus } from 'lucide-react';
import { CategoryCard, type CategoryRow } from '@/components/menu/CategoryCard';
import { CategoryForm } from '@/components/menu/CategoryForm';
import { MenuItemCard, type MenuItemRow } from '@/components/menu/MenuItemCard';
import { MenuItemForm } from '@/components/menu/MenuItemForm';
import { ModifierGroupAccordion, type ModifierGroupRow } from '@/components/menu/ModifierGroupAccordion';
import { ModifierGroupForm } from '@/components/menu/ModifierGroupForm';
import { ComboSetCard, type ComboSetRow } from '@/components/menu/ComboSetCard';
import { ComboSetForm } from '@/components/menu/ComboSetForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type TabId = 'categories' | 'items' | 'modifiers' | 'combos';

const TABS: { id: TabId; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: 'categories', label: 'კატეგორიები', icon: FolderTree },
  { id: 'items', label: 'კერძები', icon: UtensilsCrossed },
  { id: 'modifiers', label: 'მოდიფიკატორები', icon: ListOrdered },
  { id: 'combos', label: 'კომბო სეტები', icon: Package },
];

export default function MenuPage() {
  const [tab, setTab] = useState<TabId>('items');

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupRow[]>([]);
  const [combos, setCombos] = useState<ComboSetRow[]>([]);

  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<CategoryRow | null>(null);
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null);

  const [itemModal, setItemModal] = useState(false);
  const [itemEdit, setItemEdit] = useState<MenuItemRow | null>(null);
  const [itemDeleteId, setItemDeleteId] = useState<string | null>(null);
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('');
  const [itemSearch, setItemSearch] = useState('');
  const [itemActiveFilter, setItemActiveFilter] = useState<string>('');
  const [itemFavoriteFilter, setItemFavoriteFilter] = useState<string>('');

  const [modifierModal, setModifierModal] = useState(false);
  const [modifierEdit, setModifierEdit] = useState<ModifierGroupRow | null>(null);
  const [modifierDeleteId, setModifierDeleteId] = useState<string | null>(null);

  const [comboModal, setComboModal] = useState(false);
  const [comboEdit, setComboEdit] = useState<ComboSetRow | null>(null);
  const [comboDeleteId, setComboDeleteId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/menu/categories');
    if (res.ok) setCategories(await res.json());
  }, []);
  const loadItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (itemCategoryFilter) params.set('categoryId', itemCategoryFilter);
    if (itemSearch) params.set('search', itemSearch);
    if (itemActiveFilter) params.set('isActive', itemActiveFilter);
    if (itemFavoriteFilter) params.set('isFavorite', itemFavoriteFilter);
    const res = await fetch(`/api/menu/items?${params}`);
    if (res.ok) setItems(await res.json());
  }, [itemCategoryFilter, itemSearch, itemActiveFilter, itemFavoriteFilter]);
  const loadModifiers = useCallback(async () => {
    const res = await fetch('/api/menu/modifiers');
    if (res.ok) setModifierGroups(await res.json());
  }, []);
  const loadCombos = useCallback(async () => {
    const res = await fetch('/api/menu/combos');
    if (res.ok) setCombos(await res.json());
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  useEffect(() => {
    if (tab === 'items') loadItems();
  }, [tab, loadItems]);
  useEffect(() => {
    if (tab === 'modifiers') loadModifiers();
  }, [tab, loadModifiers]);
  useEffect(() => {
    if (tab === 'combos') loadCombos();
  }, [tab, loadCombos]);

  const handleCategorySave = async (data: Parameters<CategoryForm['props']['onSave']>[0]) => {
    if (categoryEdit) {
      const res = await fetch(`/api/menu/categories/${categoryEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } else {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    }
    loadCategories();
    setCategoryModal(false);
    setCategoryEdit(null);
  };

  const handleCategoryToggleActive = async (cat: CategoryRow, active: boolean) => {
    const res = await fetch(`/api/menu/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cat, isActive: active }),
    });
    if (res.ok) loadCategories();
  };

  const handleCategoryDelete = async () => {
    if (!categoryDeleteId) return;
    const res = await fetch(`/api/menu/categories/${categoryDeleteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'წაშლა ვერ მოხერხდა');
      setCategoryDeleteId(null);
      return;
    }
    loadCategories();
    setCategoryDeleteId(null);
  };

  const handleItemSave = async (data: Parameters<MenuItemForm['props']['onSave']>[0]) => {
    if (itemEdit) {
      const res = await fetch(`/api/menu/items/${itemEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } else {
      const res = await fetch('/api/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    }
    loadItems();
    setItemModal(false);
    setItemEdit(null);
  };

  const handleItemDelete = async () => {
    if (!itemDeleteId) return;
    const res = await fetch(`/api/menu/items/${itemDeleteId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'წაშლა ვერ მოხერხდა');
      setItemDeleteId(null);
      return;
    }
    loadItems();
    setItemDeleteId(null);
  };

  const handleModifierSave = async (data: Parameters<ModifierGroupForm['props']['onSave']>[0]) => {
    if (modifierEdit) {
      const res = await fetch(`/api/menu/modifiers/${modifierEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } else {
      const res = await fetch('/api/menu/modifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    }
    loadModifiers();
    setModifierModal(false);
    setModifierEdit(null);
  };

  const handleModifierDelete = async () => {
    if (!modifierDeleteId) return;
    const res = await fetch(`/api/menu/modifiers/${modifierDeleteId}`, { method: 'DELETE' });
    if (!res.ok) {
      setModifierDeleteId(null);
      return;
    }
    loadModifiers();
    setModifierDeleteId(null);
  };

  const handleComboSave = async (data: Parameters<ComboSetForm['props']['onSave']>[0]) => {
    const payload = {
      ...data,
      items: data.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
    };
    if (comboEdit) {
      const res = await fetch(`/api/menu/combos/${comboEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } else {
      const res = await fetch('/api/menu/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    }
    loadCombos();
    setComboModal(false);
    setComboEdit(null);
  };

  const handleComboDelete = async () => {
    if (!comboDeleteId) return;
    const res = await fetch(`/api/menu/combos/${comboDeleteId}`, { method: 'DELETE' });
    if (!res.ok) {
      setComboDeleteId(null);
      return;
    }
    loadCombos();
    setComboDeleteId(null);
  };

  const modifierGroupsForItemForm = modifierGroups.map((g) => ({ id: g.id, name: g.name }));

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white"
      >
        მენიუს მართვა
      </motion.h1>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'categories' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setCategoryEdit(null);
                setCategoryModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> ახალი კატეგორია
            </button>
          </div>
          {categories.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="კატეგორიები არ არის"
              description="დაამატეთ პირველი კატეგორია"
              actionLabel="დამატება"
              onAction={() => setCategoryModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat, i) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  index={i}
                  onEdit={() => {
                    setCategoryEdit(cat);
                    setCategoryModal(true);
                  }}
                  onDelete={() => setCategoryDeleteId(cat.id)}
                  onToggleActive={(active) => handleCategoryToggleActive(cat, active)}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {tab === 'items' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setItemCategoryFilter('')}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm ${
                  !itemCategoryFilter
                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                ყველა
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setItemCategoryFilter(c.id)}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm ${
                    itemCategoryFilter === c.id
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {c.icon || ''} {c.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="ძიება..."
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none w-48"
            />
            <select
              value={itemActiveFilter}
              onChange={(e) => setItemActiveFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
            >
              <option value="">ყველა სტატუსი</option>
              <option value="true">აქტიური</option>
              <option value="false">არააქტიური</option>
            </select>
            <select
              value={itemFavoriteFilter}
              onChange={(e) => setItemFavoriteFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
            >
              <option value="">ყველა</option>
              <option value="true">ფავორიტი</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setItemEdit(null);
                setItemModal(true);
              }}
              className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> ახალი კერძი
            </button>
          </div>
          {items.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="კერძები არ მოიძებნა"
              description="დაამატეთ კერძი ან შეცვალეთ ფილტრი"
              actionLabel="დამატება"
              onAction={() => setItemModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item, i) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  onClick={() => {
                    setItemEdit(item);
                    setItemModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {tab === 'modifiers' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setModifierEdit(null);
                setModifierModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> ახალი ჯგუფი
            </button>
          </div>
          {modifierGroups.length === 0 ? (
            <EmptyState
              icon={ListOrdered}
              title="მოდიფიკატორების ჯგუფები არ არის"
              description="შექმენით ჯგუფი (მაგ: ზომა, დანამატები)"
              actionLabel="დამატება"
              onAction={() => setModifierModal(true)}
            />
          ) : (
            <div className="space-y-3">
              {modifierGroups.map((g) => (
                <ModifierGroupAccordion
                  key={g.id}
                  group={g}
                  onEdit={() => {
                    setModifierEdit(g);
                    setModifierModal(true);
                  }}
                  onDelete={() => setModifierDeleteId(g.id)}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {tab === 'combos' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setComboEdit(null);
                setComboModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> ახალი კომბო
            </button>
          </div>
          {combos.length === 0 ? (
            <EmptyState
              icon={Package}
              title="კომბო სეტები არ არის"
              description="შექმენით კომბო (მაგ: ლანჩის მენიუ)"
              actionLabel="დამატება"
              onAction={() => setComboModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {combos.map((combo, i) => (
                <ComboSetCard
                  key={combo.id}
                  combo={combo}
                  index={i}
                  onEdit={() => {
                    setComboEdit(combo);
                    setComboModal(true);
                  }}
                  onDelete={() => setComboDeleteId(combo.id)}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      <CategoryForm
        open={categoryModal}
        onClose={() => {
          setCategoryModal(false);
          setCategoryEdit(null);
        }}
        onSave={handleCategorySave}
        edit={categoryEdit}
        parentOptions={categories.map((c) => ({ id: c.id, name: c.name }))}
      />

      <MenuItemForm
        open={itemModal}
        onClose={() => {
          setItemModal(false);
          setItemEdit(null);
        }}
        onSave={handleItemSave}
        edit={itemEdit}
        categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
        modifierGroups={modifierGroupsForItemForm}
      />

      <ModifierGroupForm
        open={modifierModal}
        onClose={() => {
          setModifierModal(false);
          setModifierEdit(null);
        }}
        onSave={handleModifierSave}
        edit={modifierEdit}
      />

      <ComboSetForm
        open={comboModal}
        onClose={() => {
          setComboModal(false);
          setComboEdit(null);
        }}
        onSave={handleComboSave}
        edit={comboEdit}
        menuItems={items.map((i) => ({ id: i.id, name: i.name, nameEn: i.nameEn }))}
      />

      <ConfirmDialog
        open={!!categoryDeleteId}
        onClose={() => setCategoryDeleteId(null)}
        onConfirm={handleCategoryDelete}
        message="კატეგორიის წაშლა? თუ მასში კერძებია, ჯერ გადაიტანეთ ან წაშალეთ ისინი."
        confirmLabel="წაშლა"
        variant="danger"
      />

      <ConfirmDialog
        open={!!itemDeleteId}
        onClose={() => setItemDeleteId(null)}
        onConfirm={handleItemDelete}
        message="ნამდვილად წაშალოთ ეს კერძი?"
        confirmLabel="წაშლა"
        variant="danger"
      />

      <ConfirmDialog
        open={!!modifierDeleteId}
        onClose={() => setModifierDeleteId(null)}
        onConfirm={handleModifierDelete}
        message="ჯგუფის წაშლა წაშლის ყველა მოდიფიკატორს."
        confirmLabel="წაშლა"
        variant="danger"
      />

      <ConfirmDialog
        open={!!comboDeleteId}
        onClose={() => setComboDeleteId(null)}
        onConfirm={handleComboDelete}
        message="ნამდვილად წაშალოთ ეს კომბო?"
        confirmLabel="წაშლა"
        variant="danger"
      />
    </div>
  );
}
