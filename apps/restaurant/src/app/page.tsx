'use client'

import { useState, useEffect } from 'react'
import TableLayout from '../components/TableLayout'
import OrderPanel from '../components/OrderPanel'
import KitchenDisplay from '../components/KitchenDisplay'
import MenuManager from '../components/MenuManager'

interface Table {
  id: string
  number: number
  seats: number
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  currentOrder?: Order
  zone: string
}

interface Order {
  id: string
  tableNumber: number
  items: OrderItem[]
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid'
  totalAmount: number
  waiter: string
  createdAt: Date
}

interface OrderItem {
  id: string
  menuItemId: string
  name: string
  quantity: number
  price: number
  notes?: string
  status: 'pending' | 'preparing' | 'ready' | 'served'
}

export default function RestaurantDashboard() {
  const [activeTab, setActiveTab] = useState('tables')
  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showOrderPanel, setShowOrderPanel] = useState(false)

  // Initialize tables
  useEffect(() => {
    // Generate sample tables
    const sampleTables: Table[] = []
    
    // Main Hall - 10 tables
    for (let i = 1; i <= 10; i++) {
      sampleTables.push({
        id: `table-${i}`,
        number: i,
        seats: i <= 6 ? 4 : 6,
        status: i === 3 ? 'occupied' : i === 7 ? 'reserved' : 'available',
        zone: 'Main Hall'
      })
    }
    
    // VIP Zone - 4 tables
    for (let i = 11; i <= 14; i++) {
      sampleTables.push({
        id: `table-${i}`,
        number: i,
        seats: 8,
        status: i === 12 ? 'occupied' : 'available',
        zone: 'VIP Zone'
      })
    }
    
    // Terrace - 6 tables
    for (let i = 15; i <= 20; i++) {
      sampleTables.push({
        id: `table-${i}`,
        number: i,
        seats: 4,
        status: 'available',
        zone: 'Terrace'
      })
    }
    
    setTables(sampleTables)
    
    // Sample orders
    setOrders([
      {
        id: 'order-1',
        tableNumber: 3,
        items: [
          { id: '1', menuItemId: '1', name: 'ხაჭაპური', quantity: 2, price: 15, status: 'served' },
          { id: '2', menuItemId: '2', name: 'მწვადი', quantity: 3, price: 18, status: 'preparing' }
        ],
        status: 'preparing',
        totalAmount: 84,
        waiter: 'გიორგი',
        createdAt: new Date()
      },
      {
        id: 'order-2',
        tableNumber: 12,
        items: [
          { id: '3', menuItemId: '3', name: 'ხინკალი', quantity: 20, price: 1.5, status: 'ready' }
        ],
        status: 'ready',
        totalAmount: 30,
        waiter: 'მარიამ',
        createdAt: new Date()
      }
    ])
  }, [])

  // Statistics
  const stats = {
    totalTables: tables.length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    available: tables.filter(t => t.status === 'available').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    activeOrders: orders.filter(o => o.status !== 'paid').length,
    todayRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0)
  }

  const handleTableClick = (table: Table) => {
    setSelectedTable(table)
    setShowOrderPanel(true)
  }

  const handleTableStatusChange = (tableId: string, status: string) => {
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, status: status as Table['status'] } : t
    ))
  }

  const handleCreateOrder = (tableNumber: number, items: OrderItem[]) => {
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      tableNumber,
      items,
      status: 'pending',
      totalAmount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      waiter: 'Current User',
      createdAt: new Date()
    }
    
    setOrders(prev => [...prev, newOrder])
    
    // Update table status
    setTables(prev => prev.map(t => 
      t.number === tableNumber ? { ...t, status: 'occupied', currentOrder: newOrder } : t
    ))
    
    setShowOrderPanel(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🍽️ Restaurant Management</h1>
            <p className="text-sm text-gray-500">Restaurant Plaza Dashboard</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              + ახალი შეკვეთა
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
              ⚙️ პარამეტრები
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">სულ მაგიდები</p>
                <p className="text-2xl font-bold">{stats.totalTables}</p>
              </div>
              <span className="text-2xl">🪑</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">თავისუფალი</p>
                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              </div>
              <span className="text-2xl">✅</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">დაკავებული</p>
                <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
              </div>
              <span className="text-2xl">🍽️</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">დაჯავშნული</p>
                <p className="text-2xl font-bold text-blue-600">{stats.reserved}</p>
              </div>
              <span className="text-2xl">📅</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">აქტიური შეკვეთები</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.activeOrders}</p>
              </div>
              <span className="text-2xl">📝</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">დღევანდელი შემოსავალი</p>
                <p className="text-2xl font-bold text-purple-600">₾{stats.todayRevenue}</p>
              </div>
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6">
        <div className="bg-white rounded-t-lg shadow">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === 'tables' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🪑 მაგიდები
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === 'orders' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 შეკვეთები
            </button>
            <button
              onClick={() => setActiveTab('kitchen')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === 'kitchen' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👨‍🍳 სამზარეულო
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === 'menu' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📜 მენიუ
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-b-lg shadow min-h-[500px]">
          {activeTab === 'tables' && (
            <TableLayout 
              tables={tables}
              onTableClick={handleTableClick}
              onStatusChange={handleTableStatusChange}
            />
          )}
          
          {activeTab === 'orders' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">აქტიური შეკვეთები</h2>
              <OrdersList orders={orders} />
            </div>
          )}
          
          {activeTab === 'kitchen' && (
            <KitchenDisplay orders={orders.filter(o => o.status === 'pending' || o.status === 'preparing')} />
          )}
          
          {activeTab === 'menu' && (
            <MenuManager />
          )}
        </div>
      </div>

      {/* Order Panel Modal */}
      {showOrderPanel && selectedTable && (
        <OrderPanel
          table={selectedTable}
          onClose={() => setShowOrderPanel(false)}
          onCreateOrder={handleCreateOrder}
        />
      )}
    </div>
  )
}

// Orders List Component
function OrdersList({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-3 text-sm font-medium text-gray-600">მაგიდა</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">შეკვეთა</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">სტატუსი</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">თანხა</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">მიმტანი</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">დრო</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-500">
                აქტიური შეკვეთები არ არის
              </td>
            </tr>
          ) : (
            orders.map(order => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="p-3">მაგიდა {order.tableNumber}</td>
                <td className="p-3">
                  {order.items.map(item => (
                    <div key={item.id} className="text-sm">
                      {item.quantity}x {item.name}
                    </div>
                  ))}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'ready' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-3 font-medium">₾{order.totalAmount}</td>
                <td className="p-3">{order.waiter}</td>
                <td className="p-3 text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleTimeString('ka-GE')}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}




