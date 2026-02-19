'use client';

import { useState } from 'react';

export type SplitMode = 'equal' | 'items' | 'amount';

type SplitGuest = {
  id: string;
  amount: number;
  paymentMethod: string;
  paidBy: string;
};

export function SplitBillPanel({
  totalAmount,
  onConfirm,
  onCancel,
}: {
  totalAmount: number;
  onConfirm: (splits: { amount: number; paymentMethod: string; paidBy: string }[], tipAmount: number) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<SplitMode>('equal');
  const [parts, setParts] = useState(2);
  const [tipValue, setTipValue] = useState('');
  const [guests, setGuests] = useState<SplitGuest[]>([
    { id: '1', amount: totalAmount / 2, paymentMethod: 'cash', paidBy: 'სტუმარი 1' },
    { id: '2', amount: totalAmount / 2, paymentMethod: 'cash', paidBy: 'სტუმარი 2' },
  ]);

  const updateEqualParts = (n: number) => {
    const num = Math.min(10, Math.max(2, n));
    setParts(num);
    const perPart = totalAmount / num;
    setGuests(
      Array.from({ length: num }, (_, i) => ({
        id: String(i + 1),
        amount: Math.round(perPart * 100) / 100,
        paymentMethod: 'cash',
        paidBy: `სტუმარი ${i + 1}`,
      }))
    );
  };

  const handleConfirm = () => {
    const sum = guests.reduce((s, g) => s + g.amount, 0);
    if (Math.abs(sum - totalAmount) > 0.02) {
      return;
    }
    const tipAmount = Math.max(0, parseFloat(tipValue) || 0);
    onConfirm(
      guests.map((g) => ({ amount: g.amount, paymentMethod: g.paymentMethod, paidBy: g.paidBy })),
      tipAmount
    );
  };

  const totalEntered = guests.reduce((s, g) => s + g.amount, 0);
  const isValid = Math.abs(totalEntered - totalAmount) < 0.02;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['equal', 'amount'] as SplitMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              if (m === 'equal') updateEqualParts(2);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mode === m ? 'bg-orange-500/30 text-orange-200' : 'bg-white/5 text-slate-400'
            }`}
          >
            {m === 'equal' ? 'თანაბარი' : 'თანხით'}
          </button>
        ))}
      </div>

      {mode === 'equal' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">ნაწილების რაოდენობა:</span>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateEqualParts(n)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium ${
                    parts === n ? 'bg-orange-500 text-white' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-auto">
            {guests.map((g, i) => (
              <div key={g.id} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                <span className="text-sm text-slate-400 w-24">{g.paidBy}</span>
                <span className="font-medium text-white flex-1">₾{g.amount.toFixed(2)}</span>
                <select
                  value={g.paymentMethod}
                  onChange={(e) => {
                    const next = [...guests];
                    next[i] = { ...next[i], paymentMethod: e.target.value };
                    setGuests(next);
                  }}
                  className="rounded bg-white/10 text-sm text-white border-0"
                >
                  <option value="cash">ნაღდი</option>
                  <option value="card">ბარათი</option>
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">ტიპი (ჩაი) ₾</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={tipValue}
          onChange={(e) => setTipValue(e.target.value)}
          placeholder="0"
          className="w-24 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
        />
      </div>

      {mode === 'amount' && (
        <div className="space-y-2">
          {guests.map((g, i) => (
            <div key={g.id} className="flex items-center gap-2">
              <input
                type="text"
                value={g.paidBy}
                onChange={(e) => {
                  const next = [...guests];
                  next[i] = { ...next[i], paidBy: e.target.value };
                  setGuests(next);
                }}
                className="w-28 rounded-lg bg-white/5 px-2 py-1.5 text-sm text-white"
                placeholder="სტუმარი"
              />
              <input
                type="number"
                step="0.01"
                value={g.amount}
                onChange={(e) => {
                  const next = [...guests];
                  next[i] = { ...next[i], amount: Number(e.target.value) || 0 };
                  setGuests(next);
                }}
                className="flex-1 rounded-lg bg-white/5 px-2 py-1.5 text-sm text-white"
              />
              <select
                value={g.paymentMethod}
                onChange={(e) => {
                  const next = [...guests];
                  next[i] = { ...next[i], paymentMethod: e.target.value };
                  setGuests(next);
                }}
                className="rounded bg-white/10 text-sm text-white border-0"
              >
                <option value="cash">ნაღდი</option>
                <option value="card">ბარათი</option>
              </select>
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">ჯამი: ₾{totalEntered.toFixed(2)}</span>
            <span className={isValid ? 'text-emerald-400' : 'text-red-400'}>
              უნდა იყოს ₾{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/20 py-2.5 text-slate-300 hover:bg-white/5"
        >
          გაუქმება
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isValid}
          className="flex-1 rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          გადახდის დადასტურება
        </button>
      </div>
    </div>
  );
}
