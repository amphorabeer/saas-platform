"use client";

import { useMemo, useState } from "react";
import { slugify } from "@saas-platform/utils";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/store-actions";
import type { CategoryFormData } from "@/lib/validators";
import { Button } from "@saas-platform/ui";
import { Plus, Pencil, Trash2, Folder, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameKa?: string | null;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
  parent?: { id: string; name: string } | null;
  _count: { products: number };
}

type CategoryWithLevel = Category & { level: number };

interface CategoryManagerProps {
  initialCategories: Category[];
}

function isDescendant(cats: Category[], candidateId: string, ancestorId: string): boolean {
  const byId = new Map(cats.map((c) => [c.id, c]));
  let cur = byId.get(candidateId);
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = byId.get(cur.parentId);
  }
  return false;
}

function buildHierarchyList(cats: Category[]): CategoryWithLevel[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of cats) {
    const pid = c.parentId ?? null;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(c);
  }
  const result: CategoryWithLevel[] = [];
  const add = (parentId: string | null, level: number) => {
    const children = byParent.get(parentId) ?? [];
    children.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const c of children) {
      result.push({ ...c, level });
      add(c.id, level + 1);
    }
  };
  add(null, 0);
  return result;
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CategoryFormData>({
    name: "",
    slug: "",
    description: "",
    sortOrder: 0,
    parentId: null,
    isActive: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hierarchyList = useMemo(() => buildHierarchyList(categories), [categories]);

  const parentOptionsHierarchy = useMemo(() => {
    return hierarchyList.filter((c) =>
      c.id !== editingId && (editingId ? !isDescendant(categories, c.id, editingId) : true)
    );
  }, [hierarchyList, categories, editingId]);

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      description: "",
      sortOrder: categories.length,
      parentId: null,
      isActive: true,
    });
    setCreating(false);
    setEditingId(null);
    setError("");
  };

  const handleNameChange = (name: string) => {
    setForm((p) => ({ ...p, name, slug: slugify(name) || p.slug }));
  };

  const saveCategory = async () => {
    setError("");
    setLoading(true);
    const result = editingId
      ? await updateCategory(editingId, form)
      : await createCategory(form);
    setLoading(false);
    if (result.success) {
      const updated = await getCategories();
      setCategories(updated);
      resetForm();
    } else {
      setError(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (cat && cat._count.products > 0) {
      if (
        !confirm(
          `კატეგორია "${cat.name}" შეიცავს ${cat._count.products} პროდუქტს. წავშალოთ მაინც?`
        )
      )
        return;
    } else if (!confirm("დარწმუნებული ხართ?")) return;
    const result = await deleteCategory(id);
    if (result.success) {
      setCategories((c) => c.filter((x) => x.id !== id));
      if (editingId === id) resetForm();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {creating && (
        <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
          <h3 className="font-medium">
            {editingId ? "კატეგორიის რედაქტირება" : "ახალი კატეგორია"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                სახელი *
              </label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
                placeholder="კატეგორიის სახელი"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Slug *
              </label>
              <input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
                placeholder="slug"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                მშობელი კატეგორია
              </label>
              <select
                value={form.parentId ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    parentId: e.target.value || null,
                  }))
                }
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
              >
                <option value="">— მშობელი არ არის —</option>
                {hierarchyList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"\u00A0".repeat(c.level * 3)}
                    {c.level > 0 ? "↳ " : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={saveCategory} disabled={loading}>
              {loading ? "იტვირთება..." : "შენახვა"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              გაუქმება
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex justify-between items-center">
          <h3 className="font-medium">კატეგორიები</h3>
          {!creating && !editingId && (
            <Button
              size="sm"
              onClick={() => {
                setCreating(true);
                setForm({
                  name: "",
                  slug: "",
                  description: "",
                  sortOrder: categories.length,
                  parentId: null,
                  isActive: true,
                });
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              დამატება
            </Button>
          )}
        </div>
        <div className="divide-y divide-border">
          {categories.length === 0 ? (
            <div className="px-4 py-12 text-center text-text-muted">
              <Folder className="mx-auto h-12 w-12 text-text-muted/50 mb-2" />
              <p>კატეგორიები ვერ მოიძებნა</p>
              <Button
                className="mt-2"
                variant="outline"
                size="sm"
                onClick={() => setCreating(true)}
              >
                პირველი კატეგორიის დამატება
              </Button>
            </div>
          ) : (
            hierarchyList.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-bg-tertiary/30"
                style={{ paddingLeft: `calc(1rem + ${cat.level * 1.5}rem)` }}
              >
                {editingId === cat.id ? (
                  <div className="flex-1 flex flex-wrap gap-3">
                    <input
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="min-w-[160px] flex-1 rounded border border-border bg-bg-tertiary px-3 py-2 text-text-primary"
                    />
                    <input
                      value={form.slug}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, slug: e.target.value }))
                      }
                      className="w-36 rounded border border-border bg-bg-tertiary px-3 py-2 text-text-primary"
                    />
                    <select
                      value={form.parentId ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          parentId: e.target.value || null,
                        }))
                      }
                      className="w-44 rounded border border-border bg-bg-tertiary px-3 py-2 text-text-primary"
                    >
                      <option value="">— მშობელი არ არის —</option>
                      {parentOptionsHierarchy.map((c) => (
                        <option key={c.id} value={c.id}>
                          {"\u00A0".repeat(c.level * 2)}
                          {c.level > 0 ? "↳ " : ""}
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {cat.level > 0 && (
                      <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                    )}
                    <span className="font-medium">{cat.name}</span>
                    {cat.parent && (
                      <span className="text-sm text-text-muted">
                        ← {cat.parent.name}
                      </span>
                    )}
                    <span className="text-sm text-text-muted">
                      ({cat._count.products} პროდუქტი)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {editingId === cat.id ? (
                    <>
                      <Button size="sm" onClick={saveCategory} disabled={loading}>
                        შენახვა
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        გაუქმება
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(cat.id);
                          setForm({
                            name: cat.name,
                            nameKa: cat.nameKa ?? undefined,
                            slug: cat.slug,
                            description: cat.description ?? "",
                            color: cat.color ?? undefined,
                            sortOrder: cat.sortOrder,
                            parentId: cat.parentId ?? null,
                            isActive: cat.isActive,
                          });
                        }}
                        className="p-2 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-2 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
