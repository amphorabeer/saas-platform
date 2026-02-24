'use client';

import { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Users,
  Tag,
  Receipt,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  Gift,
  Percent,
  X,
  Check,
  Clock,
  ChevronDown,
  History,
  ShoppingCart,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { SalesHistory } from './SalesHistory';
import { ReceiptModal } from './ReceiptModal';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  categoryId: string | null;
  categoryName: string | null;
}

interface StaffItem {
  id: string;
  name: string;
  role: string;
}

interface ClientItem {
  id: string;
  name: string;
  phone: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface CartItem {
  id: string;
  serviceId: string;
  productId: string | null;
  type: 'SERVICE' | 'PRODUCT';
  name: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

interface SaleRecord {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  paymentStatus: string;
  receiptNumber: string | null;
  createdAt: string;
  clientName: string | null;
  staffName: string | null;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
}

interface POSData {
  services: ServiceItem[];
  staff: StaffItem[];
  clients: ClientItem[];
  categories: Category[];
  products: { id: string; name: string; price: number; stock: number; category: string | null; brand: string | null }[];
  recentSales: SaleRecord[];
}

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'ნაღდი', icon: Banknote, color: 'text-green-400' },
  { id: 'CARD', label: 'ბარათი', icon: CreditCard, color: 'text-blue-400' },
  { id: 'TRANSFER', label: 'გადარიცხვა', icon: Smartphone, color: 'text-purple-400' },
  { id: 'SPLIT', label: 'გაყოფილი', icon: ArrowRightLeft, color: 'text-amber-400' },
];

export function POSClient({ data }: { data: POSData }) {
  const [view, setView] = useState<'pos' | 'history'>('pos');
  const [posTab, setPosTab] = useState<'services' | 'products'>('services');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED' | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleRecord | null>(null);
  const [salesHistory, setSalesHistory] = useState(data.recentSales);

  // Filter services
  const filteredServices = useMemo(() => {
    return data.services.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === 'all' || s.categoryId === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [data.services, search, selectedCategory]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return data.products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
    );
  }, [data.products, search]);

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientSearch) return data.clients.slice(0, 8);
    return data.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.includes(clientSearch)
    );
  }, [data.clients, clientSearch]);

  // Filter staff
  const filteredStaff = useMemo(() => {
    if (!staffSearch) return data.staff;
    return data.staff.filter((s) =>
      s.name.toLowerCase().includes(staffSearch.toLowerCase())
    );
  }, [data.staff, staffSearch]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = useMemo(() => {
    if (!discountType || discountValue <= 0) return 0;
    if (discountType === 'PERCENTAGE') return (subtotal * Math.min(discountValue, 100)) / 100;
    return Math.min(discountValue, subtotal);
  }, [discountType, discountValue, subtotal]);
  const total = Math.max(subtotal - discountAmount, 0);

  // Cart actions
  const addToCart = (service: ServiceItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.serviceId === service.id && item.type === 'SERVICE');
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + 1, total: item.unitPrice * (item.quantity + 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          serviceId: service.id,
          productId: null,
          type: 'SERVICE' as const,
          name: service.name,
          unitPrice: service.price,
          quantity: 1,
          total: service.price,
        },
      ];
    });
  };

  const addProductToCart = (product: { id: string; name: string; price: number; stock: number }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && item.type === 'PRODUCT');
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`მარაგშია მხოლოდ ${product.stock} ცალი`);
          return prev;
        }
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + 1, total: item.unitPrice * (item.quantity + 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          serviceId: '',
          productId: product.id,
          type: 'PRODUCT' as const,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
          total: product.price,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: Math.max(0, item.quantity + delta),
                total: item.unitPrice * Math.max(0, item.quantity + delta),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient(null);
    setSelectedStaff(null);
    setDiscountType(null);
    setDiscountValue(0);
    setNotes('');
    setPaymentMethod('CASH');
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id || null,
          staffId: selectedStaff?.id || null,
          paymentMethod,
          discountType,
          discount: discountAmount,
          notes: notes || null,
          items: cart.map((item) => ({
            type: item.type,
            serviceId: item.type === 'SERVICE' ? item.serviceId : null,
            productId: item.type === 'PRODUCT' ? item.productId : null,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'შეცდომა');
      }

      const sale = await res.json();
      const saleRecord: SaleRecord = {
        id: sale.id,
        total: sale.total,
        subtotal: sale.subtotal,
        discount: sale.discount,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        receiptNumber: sale.receiptNumber,
        createdAt: sale.createdAt,
        clientName: selectedClient?.name || null,
        staffName: selectedStaff?.name || null,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      };

      setCompletedSale(saleRecord);
      setSalesHistory((prev) => [saleRecord, ...prev]);
      clearCart();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (view === 'history') {
    return (
      <SalesHistory
        sales={salesHistory}
        onBack={() => setView('pos')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard size={24} className="text-primary-400" />
            POS / გადახდა
          </h1>
          <p className="text-dark-400 mt-1">გაყიდვების რეგისტრაცია</p>
        </div>
        <button
          onClick={() => setView('history')}
          className="btn-secondary flex items-center gap-2"
        >
          <History size={18} />
          ისტორია
        </button>
      </div>

      {/* Main Layout: Services + Cart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Services & Products Selection */}
        <div className="xl:col-span-2 space-y-4">
          {/* Tabs: Services / Products */}
          <div className="flex gap-2">
            <button
              onClick={() => { setPosTab('services'); setSearch(''); setSelectedCategory('all'); }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                posTab === 'services'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
              )}
            >
              სერვისები ({data.services.length})
            </button>
            <button
              onClick={() => { setPosTab('products'); setSearch(''); setSelectedCategory('all'); }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                posTab === 'products'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
              )}
            >
              პროდუქტები ({data.products.length})
            </button>
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={posTab === 'services' ? 'სერვისის ძებნა...' : 'პროდუქტის ძებნა...'}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Categories (only for services) */}
          {posTab === 'services' && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  selectedCategory === 'all'
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
                )}
              >
                ყველა
              </button>
              {data.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-colors',
                    selectedCategory === cat.id
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Services Grid */}
          {posTab === 'services' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => addToCart(service)}
                  className="card-hover text-left group p-3 hover:border-primary-500/30"
                >
                  <div className="text-xs text-dark-400 mb-1 truncate">
                    {service.categoryName || 'სხვა'}
                  </div>
                  <div className="font-medium text-white text-sm truncate mb-2">
                    {service.name}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold text-sm">
                      {formatCurrency(service.price)}
                    </span>
                    <span className="text-dark-500 text-xs flex items-center gap-1">
                      <Clock size={10} />
                      {service.duration}წთ
                    </span>
                  </div>
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded">
                      + დამატება
                    </span>
                  </div>
                </button>
              ))}
              {filteredServices.length === 0 && (
                <div className="col-span-full text-center py-8 text-dark-500">
                  სერვისი ვერ მოიძებნა
                </div>
              )}
            </div>
          )}

          {/* Products Grid */}
          {posTab === 'products' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProductToCart(product)}
                  disabled={product.stock === 0}
                  className={cn(
                    'card-hover text-left group p-3',
                    product.stock === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-emerald-500/30'
                  )}
                >
                  <div className="text-xs text-dark-400 mb-1 truncate">
                    {product.brand || product.category || 'სხვა'}
                  </div>
                  <div className="font-medium text-white text-sm truncate mb-2">
                    {product.name}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold text-sm">
                      {formatCurrency(product.price)}
                    </span>
                    <span className={cn(
                      'text-xs',
                      product.stock <= 3 ? 'text-amber-400' : 'text-dark-500'
                    )}>
                      {product.stock} მარაგი
                    </span>
                  </div>
                  {product.stock > 0 && (
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                        + დამატება
                      </span>
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="mt-2">
                      <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                        ამოწურულია
                      </span>
                    </div>
                  )}
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-8 text-dark-500">
                  პროდუქტი ვერ მოიძებნა
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="space-y-4">
          {/* Cart Card */}
          <div className="card sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ShoppingCart size={18} />
                კალათა
                {cart.length > 0 && (
                  <span className="text-xs bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-dark-400 hover:text-red-400 transition-colors"
                >
                  გასუფთავება
                </button>
              )}
            </div>

            {/* Client Selection */}
            <div className="relative mb-3">
              <div
                onClick={() => setShowClientDropdown(!showClientDropdown)}
                className="input flex items-center gap-2 cursor-pointer text-sm"
              >
                <User size={14} className="text-dark-400 shrink-0" />
                {selectedClient ? (
                  <span className="text-white truncate flex-1">{selectedClient.name}</span>
                ) : (
                  <span className="text-dark-400 flex-1">კლიენტის არჩევა (არასავალდ.)</span>
                )}
                {selectedClient ? (
                  <X
                    size={14}
                    className="text-dark-400 hover:text-white shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClient(null);
                    }}
                  />
                ) : (
                  <ChevronDown size={14} className="text-dark-400 shrink-0" />
                )}
              </div>
              {showClientDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                  <div className="p-2">
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="ძებნა..."
                      className="input text-xs py-1.5"
                      autoFocus
                    />
                  </div>
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setShowClientDropdown(false);
                        setClientSearch('');
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-600"
                    >
                      <span className="truncate">{client.name}</span>
                      {client.phone && (
                        <span className="text-xs text-dark-400 ml-2">{client.phone}</span>
                      )}
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="px-3 py-2 text-xs text-dark-400">ვერ მოიძებნა</div>
                  )}
                </div>
              )}
            </div>

            {/* Staff Selection */}
            <div className="relative mb-4">
              <div
                onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                className="input flex items-center gap-2 cursor-pointer text-sm"
              >
                <Users size={14} className="text-dark-400 shrink-0" />
                {selectedStaff ? (
                  <span className="text-white truncate flex-1">{selectedStaff.name}</span>
                ) : (
                  <span className="text-dark-400 flex-1">სპეციალისტი (არასავალდ.)</span>
                )}
                {selectedStaff ? (
                  <X
                    size={14}
                    className="text-dark-400 hover:text-white shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStaff(null);
                    }}
                  />
                ) : (
                  <ChevronDown size={14} className="text-dark-400 shrink-0" />
                )}
              </div>
              {showStaffDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                  {filteredStaff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStaff(s);
                        setShowStaffDropdown(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-600"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items */}
            {cart.length === 0 ? (
              <div className="text-center py-8 text-dark-500">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">კალათა ცარიელია</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-dark-800/50 rounded-lg p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate flex items-center gap-1.5">
                        {item.name}
                        <span className={cn(
                          'text-[9px] px-1 py-0.5 rounded',
                          item.type === 'SERVICE' ? 'bg-primary-500/20 text-primary-400' : 'bg-emerald-500/20 text-emerald-400'
                        )}>
                          {item.type === 'SERVICE' ? 'სერვ.' : 'პროდ.'}
                        </span>
                      </div>
                      <div className="text-xs text-dark-400">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-700"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm text-white w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-700"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-sm font-medium text-emerald-400 w-16 text-right">
                      {formatCurrency(item.total)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-dark-500 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Discount */}
            {cart.length > 0 && (
              <div className="border-t border-dark-700 pt-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() =>
                      setDiscountType(discountType === 'PERCENTAGE' ? null : 'PERCENTAGE')
                    }
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                      discountType === 'PERCENTAGE'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-dark-700 text-dark-400 hover:text-white'
                    )}
                  >
                    <Percent size={12} />%
                  </button>
                  <button
                    onClick={() => setDiscountType(discountType === 'FIXED' ? null : 'FIXED')}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                      discountType === 'FIXED'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-dark-700 text-dark-400 hover:text-white'
                    )}
                  >
                    ₾ ფიქს.
                  </button>
                  {discountType && (
                    <input
                      type="number"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder={discountType === 'PERCENTAGE' ? '0-100' : 'თანხა'}
                      className="input text-xs py-1 w-20"
                      min={0}
                      max={discountType === 'PERCENTAGE' ? 100 : subtotal}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Payment Method */}
            {cart.length > 0 && (
              <div className="border-t border-dark-700 pt-3 mb-4">
                <p className="text-xs text-dark-400 mb-2">გადახდის მეთოდი</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors',
                          paymentMethod === method.id
                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                            : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
                        )}
                      >
                        <Icon size={14} className={paymentMethod === method.id ? 'text-primary-400' : method.color} />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {cart.length > 0 && (
              <div className="mb-4">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="შენიშვნა (არასავალდ.)"
                  className="input text-xs"
                />
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="border-t border-dark-700 pt-3 space-y-2">
                <div className="flex justify-between text-sm text-dark-300">
                  <span>ჯამი</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-amber-400">
                    <span>ფასდაკლება</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-white pt-1">
                  <span>სულ</span>
                  <span className="text-emerald-400">{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            {/* Pay Button */}
            {cart.length > 0 && (
              <button
                onClick={processSale}
                disabled={isProcessing}
                className="btn-primary w-full mt-4 py-3 text-base flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    მუშავდება...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    გადახდა — {formatCurrency(total)}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
}
