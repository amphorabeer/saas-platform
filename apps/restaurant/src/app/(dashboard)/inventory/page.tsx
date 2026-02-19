'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus } from 'lucide-react';
import { IngredientTable, type IngredientRow } from '@/components/inventory/IngredientTable';
import { IngredientForm, type IngredientFormData } from '@/components/inventory/IngredientForm';
import { StockOperationModal } from '@/components/inventory/StockOperationModal';
import { RecipeList, type RecipeRow } from '@/components/inventory/RecipeList';
import { RecipeForm, type RecipeFormData } from '@/components/inventory/RecipeForm';
import { OperationHistory, type OperationRow } from '@/components/inventory/OperationHistory';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type TabId = 'ingredients' | 'recipes' | 'history';

export default function InventoryPage() {
  const [tab, setTab] = useState<TabId>('ingredients');

  // ——— Ingredients ———
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editIngredient, setEditIngredient] = useState<IngredientRow | null>(null);
  const [stockOpIngredient, setStockOpIngredient] = useState<IngredientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IngredientRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);

  const fetchIngredients = useCallback(async () => {
    const params = new URLSearchParams();
    if (sortBy) params.set('sort', sortBy);
    if (lowStockOnly) params.set('lowStock', 'true');
    if (expiredOnly) params.set('expired', 'true');
    if (search.trim()) params.set('search', search.trim());
    const res = await fetch(`/api/inventory/ingredients?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setIngredients(data);
  }, [sortBy, lowStockOnly, expiredOnly, search]);

  useEffect(() => {
    const list = ingredients.map((i) => i.supplierId).filter(Boolean) as string[];
    setSupplierOptions((prev) => {
      const set = new Set([...prev, ...list]);
      return [...set].sort();
    });
  }, [ingredients]);

  useEffect(() => {
    if (tab === 'ingredients') fetchIngredients();
  }, [tab, fetchIngredients]);

  const handleSaveIngredient = async (data: IngredientFormData) => {
    if (editIngredient?.id) {
      const res = await fetch(`/api/inventory/ingredients/${editIngredient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
    } else {
      const res = await fetch('/api/inventory/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
    }
    setFormOpen(false);
    setEditIngredient(null);
    fetchIngredients();
  };

  const handleDeleteIngredient = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/inventory/ingredients/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'შეცდომა');
        return;
      }
      setDeleteTarget(null);
      fetchIngredients();
    } finally {
      setDeleteLoading(false);
    }
  };

  // ——— Recipes ———
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [menuItems, setMenuItems] = useState<Array<{ id: string; name: string; price: number; categoryName: string }>>([]);
  const [itemsWithoutRecipe, setItemsWithoutRecipe] = useState<Array<{ id: string; name: string; categoryName: string }>>([]);
  const [recipeFormOpen, setRecipeFormOpen] = useState(false);
  const [editRecipe, setEditRecipe] = useState<RecipeRow | null>(null);
  const [addRecipeMenuItemId, setAddRecipeMenuItemId] = useState<string | null>(null);
  const [deleteRecipeTarget, setDeleteRecipeTarget] = useState<RecipeRow | null>(null);
  const [deleteRecipeLoading, setDeleteRecipeLoading] = useState(false);
  const [ingredientOptions, setIngredientOptions] = useState<Array<{ id: string; name: string; unit: string; costPerUnit: number | null }>>([]);

  const fetchRecipes = useCallback(async () => {
    const res = await fetch('/api/inventory/recipes');
    if (!res.ok) return;
    const data = await res.json();
    setRecipes(data);
  }, []);

  const fetchMenuItems = useCallback(async () => {
    const res = await fetch('/api/menu/items');
    if (!res.ok) return;
    const data = await res.json();
    setMenuItems(
      data.map((m: { id: string; name: string; price: number; category?: { name: string } }) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        categoryName: m.category?.name ?? '—',
      }))
    );
  }, []);

  const fetchItemsWithoutRecipe = useCallback(async () => {
    const [itemsRes, recipesRes] = await Promise.all([
      fetch('/api/menu/items'),
      fetch('/api/inventory/recipes'),
    ]);
    if (!itemsRes.ok || !recipesRes.ok) return;
    const items = await itemsRes.json();
    const recipesList = await recipesRes.json();
    const withRecipe = new Set(recipesList.map((r: { menuItemId: string }) => r.menuItemId));
    setItemsWithoutRecipe(
      items
        .filter((m: { id: string }) => !withRecipe.has(m.id))
        .map((m: { id: string; name: string; category?: { name: string } }) => ({
          id: m.id,
          name: m.name,
          categoryName: m.category?.name ?? '—',
        }))
    );
  }, []);

  useEffect(() => {
    if (tab === 'recipes') {
      fetchRecipes();
      fetchMenuItems();
      fetchItemsWithoutRecipe();
    }
  }, [tab, fetchRecipes, fetchMenuItems, fetchItemsWithoutRecipe]);

  useEffect(() => {
    fetch('/api/inventory/ingredients')
      .then((r) => r.ok ? r.json() : [])
      .then((list: IngredientRow[]) => {
        setIngredientOptions(
          list.map((i) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
            costPerUnit: i.costPerUnit,
          }))
        );
      })
      .catch(() => {});
  }, [tab]);

  const handleSaveRecipe = async (data: RecipeFormData) => {
    if (editRecipe?.id) {
      const res = await fetch(`/api/inventory/recipes/${editRecipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yield: data.yield,
          notes: data.notes,
          ingredients: data.ingredients.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
    } else {
      const res = await fetch('/api/inventory/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: data.menuItemId,
          yield: data.yield,
          notes: data.notes,
          ingredients: data.ingredients.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
    }
    setRecipeFormOpen(false);
    setEditRecipe(null);
    setAddRecipeMenuItemId(null);
    fetchRecipes();
    fetchItemsWithoutRecipe();
  };

  const handleDeleteRecipe = async () => {
    if (!deleteRecipeTarget) return;
    setDeleteRecipeLoading(true);
    try {
      const res = await fetch(`/api/inventory/recipes/${deleteRecipeTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'შეცდომა');
        return;
      }
      setDeleteRecipeTarget(null);
      fetchRecipes();
      fetchItemsWithoutRecipe();
    } finally {
      setDeleteRecipeLoading(false);
    }
  };

  // ——— Operation history ———
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [opTotal, setOpTotal] = useState(0);
  const [opPage, setOpPage] = useState(1);
  const [opTotalPages, setOpTotalPages] = useState(0);
  const [opIngredientId, setOpIngredientId] = useState('');
  const [opType, setOpType] = useState('');
  const [opDateFrom, setOpDateFrom] = useState('');
  const [opDateTo, setOpDateTo] = useState('');

  const fetchOperations = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('page', String(opPage));
    params.set('pageSize', '20');
    if (opIngredientId) params.set('ingredientId', opIngredientId);
    if (opType) params.set('type', opType);
    if (opDateFrom) params.set('dateFrom', opDateFrom);
    if (opDateTo) params.set('dateTo', opDateTo);
    const res = await fetch(`/api/inventory/operations?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setOperations(data.items);
    setOpTotal(data.total);
    setOpTotalPages(data.totalPages ?? 1);
  }, [opPage, opIngredientId, opType, opDateFrom, opDateTo]);

  useEffect(() => {
    if (tab === 'history') {
      fetchOperations();
      if (ingredients.length === 0) fetchIngredients();
    }
  }, [tab, fetchOperations, fetchIngredients, ingredients.length]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'ingredients', label: 'ინგრედიენტები' },
    { id: 'recipes', label: 'რეცეპტები (BOM)' },
    { id: 'history', label: 'მოძრაობის ისტორია' },
  ];

  const sortedIngredients = [...ingredients].sort((a, b) => {
    if (sortBy === 'currentStock') return a.currentStock - b.currentStock;
    if (sortBy === 'costPerUnit')
      return (a.costPerUnit ?? 0) - (b.costPerUnit ?? 0);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-white">საწყობი</h1>

      <div className="flex gap-2 border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'ingredients' && (
          <motion.div key="ingredients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                placeholder="ძიება სახელით"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 w-48"
              />
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded border-white/20 bg-white/5"
                />
                დაბალი მარაგი
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={expiredOnly}
                  onChange={(e) => setExpiredOnly(e.target.checked)}
                  className="rounded border-white/20 bg-white/5"
                />
                ვადაგასული
              </label>
              <button
                type="button"
                onClick={() => { setEditIngredient(null); setFormOpen(true); }}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" /> დამატება
              </button>
            </div>
            <IngredientTable
              ingredients={sortedIngredients}
              sortBy={sortBy}
              onSort={setSortBy}
              onEdit={(row) => { setEditIngredient(row); setFormOpen(true); }}
              onDelete={setDeleteTarget}
              onStockOp={setStockOpIngredient}
            />
          </motion.div>
        )}

        {tab === 'recipes' && (
          <motion.div key="recipes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <RecipeList
              recipes={recipes}
              itemsWithoutRecipe={itemsWithoutRecipe}
              onAddRecipe={(menuItemId) => { setAddRecipeMenuItemId(menuItemId); setRecipeFormOpen(true); }}
              onEdit={(r) => { setEditRecipe(r); setRecipeFormOpen(true); }}
              onDelete={setDeleteRecipeTarget}
            />
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={opIngredientId}
                onChange={(e) => setOpIngredientId(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="">ყველა ინგრედიენტი</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <select
                value={opType}
                onChange={(e) => setOpType(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="">ყველა ტიპი</option>
                <option value="INCOMING">შემოსვლა</option>
                <option value="WRITE_OFF">ჩამოწერა</option>
                <option value="ADJUSTMENT">კორექტირება</option>
                <option value="AUTO_DEDUCTION">ავტო-ჩამოჭრა</option>
              </select>
              <input
                type="date"
                value={opDateFrom}
                onChange={(e) => setOpDateFrom(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="date"
                value={opDateTo}
                onChange={(e) => setOpDateTo(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <OperationHistory
              items={operations}
              page={opPage}
              totalPages={opTotalPages}
              total={opTotal}
              onPageChange={setOpPage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <IngredientForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditIngredient(null); }}
        initial={editIngredient ?? undefined}
        onSave={handleSaveIngredient}
        supplierOptions={supplierOptions}
      />

      <StockOperationModal
        open={!!stockOpIngredient}
        onClose={() => setStockOpIngredient(null)}
        ingredient={stockOpIngredient ? { id: stockOpIngredient.id, name: stockOpIngredient.name, unit: stockOpIngredient.unit, currentStock: stockOpIngredient.currentStock } : null}
        onSuccess={fetchIngredients}
      />

      <RecipeForm
        open={recipeFormOpen}
        onClose={() => { setRecipeFormOpen(false); setEditRecipe(null); setAddRecipeMenuItemId(null); }}
        initial={
          editRecipe
            ? {
                menuItemId: editRecipe.menuItemId,
                yield: editRecipe.yield,
                notes: editRecipe.notes ?? '',
                ingredients: editRecipe.ingredients.map((ri) => ({
                  ingredientId: (ri as { ingredientId?: string }).ingredientId ?? '',
                  ingredientName: ri.ingredientName,
                  unit: ri.unit,
                  quantity: ri.quantity,
                  costPerUnit: ri.costPerUnit ?? null,
                })),
              }
            : addRecipeMenuItemId
              ? { menuItemId: addRecipeMenuItemId, yield: 1, notes: '', ingredients: [] }
              : undefined
        }
        menuItems={menuItems}
        ingredients={ingredientOptions}
        onSave={handleSaveRecipe}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteIngredient}
        loading={deleteLoading}
        title="ინგრედიენტის წაშლა"
        message="ნამდვილად წაშალო?"
      />

      <ConfirmDialog
        open={!!deleteRecipeTarget}
        onClose={() => setDeleteRecipeTarget(null)}
        onConfirm={handleDeleteRecipe}
        loading={deleteRecipeLoading}
        title="რეცეპტის წაშლა"
        message="ნამდვილად წაშალო?"
      />
    </div>
  );
}
