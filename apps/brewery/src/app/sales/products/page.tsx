'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  name: string
  style?: string | null
  abv?: number | null
  packageType: string
  packageTypeName?: string
  totalProduced: number
  soldQuantity: number
  reservedQuantity?: number
  availableQuantity: number
  pricePerUnit?: number
}

const getPackageTypeName = (type: string): string => {
  const names: Record<string, string> = {
    KEG_50: 'კეგი 50L',
    KEG_30: 'კეგი 30L',
    KEG_20: 'კეგი 20L',
    BOTTLE_750: 'ბოთლი 750ml',
    BOTTLE_500: 'ბოთლი 500ml',
    BOTTLE_330: 'ბოთლი 330ml',
    CAN_500: 'ქილა 500ml',
    CAN_330: 'ქილა 330ml',
  }
  return names[type] || type
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    available: { label: 'ხელმისაწვდომი', color: 'text-green-400', bg: 'bg-green-400/20' },
    low_stock: { label: 'დაბალი მარაგი', color: 'text-amber-400', bg: 'bg-amber-400/20' },
    sold_out: { label: 'გაყიდული', color: 'text-red-400', bg: 'bg-red-400/20' },
  }
  const c = config[status] || config.available
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>{c.label}</span>
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState({
    total: 0,
    kegs: 0,
    bottles: 0,
    cans: 0,
    totalProduced: 0,
    totalSold: 0,
    totalAvailable: 0,
  })
  const [loading, setLoading] = useState(true)
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all')

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (packageTypeFilter !== 'all') params.append('packageType', packageTypeFilter)
        if (availabilityFilter === 'available') params.append('availableOnly', 'true')

        const res = await fetch(`/api/products?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || [])
          // Map API response to our stats format
          const apiStats = data.stats || {}
          setStats({
            total: apiStats.totalProducts || 0,
            kegs: apiStats.kegs || 0,
            bottles: apiStats.bottles || 0,
            cans: apiStats.cans || 0,
            totalProduced: apiStats.totalProduced || 0,
            totalSold: apiStats.totalSold || 0,
            totalAvailable: apiStats.totalAvailable || 0,
          })
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [packageTypeFilter, availabilityFilter])

  const filteredProducts = products

  return (
    <DashboardLayout 
      title="🍺 პროდუქტების მართვა"
      breadcrumb="მთავარი / გაყიდვები / პროდუქტები"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="ghost" size="sm">← უკან</Button>
          </Link>
          <h2 className="text-2xl font-bold text-text-primary">პროდუქტები</h2>
        </div>
      </div>
      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl mb-1">📦</div>
          <div className="text-2xl font-bold text-copper">{stats?.total || products.length}</div>
          <div className="text-xs text-text-muted">სულ პროდუქტი</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl mb-1">🛢️</div>
          <div className="text-2xl font-bold text-amber-400">{stats?.kegs || 0}</div>
          <div className="text-xs text-text-muted">კეგები</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl mb-1">🍾</div>
          <div className="text-2xl font-bold text-green-400">{stats?.bottles || 0}</div>
          <div className="text-xs text-text-muted">ბოთლები</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl mb-1">🥫</div>
          <div className="text-2xl font-bold text-blue-400">{stats?.cans || 0}</div>
          <div className="text-xs text-text-muted">ქილები</div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-2">შეფუთვის ტიპი</label>
              <select
                value={packageTypeFilter}
                onChange={(e) => setPackageTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
              >
                <option value="all">ყველა</option>
                <option value="KEG_50">კეგი 50L</option>
                <option value="KEG_30">კეგი 30L</option>
                <option value="KEG_20">კეგი 20L</option>
                <option value="BOTTLE_750">ბოთლი 750ml</option>
                <option value="BOTTLE_500">ბოთლი 500ml</option>
                <option value="BOTTLE_330">ბოთლი 330ml</option>
                <option value="CAN_500">ქილა 500ml</option>
                <option value="CAN_330">ქილა 330ml</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-2">ხელმისაწვდომობა</label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
              >
                <option value="all">ყველა</option>
                <option value="available">ხელმისაწვდომი</option>
                <option value="low_stock">დაბალი მარაგი</option>
                <option value="sold_out">გაყიდული</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>📦 პროდუქტების სია ({filteredProducts.length})</CardHeader>
        <CardBody noPadding>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              პროდუქტები არ მოიძებნა
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">
                  <th className="px-4 py-3">პროდუქტი</th>
                  <th className="px-4 py-3">შეფუთვა</th>
                  <th className="px-4 py-3 text-right">წარმოებული</th>
                  <th className="px-4 py-3 text-right">გაყიდული</th>
                  <th className="px-4 py-3 text-right">დაჯავშნილი</th>
                  <th className="px-4 py-3 text-right">ხელმისაწვდომი</th>
                  <th className="px-4 py-3">სტატუსი</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr
                    key={product.id}
                    className="border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{product.name}</p>
                      {product.style && (
                        <p className="text-xs text-text-muted">{product.style}</p>
                      )}
                      {product.abv && (
                        <p className="text-xs text-text-muted">ABV: {product.abv}%</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{product.packageTypeName || getPackageTypeName(product.packageType)}</td>
                    <td className="px-4 py-3 text-right font-mono">{product.totalProduced}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-400">
                      {product.soldQuantity || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400">
                      {product.reservedQuantity || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-green-400 font-bold">
                      {product.availableQuantity}
                    </td>
                    <td className="px-4 py-3">
                      {product.availableQuantity === 0
                        ? getStatusBadge('sold_out')
                        : product.availableQuantity < 10
                        ? getStatusBadge('low_stock')
                        : getStatusBadge('available')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </DashboardLayout>
  )
}
