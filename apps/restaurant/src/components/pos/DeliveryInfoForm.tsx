'use client';

import { usePOSStore } from '@/stores/posStore';

export function DeliveryInfoForm() {
  const customerName = usePOSStore((s) => s.customerName);
  const customerPhone = usePOSStore((s) => s.customerPhone);
  const deliveryAddress = usePOSStore((s) => s.deliveryAddress);
  const setCustomer = usePOSStore((s) => s.setCustomer);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-slate-400 mb-1">სახელი</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomer({ customerName: e.target.value })}
          placeholder="მომხმარებელი"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">ტელეფონი</label>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomer({ customerPhone: e.target.value })}
          placeholder="+995..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">მისამართი</label>
        <textarea
          value={deliveryAddress}
          onChange={(e) => setCustomer({ deliveryAddress: e.target.value })}
          placeholder="მიწოდების მისამართი"
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
        />
      </div>
    </div>
  );
}
