'use client';

import { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  MoreVertical,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Tag,
  DollarSign,
  Archive,
  Filter,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { ProductModal } from './ProductModal';

interface Product {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  minStock: number;
  image: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  salesCount: number;
}

interface InventoryData {
  products: Product[];
}

type FilterType = 'all' | 'low_stock' | 'out_of_stock' | 'active' | 'inactive';

export function InventoryClient({ data }: { data: InventoryData }) {
  const [products, setProducts] = useState(data.products);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  // Stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    return { totalProducts, totalValue, lowStock, outOfStock };
  }, [products]);

  // Filtered products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search);

      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;

      let matchFilter = true;
      switch (filter) {
        case 'low_stock':
          matchFilter = p.stock > 0 && p.stock <= p.minStock;
          break;
        case 'out_of_stock':
          matchFilter = p.stock === 0;
          break;
        case 'active':
          matchFilter = p.isActive;
          break;
        case 'inactive':
          matchFilter = !p.isActive;
          break;
      }

      return matchSearch && matchCategory && matchFilter;
    });
  }, [products, search, filter, categoryFilter]);

  const handleSave = async (productData: any) => {
    try {
      const url = editingProduct
        ? `/api/inventory/${editingProduct.id}`
        : '/api/inventory';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'შეცდომა');
      }

      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ პროდუქტის წაშლა?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('წაშლა ვერ მოხერხდა');
      setProducts(products.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
    setActiveMenu(null);
  };

  const handleStockAdjust = async (id: string, delta: number) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockAdjust: delta }),
      });
      if (!res.ok) throw new Error('შეცდომა');
      setProducts(
        products.map((p) =>
          p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
        )
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package size={24} className="text-primary-400" />
            ინვენტარი
          </h1>
          <p className="text-dark-400 mt-1">
            {stats.totalProducts} პროდუქტი
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          პროდუქტი
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-primary-400" />
            <span className="text-xs text-dark-400">სულ პროდუქტი</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.totalProducts}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-emerald-400" />
            <span className="text-xs text-dark-400">მარაგის ღირებულება</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalValue)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-amber-400" />
            <span className="text-xs text-dark-400">მცირე მარაგი</span>
          </div>
          <p className="text-xl font-bold text-amber-400">{stats.lowStock}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-xs text-dark-400">ამოწურული</span>
          </div>
          <p className="text-xl font-bold text-red-400">{stats.outOfStock}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა სახელით, ბრენდით, SKU-ით..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { id: 'all', label: 'ყველა' },
            { id: 'low_stock', label: 'მცირე მარაგი' },
            { id: 'out_of_stock', label: 'ამოწურული' },
          ] as { id: FilterType; label: string }[]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                filter === f.id
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
              )}
            >
              {f.label}
            </button>
          ))}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input text-sm py-1.5 w-auto"
            >
              <option value="all">ყველა კატეგორია</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Products Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Package size={48} className="mx-auto mb-4 text-dark-500 opacity-30" />
          <p className="text-dark-400">
            {search || filter !== 'all' ? 'პროდუქტი ვერ მოიძებნა' : 'პროდუქტები არ არის დამატებული'}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">პროდუქტი</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">კატეგორია</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">ფასი</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">თვითღირ.</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">მარაგი</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">გაყიდ.</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {filtered.map((product) => {
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                const isOutOfStock = product.stock === 0;
                const margin =
                  product.costPrice && product.costPrice > 0
                    ? ((product.price - product.costPrice) / product.price) * 100
                    : null;

                return (
                  <tr
                    key={product.id}
                    className={cn(
                      'hover:bg-dark-800/50 transition-colors',
                      !product.isActive && 'opacity-50'
                    )}
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white text-sm">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.brand && (
                            <span className="text-xs text-dark-400">{product.brand}</span>
                          )}
                          {product.sku && (
                            <span className="text-xs text-dark-500">SKU: {product.sku}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      {product.category ? (
                        <span className="badge bg-dark-700 text-dark-300 text-xs">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-dark-500 text-xs">—</span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-emerald-400">
                        {formatCurrency(product.price)}
                      </span>
                    </td>

                    {/* Cost Price */}
                    <td className="px-4 py-3 text-right">
                      {product.costPrice ? (
                        <div>
                          <span className="text-sm text-dark-300">
                            {formatCurrency(product.costPrice)}
                          </span>
                          {margin !== null && (
                            <span className="text-[10px] text-dark-500 block">
                              {margin.toFixed(0)}% მარჟა
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-dark-500 text-xs">—</span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleStockAdjust(product.id, -1)}
                          disabled={product.stock === 0}
                          className="w-6 h-6 flex items-center justify-center rounded bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white disabled:opacity-30 text-xs"
                        >
                          −
                        </button>
                        <span
                          className={cn(
                            'text-sm font-medium w-8 text-center',
                            isOutOfStock
                              ? 'text-red-400'
                              : isLowStock
                              ? 'text-amber-400'
                              : 'text-white'
                          )}
                        >
                          {product.stock}
                        </span>
                        <button
                          onClick={() => handleStockAdjust(product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white text-xs"
                        >
                          +
                        </button>
                        {isLowStock && (
                          <AlertTriangle size={12} className="text-amber-400" />
                        )}
                        {isOutOfStock && (
                          <AlertTriangle size={12} className="text-red-400" />
                        )}
                      </div>
                    </td>

                    {/* Sales */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-dark-300">{product.salesCount}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === product.id ? null : product.id)
                          }
                          className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenu === product.id && (
                          <div className="absolute right-0 top-8 w-40 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-10 py-1">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowModal(true);
                                setActiveMenu(null);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-600"
                            >
                              <Edit2 size={14} />
                              რედაქტირება
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-600"
                            >
                              <Trash2 size={14} />
                              წაშლა
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
