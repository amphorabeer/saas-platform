'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export function FoodCostChart({ items }: { items: Array<{ name: string; foodCostPercent: number }> }) {
  const data = items.slice(0, 10).map((i) => ({ name: i.name.length > 12 ? i.name.slice(0, 12) + '…' : i.name, pct: i.foodCostPercent }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
          <XAxis type="number" domain={[0, 50]} stroke="#64748b" />
          <YAxis type="category" dataKey="name" stroke="#64748b" width={80} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`${value}%`, 'Food Cost %']}
          />
          <Bar dataKey="pct" fill="#F97316" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={data[i].pct < 30 ? '#10B981' : data[i].pct <= 35 ? '#F59E0B' : '#EF4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
