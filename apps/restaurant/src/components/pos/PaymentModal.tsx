'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NumPad } from './NumPad';
import { SplitBillPanel } from './SplitBillPanel';
import { ReceiptPrint, type ReceiptPrintData } from './ReceiptPrint';

type PaymentMethod = 'cash' | 'card' | 'split';

export function PaymentModal({
  open,
  onClose,
  onDoneAfterSuccess,
  totalAmount,
  onConfirm,
  loading,
  paymentSuccess,
  receiptData,
}: {
  open: boolean;
  onClose: () => void;
  onDoneAfterSuccess?: () => void;
  totalAmount: number;
  onConfirm: (params: {
    paymentMethod: string;
    paidAmount?: number;
    tipAmount?: number;
    splits?: { amount: number; paymentMethod: string; paidBy: string }[];
  }) => Promise<void>;
  loading: boolean;
  paymentSuccess?: boolean;
  receiptData?: ReceiptPrintData | null;
}) {
  const [step, setStep] = useState<'method' | 'cash' | 'card' | 'split' | 'success'>('method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidValue, setPaidValue] = useState('');
  const [tipValue, setTipValue] = useState('');
  const [cardType, setCardType] = useState('');

  const paidAmount = parseFloat(paidValue) || 0;
  const tipAmount = parseFloat(tipValue) || 0;
  const change = paymentMethod === 'cash' && paidAmount >= totalAmount ? paidAmount - totalAmount : 0;

  const handleMethodSelect = (m: PaymentMethod) => {
    setPaymentMethod(m);
    if (m === 'cash') {
      setPaidValue('');
      setTipValue('');
      setStep('cash');
    } else if (m === 'split') {
      setStep('split');
    } else {
      setTipValue('');
      setCardType('');
      setStep('card');
    }
  };

  const handleCashConfirm = async () => {
    if (paidAmount < totalAmount) return;
    await onConfirm({
      paymentMethod: 'cash',
      paidAmount,
      tipAmount,
    });
    setStep('success');
    setPaidValue('');
    setTipValue('');
  };

  const handleCardConfirm = async () => {
    if (!cardType) return;
    await onConfirm({
      paymentMethod: cardType ? `card:${cardType}` : 'card',
      tipAmount: parseFloat(tipValue) || 0,
    });
    setStep('success');
  };

  const handleSplitConfirm = async (splits: { amount: number; paymentMethod: string; paidBy: string }[], tipAmount: number) => {
    await onConfirm({
      paymentMethod: 'split',
      splits,
      tipAmount,
    });
    setStep('success');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDone = () => {
    setStep('method');
    setCardType('');
    if (onDoneAfterSuccess) onDoneAfterSuccess();
    else onClose();
  };

  const quickAmounts = [20, 50, 100, totalAmount];

  const showSuccess = step === 'success' || (paymentSuccess && receiptData);

  return (
    <Modal open={open} onClose={onClose} title="გადახდა" maxWidth="md">
      {/* === SUCCESS === */}
      {showSuccess && receiptData && (
        <div className="space-y-4">
          <p className="text-emerald-400 font-medium">გადახდა წარმატებით შესრულდა</p>
          <div className="sr-only print:not-sr-only" aria-hidden>
            <ReceiptPrint data={receiptData} />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 py-2.5 font-medium text-white hover:bg-white/10"
            >
              🖨️ ბეჭდვა
            </button>
            <button
              type="button"
              onClick={handleDone}
              className="flex flex-1 items-center justify-center rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600"
            >
              დასრულება
            </button>
          </div>
        </div>
      )}

      {/* === METHOD SELECT === */}
      {!showSuccess && step === 'method' && (
        <div className="space-y-4">
          <p className="text-xl font-bold text-white">₾{totalAmount.toFixed(2)}</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleMethodSelect('cash')}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-center hover:bg-orange-500/20 hover:border-orange-500/30 transition"
            >
              <span className="text-2xl block mb-1">💵</span>
              <span className="font-medium text-white">ნაღდი</span>
            </button>
            <button
              type="button"
              onClick={() => handleMethodSelect('card')}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-center hover:bg-orange-500/20 hover:border-orange-500/30 transition"
            >
              <span className="text-2xl block mb-1">💳</span>
              <span className="font-medium text-white">ბარათი</span>
            </button>
            <button
              type="button"
              onClick={() => handleMethodSelect('split')}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-center hover:bg-orange-500/20 hover:border-orange-500/30 transition"
            >
              <span className="text-2xl block mb-1">✂️</span>
              <span className="font-medium text-white">გაყოფა</span>
            </button>
          </div>
        </div>
      )}

      {/* === CASH === */}
      {!showSuccess && step === 'cash' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">მიღებული თანხა</p>
          <div className="rounded-xl bg-white/5 px-4 py-3 text-2xl font-semibold text-white">
            {paidValue || '0'} ₾
          </div>
          {paidAmount >= totalAmount && (
            <div className="text-emerald-400">
              ხურდა: ₾{change.toFixed(2)}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {quickAmounts.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setPaidValue(String(a))}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                ₾{a}
              </button>
            ))}
          </div>
          <NumPad value={paidValue} onChange={setPaidValue} />
          <div>
            <label className="block text-sm text-slate-400 mb-1">ჩაი (ოფციონალური)</label>
            <div className="flex gap-2">
              {[5, 10, 15].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTipValue(String((totalAmount * p) / 100))}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white"
                >
                  {p}%
                </button>
              ))}
              <input
                type="number"
                step="0.01"
                value={tipValue}
                onChange={(e) => setTipValue(e.target.value)}
                placeholder="₾"
                className="w-24 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('method')}
              className="flex-1 rounded-xl border border-white/20 py-2.5 text-slate-300 hover:bg-white/5"
            >
              უკან
            </button>
            <button
              type="button"
              onClick={handleCashConfirm}
              disabled={paidAmount < totalAmount || loading}
              className="flex-1 rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? '...' : 'დადასტურება'}
            </button>
          </div>
        </div>
      )}

      {/* === CARD === */}
      {!showSuccess && step === 'card' && (
        <div className="space-y-4">
          <p className="text-xl font-bold text-white">₾{totalAmount.toFixed(2)}</p>
          <p className="text-sm text-slate-400">ბარათის ტიპი</p>
          <div className="grid grid-cols-2 gap-2">
            {['Visa', 'MasterCard', 'AmEx', 'TBC Bank', 'BOG', 'სხვა'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCardType(type)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  cardType === type
                    ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">ჩაი (ოფციონალური)</label>
            <div className="flex gap-2">
              {[5, 10, 15].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTipValue(String((totalAmount * p) / 100))}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                >
                  {p}%
                </button>
              ))}
              <input
                type="number"
                step="0.01"
                value={tipValue}
                onChange={(e) => setTipValue(e.target.value)}
                placeholder="₾"
                className="w-24 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('method')}
              className="flex-1 rounded-xl border border-white/20 py-2.5 text-slate-300 hover:bg-white/5"
            >
              უკან
            </button>
            <button
              type="button"
              onClick={handleCardConfirm}
              disabled={loading || !cardType}
              className="flex-1 rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? '...' : 'დადასტურება'}
            </button>
          </div>
        </div>
      )}

      {/* === SPLIT === */}
      {!showSuccess && step === 'split' && (
        <SplitBillPanel
          totalAmount={totalAmount}
          onConfirm={handleSplitConfirm}
          onCancel={() => setStep('method')}
        />
      )}
    </Modal>
  );
}