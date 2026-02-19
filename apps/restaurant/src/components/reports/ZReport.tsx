'use client';

export function ZReport({
  date,
  firstOrderTime,
  lastOrderTime,
  totalOrders,
  totalSales,
  cashTotal,
  cardTotal,
  splitTotal,
  tipsTotal,
  discountsTotal,
  cancelledCount,
  cancelledAmount,
  netSales,
  onPrint,
}: {
  date: string;
  firstOrderTime: string | null;
  lastOrderTime: string | null;
  totalOrders: number;
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
  splitTotal: number;
  tipsTotal: number;
  discountsTotal: number;
  cancelledCount: number;
  cancelledAmount: number;
  netSales: number;
  onPrint: () => void;
}) {
  return (
    <div className="space-y-4 print:bg-white print:text-black">
      <div className="flex justify-between items-center print:mb-4">
        <h2 className="text-lg font-bold text-white print:text-black">Z-რეპორტი</h2>
        <button
          type="button"
          onClick={onPrint}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 print:hidden"
        >
          Print
        </button>
      </div>
      <p className="text-slate-400 print:text-gray-600">თარიღი: {date}</p>
      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4 print:border-gray-300 print:bg-gray-50">
          <p className="text-sm text-slate-400 print:text-gray-600">გახსნის დრო</p>
          <p className="font-medium text-white print:text-black">{firstOrderTime ? new Date(firstOrderTime).toLocaleTimeString('ka-GE') : '—'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4 print:border-gray-300 print:bg-gray-50">
          <p className="text-sm text-slate-400 print:text-gray-600">დახურვის დრო</p>
          <p className="font-medium text-white print:text-black">{lastOrderTime ? new Date(lastOrderTime).toLocaleTimeString('ka-GE') : '—'}</p>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4 space-y-2 print:border-gray-300 print:bg-gray-50">
        <Row label="სულ შეკვეთები" value={String(totalOrders)} />
        <Row label="სულ გაყიდვები (₾)" value={totalSales.toFixed(2)} />
        <Row label="ნაღდი (₾)" value={cashTotal.toFixed(2)} />
        <Row label="ბარათი (₾)" value={cardTotal.toFixed(2)} />
        {splitTotal > 0 && <Row label="Split (₾)" value={splitTotal.toFixed(2)} />}
        <Row label="Tips (₾)" value={tipsTotal.toFixed(2)} />
        <Row label="ფასდაკლებები (₾)" value={discountsTotal.toFixed(2)} />
        <Row label="გაუქმებული (ცალი)" value={String(cancelledCount)} />
        <Row label="გაუქმებული (₾)" value={cancelledAmount.toFixed(2)} />
        <Row label="ნეტო გაყიდვები (₾)" value={netSales.toFixed(2)} highlight />
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${highlight ? 'font-bold text-orange-400 print:text-orange-700' : 'text-slate-300 print:text-gray-800'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
