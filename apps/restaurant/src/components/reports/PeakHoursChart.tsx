'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function PeakHoursChart({ data }: { data: Array<{ hour: number; total: number; orderCount: number }> }) {
  const chartData = data.map((d) => ({
    ...d,
    label: `${d.hour}:00`,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₾${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
            formatter={(value: number, name: string) => [name === 'total' ? `₾${value.toFixed(2)}` : value, name === 'total' ? 'გაყიდვები' : 'შეკვეთები']}
            labelFormatter={(_, payload) => payload[0]?.payload?.label ?? ''}
          />
          <Bar dataKey="total" fill="#F97316" radius={[4, 4, 0, 0]} name="total" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
