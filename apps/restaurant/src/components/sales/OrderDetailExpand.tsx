'use client';

export function OrderDetailExpand({
  items,
}: {
  items: Array<{
    id: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    modifiers?: unknown;
  }>;
}) {
  return (
    <div className="border-t border-white/5 bg-white/5 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-slate-400">პოზიციები</p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="pb-1">კერძი</th>
            <th className="pb-1 text-right">რაოდ.</th>
            <th className="pb-1 text-right">ფასი</th>
            <th className="pb-1 text-right">ჯამი</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="text-slate-300">
              <td className="py-0.5">{i.menuItemName}</td>
              <td className="text-right py-0.5">{i.quantity}</td>
              <td className="text-right py-0.5">₾{i.unitPrice.toFixed(2)}</td>
              <td className="text-right py-0.5 text-emerald-400">₾{i.totalPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
