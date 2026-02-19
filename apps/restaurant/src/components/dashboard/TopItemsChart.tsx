'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function TopItemsChart({ data }: { data: Array<{ name: string; quantity: number; revenue: number }> }) {
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.name.length > 15 ? d.name.slice(0, 15) + '…' : d.name,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 90, right: 20 }}>
          <XAxis type="number" stroke="#64748b" />
          <YAxis type="category" dataKey="shortName" stroke="#64748b" width={90} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
            formatter={(value: number, _: unknown, props: { payload: { name: string; quantity: number; revenue: number } }) =>
              [value, props.payload.name]
            }
          />
          <Bar dataKey="quantity" fill="#10B981" radius={[0, 4, 4, 0]} name="რაოდენობა" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
