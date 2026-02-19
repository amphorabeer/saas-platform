'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function CategoryBarChart({ data }: { data: Array<{ categoryName: string; total: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="categoryName" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₾${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
            formatter={(value: number) => [`₾${value.toFixed(2)}`, 'გაყიდვები']}
          />
          <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
