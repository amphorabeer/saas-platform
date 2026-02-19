'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function SalesLineChart({ data }: { data: Array<{ date: string; totalSales: number }> }) {
  const chartData = data.map((d) => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₾${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`₾${value.toFixed(2)}`, 'გაყიდვები']}
            labelFormatter={(label) => label}
          />
          <Line type="monotone" dataKey="totalSales" stroke="#F97316" strokeWidth={2} dot={{ fill: '#F97316' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
