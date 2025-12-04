'use client'

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

interface KitchenDisplayProps {
  orders: Order[]
}

export default function KitchenDisplay({ orders }: KitchenDisplayProps) {
  if (orders.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">სამზარეულოს დისპლეი</h2>
        <div className="text-center py-12 text-gray-500">
          არ არის აქტიური შეკვეთები
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">სამზარეულოს დისპლეი</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold text-lg">მაგიდა {order.tableNumber}</div>
                <div className="text-sm text-gray-600">მიმტანი: {order.waiter}</div>
                <div className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleTimeString('ka-GE')}
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                order.status === 'pending' ? 'bg-yellow-500 text-white' :
                order.status === 'preparing' ? 'bg-blue-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                {order.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-3">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <div className="font-medium">{item.quantity}x {item.name}</div>
                    {item.notes && (
                      <div className="text-xs text-gray-500">{item.notes}</div>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    item.status === 'pending' ? 'bg-yellow-200' :
                    item.status === 'preparing' ? 'bg-blue-200' :
                    'bg-green-200'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                მომზადება
              </button>
              <button className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                მზადაა
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}




