'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerTaxId: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes: string | null;
  items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>;
  payments: Array<{ amount: number; paymentMethod: string; paidAt: string; notes?: string | null }>;
};

type SettingsOrg = {
  company: string | null;
  taxId: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankSWIFT: string | null;
  directorName: string | null;
};

type RestaurantSettings = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  organization?: SettingsOrg | null;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'შავი',
  SENT: 'გაგზავნილი',
  PAID: 'გადახდილი',
  PARTIAL: 'ნაწილობრივი',
  OVERDUE: 'ვადაგადაცილებული',
  CANCELLED: 'გაუქმებული',
};

export default function InvoicePrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/finance/invoices/${id}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/settings/restaurant', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([inv, rest]) => {
        setInvoice(inv);
        setSettings(rest ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && invoice) {
      window.print();
    }
  }, [loading, invoice]);

  if (loading || !invoice) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 40, fontFamily: 'sans-serif', color: '#000', background: '#fff', minHeight: '100vh' }}>
        {loading ? <p>იტვირთება...</p> : <p>ინვოისი არ მოიძებნა.</p>}
      </div>
    );
  }

  const org = settings?.organization;
  const restaurant = settings as RestaurantSettings | null;
  const companyName = org?.company || restaurant?.name || '';
  const taxId = org?.taxId || restaurant?.taxId || '';
  const remaining = invoice.totalAmount - invoice.paidAmount;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              nav, aside, header, [data-sidebar], .sidebar { display: none !important; }
              main, [data-main], .main-content { margin-left: 0 !important; padding: 0 !important; width: 100% !important; }
            }
          `,
        }}
      />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 40, fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
        {/* Header: Company info (seller) */}
        <div style={{ borderBottom: '2px solid #000', paddingBottom: 20, marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{companyName}</h2>
          {restaurant?.address && <p style={{ margin: '8px 0 0', fontSize: 14 }}>{restaurant.address}</p>}
          {taxId && <p style={{ margin: '4px 0 0', fontSize: 14 }}>საიდენტ. კოდი: {taxId}</p>}
          <p style={{ margin: '4px 0 0', fontSize: 14 }}>
            ტელ: {restaurant?.phone ?? '—'}
            {restaurant?.email ? ` | ${restaurant.email}` : ''}
          </p>
          <div style={{ marginTop: 10 }}>
            {org?.bankName && <p style={{ margin: '2px 0', fontSize: 14 }}><strong>ბანკი:</strong> {org.bankName}</p>}
            {org?.bankAccount && <p style={{ margin: '2px 0', fontSize: 14 }}><strong>IBAN:</strong> {org.bankAccount}</p>}
            {org?.bankSWIFT && <p style={{ margin: '2px 0', fontSize: 14 }}><strong>SWIFT:</strong> {org.bankSWIFT}</p>}
          </div>
        </div>

        {/* Invoice number + dates */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>ინვოისი {invoice.invoiceNumber}</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            თარიღი: {invoice.issueDate}
            {invoice.dueDate ? ` | ვადა: ${invoice.dueDate}` : ''}
          </p>
          <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 10px', fontSize: 12, border: '1px solid #000', borderRadius: 4 }}>
            {STATUS_LABEL[invoice.status] ?? invoice.status}
          </span>
        </div>

        {/* Buyer info */}
        <div style={{ border: '1px solid #ddd', padding: 15, marginBottom: 30, borderRadius: 4 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>მყიდველი</h3>
          <p style={{ margin: '4px 0', fontWeight: 600 }}>{invoice.customerName}</p>
          {invoice.customerTaxId && <p style={{ margin: '4px 0', fontSize: 14 }}>საიდენტ. კოდი: {invoice.customerTaxId}</p>}
          {invoice.customerAddress && <p style={{ margin: '4px 0', fontSize: 14 }}>{invoice.customerAddress}</p>}
          {(invoice.customerPhone || invoice.customerEmail) && (
            <p style={{ margin: '4px 0', fontSize: 14 }}>
              ტელ: {invoice.customerPhone ?? '—'}
              {invoice.customerEmail ? ` | ${invoice.customerEmail}` : ''}
            </p>
          )}
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>#</th>
              <th style={{ textAlign: 'left', padding: 8 }}>სერვისი</th>
              <th style={{ textAlign: 'center', padding: 8 }}>რაოდენობა</th>
              <th style={{ textAlign: 'right', padding: 8 }}>ფასი</th>
              <th style={{ textAlign: 'right', padding: 8 }}>ჯამი</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((i, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 8 }}>{idx + 1}</td>
                <td style={{ padding: 8 }}>{i.description}</td>
                <td style={{ textAlign: 'center', padding: 8 }}>{i.quantity}</td>
                <td style={{ textAlign: 'right', padding: 8 }}>₾{i.unitPrice.toFixed(2)}</td>
                <td style={{ textAlign: 'right', padding: 8 }}>₾{i.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ textAlign: 'right', marginBottom: 30 }}>
          <p style={{ margin: '4px 0' }}>Subtotal: ₾{invoice.subtotal.toFixed(2)}</p>
          {invoice.discountAmount > 0 && (
            <p style={{ margin: '4px 0' }}>ფასდაკლება: -₾{invoice.discountAmount.toFixed(2)}</p>
          )}
          <p style={{ margin: '4px 0' }}>დღგ ({invoice.taxRate}%): ₾{invoice.taxAmount.toFixed(2)}</p>
          <p style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 700 }}>სულ ჯამი: ₾{invoice.totalAmount.toFixed(2)}</p>
          {invoice.paidAmount > 0 && <p style={{ margin: '4px 0' }}>გადახდილი: ₾{invoice.paidAmount.toFixed(2)}</p>}
          {remaining > 0 && (
            <p style={{ margin: '4px 0', color: 'red', fontWeight: 700 }}>დარჩენილი: ₾{remaining.toFixed(2)}</p>
          )}
        </div>

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <div style={{ marginBottom: 30, paddingTop: 15, borderTop: '1px solid #ddd' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>გადახდები</h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {invoice.payments.map((p, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  ₾{p.amount.toFixed(2)} — {p.paymentMethod} — {p.paidAt.slice(0, 10)}
                  {p.notes ? ` — ${p.notes}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div style={{ marginBottom: 30 }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, color: '#444' }}>შენიშვნა:</p>
            <p style={{ margin: 0, fontSize: 14 }}>{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #ddd', paddingTop: 15, marginTop: 30, textAlign: 'center', color: '#666', fontSize: 14 }}>
          <p style={{ margin: 0 }}>დანიშნულება გადარიცხვისას: {invoice.invoiceNumber}</p>
          {org?.directorName && <p style={{ margin: '4px 0 0' }}>ხელმძღვანელი: {org.directorName}</p>}
          <p style={{ marginTop: 10 }}>გმადლობთ თანამშრომლობისთვის!</p>
        </div>

        {/* Print button (hidden on print) */}
        <div className="no-print" style={{ textAlign: 'center', marginTop: 30 }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ marginRight: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}
          >
            🖨️ ბეჭდვა
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}
          >
            დახურვა
          </button>
        </div>
      </div>
    </>
  );
}
