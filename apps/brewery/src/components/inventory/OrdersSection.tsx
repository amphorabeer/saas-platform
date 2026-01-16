'use client'

import { useBreweryStore } from '@/store'


export function OrdersSection() {
  const orders = useBreweryStore(state => state.orders || [])
  const updateOrder = useBreweryStore(state => state.updateOrder)
  
  const statusLabels: Record<string, string> = {
    pending: 'მოლოდინში',
    ordered: 'შეკვეთილი',
    shipped: 'გაგზავნილი',
    delivered: 'მიღებული',
    cancelled: 'გაუქმებული',
  }
  
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    ordered: 'bg-blue-500',
    shipped: 'bg-purple-500',
    delivered: 'bg-green-500',
    cancelled: 'bg-red-500',
  }
  
  return (
    <div className="space-y-4">
      {orders.length > 0 ? (
        orders.map(order => (
          <div key={order.id} className="bg-bg-card border border-border rounded-xl p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">{order.id}</h3>
                <p className="text-sm text-text-muted">
                  მომწოდებელი: {order.supplier}
                </p>
                <p className="text-sm text-text-muted">
                  შეკვეთის თარიღი: {new Date(order.orderedAt).toLocaleDateString('ka-GE')}
                </p>
                {order.expectedDelivery && (
                  <p className="text-sm text-text-muted">
                    მოსალოდნელი მიწოდება: {new Date(order.expectedDelivery).toLocaleDateString('ka-GE')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <select
                  value={order.status}
                  onChange={(e) => updateOrder(order.id, { 
                    status: e.target.value as any,
                    deliveredAt: e.target.value === 'delivered' ? new Date() : undefined,
                  })}
                  className={`px-3 py-1 rounded text-white text-sm ${statusColors[order.status]}`}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {order.totalAmount && (
                  <p className="mt-2 font-bold text-copper">{order.totalAmount.toFixed(2)} ₾</p>
                )}
              </div>
            </div>
            
            {/* Items */}
            <div className="space-y-1">
              {order.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm py-1 border-t border-border/50">
                  <span>{item.ingredientName}</span>
                  <span>{item.quantity} {item.unit}</span>
                </div>
              ))}
            </div>
            
            {order.notes && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-sm text-text-muted italic">{order.notes}</p>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-text-muted">
          <p className="text-4xl mb-4">📦</p>
          <p>შეკვეთები არ არის</p>
        </div>
      )}
    </div>
  )
}









