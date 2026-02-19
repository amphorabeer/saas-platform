'use client';

export type ReceiptPrintData = {
  restaurantName: string;
  orderNumber: string;
  date: string;
  tableLabel: string;
  waiterName: string;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  /** Omit for pre-check (before payment) */
  paymentMethod?: string;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'ნაღდი',
  card: 'ბარათი',
  split: 'გაყოფილი',
};

export function ReceiptPrint({
  data,
  showPaymentMethod = true,
}: {
  data: ReceiptPrintData;
  showPaymentMethod?: boolean;
}) {
  const paymentLabel =
    data.paymentMethod != null
      ? PAYMENT_METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod
      : '';

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              #receipt-print-root, #receipt-print-root * { visibility: visible; }
              #receipt-print-root {
                position: absolute; left: 0; top: 0; width: 100%;
                background: white; color: black; font-size: 12px; font-family: monospace;
              }
            }
          `,
        }}
      />
      <div
        id="receipt-print-root"
        className="receipt-print mx-auto bg-white p-4 text-black hidden print:block"
        style={{ maxWidth: '80mm', fontFamily: 'monospace', fontSize: 12 }}
      >
        <div className="text-center font-semibold mb-2">{data.restaurantName}</div>
        <div className="border-t border-b border-black/20 py-2 my-2">
          <div>#{data.orderNumber} — {data.date}</div>
          <div>მაგიდა: {data.tableLabel}</div>
          <div>ოფიციანტი: {data.waiterName}</div>
        </div>
        <div className="border-b border-black/20 pb-2 mb-2">
          {data.items.map((row, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="flex-1 truncate">{row.name} × {row.quantity}</span>
              <span>₾{row.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>ჯამი:</span>
            <span>₾{data.subtotal.toFixed(2)}</span>
          </div>
          {data.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>ფასდაკლება:</span>
              <span>-₾{data.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t border-black/20 pt-2 mt-2">
            <span>სულ:</span>
            <span>₾{data.total.toFixed(2)}</span>
          </div>
          {showPaymentMethod && paymentLabel && (
            <div className="flex justify-between mt-1">
              <span>გადახდა:</span>
              <span>{paymentLabel}</span>
            </div>
          )}
        </div>
        <div className="text-center font-semibold mt-4 pt-4 border-t border-black/20">
          გმადლობთ!
        </div>
      </div>
    </>
  );
}
